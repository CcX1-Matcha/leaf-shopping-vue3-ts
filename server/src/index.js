/**
 * 小兔鲜商城 · 本地后端服务
 * 零依赖（仅使用 Node.js 内置模块），直接运行：node src/index.js
 *
 * 默认端口 3000，可用环境变量 PORT 覆盖。
 * 数据持久化：data/db.json（首次启动自动生成，删除该文件即可重置演示数据）。
 *
 * 响应约定（与前端 src/utils/request.ts 保持一致）：
 *   成功 { code: '1', msg, message, result }
 *   失败 { code, msg, message, result: null }
 */
import http from 'node:http'
import v8 from 'node:v8'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

import { categories, cat1Map, cat2Map, goodsMap, findSku, getGoodsDetail, simpleGoods, listByCat2, topGoodsByCat, goods as goodsList } from './data/goods.js'
import { banners } from './data/banners.js'
import { provinceList, cityList, areaList, lookupLocation } from './data/district.js'
import { renderSvg } from './svg.js'
import { createStore } from './store/index.js'
import { buildOrder, fmtTime, parseTs } from './store/seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3000)

// ================= 存储层（DB_DRIVER=json 用 data/db.json，DB_DRIVER=mysql 用 MySQL） =================
const store = await createStore()
const storeInfo = await store.init()

// ================= 订单 =================
async function makeOrder(user, addressId, goodsList, opts = {}) {
  const address = await store.findAddress(user.id, addressId)
  if (!address) return { error: '收货地址不存在' }
  if (!goodsList || !goodsList.length) return { error: '请选择要结算的商品' }
  const seq = await store.nextOrderSeq()
  const id = String(Date.now()) + String(seq % 1000).padStart(3, '0')
  return buildOrder(id, address, goodsList, opts)
}

async function toOrderDetail(o) {
  const now = Date.now()
  // 待付款订单超时自动取消
  if (o.orderState === 1 && parseTs(o.payLatestTime) - now <= 0) {
    o.orderState = 6
    o.payState = 0
    o.closeTime = o.payLatestTime
    await store.updateOrder(o)
  }
  const countdown = o.orderState === 1 ? Math.max(0, Math.floor((parseTs(o.payLatestTime) - now) / 1000)) : -1
  return {
    id: o.id,
    createTime: o.createTime,
    closeTime: o.closeTime,
    countdown,
    deliveryTimeType: o.deliveryTimeType,
    payChannel: o.payChannel,
    payType: o.payType,
    payState: o.payState,
    orderState: o.orderState,
    payLatestTime: o.payLatestTime,
    payTime: o.payTime,
    endTime: o.endTime,
    consignTime: o.consignTime,
    evaluationTime: o.evaluationTime,
    postFee: o.postFee,
    payMoney: o.totalMoney,
    totalMoney: o.totalMoney,
    totalNum: o.totalNum,
    receiverAddress: o.address.receiverAddress,
    receiverContact: o.address.receiver,
    receiverMobile: o.address.contact,
    provinceCode: o.address.provinceCode,
    cityCode: o.address.cityCode,
    countyCode: o.address.countyCode,
    arrivalEstimatedTime: null,
    skus: o.skus
  }
}

// ================= 监控指标（Prometheus 文本格式，零依赖） =================
const metrics = {
  requests: new Map(),   // method|route|status -> 次数
  durations: new Map(),  // method|route -> { sum, count }
  startedAt: Date.now()
}

function recordRequest(route, method, status, seconds) {
  const rk = method + '|' + route + '|' + status
  metrics.requests.set(rk, (metrics.requests.get(rk) || 0) + 1)
  const dk = method + '|' + route
  const d = metrics.durations.get(dk) || { sum: 0, count: 0 }
  d.sum += seconds
  d.count += 1
  metrics.durations.set(dk, d)
}

const mLabel = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')

async function renderMetrics() {
  const out = []
  const header = (name, type, desc) => {
    out.push('# HELP ' + name + ' ' + desc)
    out.push('# TYPE ' + name + ' ' + type)
  }

  header('leaf_up', 'gauge', '服务是否存活（1=存活）')
  out.push('leaf_up 1')

  header('leaf_process_uptime_seconds', 'counter', '进程运行时长（秒）')
  out.push('leaf_process_uptime_seconds ' + ((Date.now() - metrics.startedAt) / 1000).toFixed(0))

  const mem = process.memoryUsage()
  header('leaf_process_memory_bytes', 'gauge', '进程内存占用（字节）')
  out.push('leaf_process_memory_bytes{type="rss"} ' + mem.rss)
  out.push('leaf_process_memory_bytes{type="heap_used"} ' + mem.heapUsed)
  out.push('leaf_process_memory_bytes{type="heap_total"} ' + mem.heapTotal)

  header('leaf_nodejs_heap_limit_bytes', 'gauge', 'V8 堆上限（字节）')
  out.push('leaf_nodejs_heap_limit_bytes ' + (v8.getHeapStatistics().heap_size_limit || 0))

  header('leaf_http_requests_total', 'counter', 'HTTP 请求总数')
  for (const [k, v] of metrics.requests) {
    const parts = k.split('|')
    out.push('leaf_http_requests_total{method="' + mLabel(parts[0]) + '",route="' + mLabel(parts[1]) + '",status="' + mLabel(parts[2]) + '"} ' + v)
  }

  header('leaf_http_request_duration_seconds_sum', 'counter', 'HTTP 请求耗时累计（秒）')
  for (const [k, d] of metrics.durations) {
    const parts = k.split('|')
    out.push('leaf_http_request_duration_seconds_sum{method="' + mLabel(parts[0]) + '",route="' + mLabel(parts[1]) + '"} ' + d.sum.toFixed(6))
  }
  header('leaf_http_request_duration_seconds_count', 'counter', 'HTTP 请求次数（用于算平均耗时）')
  for (const [k, d] of metrics.durations) {
    const parts = k.split('|')
    out.push('leaf_http_request_duration_seconds_count{method="' + mLabel(parts[0]) + '",route="' + mLabel(parts[1]) + '"} ' + d.count)
  }

  try {
    const s = await store.stats()
    header('leaf_users_total', 'gauge', '用户总数')
    out.push('leaf_users_total ' + s.users)
    header('leaf_addresses_total', 'gauge', '收货地址总数')
    out.push('leaf_addresses_total ' + s.addresses)
    header('leaf_cart_items_total', 'gauge', '购物车商品项总数')
    out.push('leaf_cart_items_total ' + s.carts)
    header('leaf_orders_total', 'gauge', '订单总数')
    out.push('leaf_orders_total ' + s.orders)
  } catch (e) {
    out.push('# 读取业务数据失败: ' + mLabel(e.message))
  }

  header('leaf_products_total', 'gauge', '商品总数')
  out.push('leaf_products_total ' + goodsList.length)

  return out.join('\n') + '\n'
}

// ================= HTTP 基础 =================
function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
  return proto + '://' + req.headers.host
}

// 将 /img/... 相对图片地址改写为绝对地址（前端通过 5173 访问，图片必须指回后端）
function absolutize(value, origin) {
  if (typeof value === 'string') return value.startsWith('/img/') ? origin + value : value
  if (Array.isArray(value)) return value.map((v) => absolutize(v, origin))
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = absolutize(value[k], origin)
    return out
  }
  return value
}

function send(res, status, body) {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  if (typeof body !== 'string') res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.writeHead(status)
  res.end(data)
}

function ok(req, res, result, msg = '操作成功') {
  send(res, 200, { code: '1', msg, message: msg, result: absolutize(result, originOf(req)) })
}

function fail(req, res, message, code = '500', status = 200) {
  send(res, status, { code, msg: message, message, result: null })
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      if (!raw) return resolve({})
      try { resolve(JSON.parse(raw)) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

async function requireUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  return store.findUserByToken(token)
}

function toCartItem(g, sku, count) {
  return {
    id: sku.id,
    skuId: sku.id,
    name: g.name,
    attrsText: sku.specs.map((s) => s.name + ':' + s.valueName).join(' '),
    specs: sku.specs,
    picture: g.picture,
    price: sku.oldPrice,
    nowPrice: sku.price,
    nowOriginalPrice: sku.oldPrice,
    selected: true,
    stock: sku.inventory,
    count,
    isEffective: sku.inventory > 0,
    discount: null,
    isCollect: false,
    postFee: 0
  }
}

// ================= 路由 =================
const routes = []
function addRoute(method, pattern, handler) {
  const keys = []
  const re = '^' + pattern.replace(/:[^/]+/g, (m) => {
    keys.push(m.slice(1))
    return '([^/]+)'
  }) + '/?$'
  routes.push({ method, pattern, re: new RegExp(re), keys, handler })
}

const LANDING_HTML = [
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<title>小兔鲜商城 · 本地后端</title>',
  '<style>',
  'body{font-family:"Microsoft YaHei",sans-serif;max-width:920px;margin:40px auto;padding:0 20px;color:#333}',
  'h1{color:#27ba9b}',
  'table{border-collapse:collapse;width:100%;margin:16px 0}',
  'th,td{border:1px solid #e0e0e0;padding:8px 12px;text-align:left;font-size:14px}',
  'th{background:#f0f9f4}',
  'code{background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:13px}',
  '.tip{background:#fff8e6;border:1px solid #f0d98c;padding:12px 16px;border-radius:6px;margin:16px 0}',
  '</style>',
  '</head>',
  '<body>',
  '<h1>🐰 小兔鲜商城 · 本地后端服务</h1>',
  '<div class="tip">',
  '<p>✅ 后端运行中。演示账号：<code>xiaotuxian001</code> / <code>123456</code>（任意账号 + 6 位以上密码可自动注册）</p>',
  '<p>📦 数据保存在 <code>server/data/db.json</code>，删除该文件即可重置演示数据。</p>',
  '<p>🖼 所有商品图 / 轮播图 / 详情图 / 头像均由本服务动态生成 SVG，离线可用。</p>',
  '</div>',
  '<h2>接口列表</h2>',
  '<table>',
  '<tr><th>模块</th><th>方法 &amp; 路径</th><th>说明</th></tr>',
  '<tr><td>首页</td><td>GET /home/category/head</td><td>分类导航（含推荐商品）</td></tr>',
  '<tr><td>首页</td><td>GET /home/banner?distributionSite=1</td><td>轮播图（1首页 / 2二级页）</td></tr>',
  '<tr><td>首页</td><td>GET /home/new · /home/hot · /home/goods</td><td>新鲜好物 / 人气推荐 / 商品楼层</td></tr>',
  '<tr><td>分类</td><td>GET /category?id=</td><td>分类页数据</td></tr>',
  '<tr><td>分类</td><td>GET /category/sub/filter?id=</td><td>子分类筛选条件</td></tr>',
  '<tr><td>分类</td><td>POST /category/goods/temporary</td><td>分类商品分页</td></tr>',
  '<tr><td>商品</td><td>GET /goods?id=</td><td>商品详情（SKU/规格）</td></tr>',
  '<tr><td>商品</td><td>GET /goods/hot · /goods/relevant</td><td>热销榜 / 猜你喜欢</td></tr>',
  '<tr><td>用户</td><td>POST /login</td><td>登录（支持自动注册）</td></tr>',
  '<tr><td>购物车</td><td>GET/POST/DELETE /member/cart</td><td>列表 / 加购 / 删除（需登录）</td></tr>',
  '<tr><td>购物车</td><td>PUT /member/cart/selected · /member/cart/:skuId</td><td>勾选 / 改数量（需登录）</td></tr>',
  '<tr><td>结算</td><td>GET /member/order/pre · POST /member/order</td><td>结算数据 / 提交订单（需登录）</td></tr>',
  '<tr><td>订单</td><td>GET /member/order · GET /member/order/:id</td><td>订单列表 / 详情（需登录）</td></tr>',
  '<tr><td>地址</td><td>GET/POST /member/address · PUT/DELETE /member/address/:id</td><td>收货地址管理（需登录）</td></tr>',
  '<tr><td>支付</td><td>GET /pay/aliPay?orderId=&amp;redirect=</td><td>模拟支付宝支付并跳回结果页</td></tr>',
  '<tr><td>省市区</td><td>GET /district/provinces · /district/city · /district/area</td><td>地址选择器数据</td></tr>',
  '<tr><td>图片</td><td>GET /img/...</td><td>动态 SVG 图片服务</td></tr>',
  '</table>',
  '<p style="color:#999">前端通过 .env 中的 VITE_API_BASE 访问本服务，接口字段与原黑马接口保持一致。</p>',
  '</body>',
  '</html>'
].join('\n')

// ---------- 根页面 ----------
addRoute('GET', '/', (req, res) => {
  if (tryStatic(res, '/')) return
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.writeHead(200)
  res.end(LANDING_HTML)
})

addRoute('GET', '/favicon.ico', (req, res) => {
  if (tryStatic(res, '/favicon.ico')) return
  res.writeHead(204)
  res.end()
})

// ---------- 图片服务 ----------
// 商品图优先使用 public/images 下抓取到的真实商品图（淘宝/天猫/1688 等来源），
// 找不到时回退为动态生成的 SVG 占位图。
const LOCAL_IMG_ROOT = path.join(__dirname, '..', 'public', 'images')
const IMG_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

function findLocalImage() {
  const base = path.join(LOCAL_IMG_ROOT, ...arguments)
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = base + '.' + ext
    if (fs.existsSync(file)) return { file, ext }
  }
  return null
}

// ---------- 前端静态页面（单容器部署时由后端一并提供，不再需要 nginx） ----------
// 目录可用环境变量 STATIC_DIR 指定，默认 ./web（Docker 里的 /app/web）
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'web')
const STATIC_INDEX = path.join(STATIC_DIR, 'index.html')
const HAS_STATIC = fs.existsSync(STATIC_INDEX)
const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

function tryStatic(res, pathname) {
  if (!HAS_STATIC) return false
  let file = path.normalize(path.join(STATIC_DIR, pathname))
  if (!file.startsWith(STATIC_DIR)) return false // 防目录穿越
  let isIndex = false
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = STATIC_INDEX // 单页应用：找不到的路径回退 index.html
    isIndex = true
  }
  const ext = path.extname(file).toLowerCase()
  res.setHeader('Content-Type', STATIC_MIME[ext] || 'application/octet-stream')
  if (isIndex) res.setHeader('Cache-Control', 'no-cache')
  else if (pathname.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.writeHead(200)
  res.end(fs.readFileSync(file))
  return true
}

function sendImageFile(res, found) {
  res.setHeader('Content-Type', IMG_MIME[found.ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.writeHead(200)
  res.end(fs.readFileSync(found.file))
}
addRoute('GET', '/img/:kind/:file', (req, res, params, url) => {
  const kind = params.kind
  const name = params.file.replace(/\.(svg|jpe?g|png|webp)$/i, '')
  const variant = Number(url.searchParams.get('t')) || 0
  let svg = ''
  if (kind === 'goods') {
    // ?t=0..3 对应第 1..4 张商品图（封面 + 详情图）
    const instance = variant + 1
    const local = findLocalImage('goods', name + '-' + instance) || (instance === 1 ? findLocalImage('goods', name) : null)
    if (local) return sendImageFile(res, local)
    const g = goodsMap.get(name)
    svg = renderSvg({ w: 400, h: 400, seed: 'goods-' + name, label: g ? g.name : name, sub: g ? '¥ ' + g.price : '', variant })
  } else if (kind === 'banner') {
    const texts = [['新鲜好物', '每日上新 · 品质优选'], ['限时秒杀', '爆款直降 · 手慢无'], ['大牌直降', '数码狂欢 · 直降千元'], ['秋季上新', '服饰焕新 · 7折起']]
    const t = texts[(Number(name) - 1) % texts.length] || texts[0]
    svg = renderSvg({ w: 1240, h: 500, seed: 'banner-' + name, label: '小兔鲜 · ' + t[0], sub: t[1] })
  } else if (kind === 'cat') {
    const local = findLocalImage('cat', name)
    if (local) return sendImageFile(res, local)
    const rep = topGoodsByCat(name, 1)[0]
    const repLocal = rep ? findLocalImage('goods', rep.id + '-1') : null
    if (repLocal) return sendImageFile(res, repLocal)
    const c = cat1Map.get(name) || cat2Map.get(name)
    svg = renderSvg({ w: 240, h: 240, seed: 'cat-' + name, label: c ? c.name : name })
  } else if (kind === 'avatar') {
    svg = renderSvg({ w: 200, h: 200, seed: 'avatar-' + name, label: (name || '?').slice(0, 1), circle: true })
  } else if (kind === 'brand') {
    const g = goodsMap.get(name)
    svg = renderSvg({ w: 240, h: 240, seed: 'brand-' + name, label: g ? g.brand.name : name })
  } else if (kind === 'color') {
    svg = renderSvg({ w: 60, h: 60, color: '#' + name })
  } else if (kind === 'detail') {
    const parts = name.split('-')
    const n = Number(parts[1]) || 1
    const local = findLocalImage('goods', parts[0] + '-' + (n + 1))
    if (local) return sendImageFile(res, local)
    const g = goodsMap.get(parts[0])
    svg = renderSvg({ w: 750, h: 500, seed: 'detail-' + name, label: g ? g.name : parts[0], sub: '商品详情图 ' + parts[1] + ' · 图片仅供参考' })
  }
  if (!svg) return fail(req, res, '图片不存在', '404', 404)
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.writeHead(200)
  res.end(svg)
})

// ---------- 监控指标（Prometheus 抓取用） ----------
addRoute('GET', '/metrics', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  res.writeHead(200)
  res.end(await renderMetrics())
})

// ---------- 登录 ----------
addRoute('POST', '/login', async (req, res) => {
  const body = await readBody(req)
  const account = String(body.account || '').trim()
  const password = String(body.password || '')
  if (!account || !password) return fail(req, res, '请输入账号和密码', '500')
  let user = await store.findUserByAccount(account)
  if (user) {
    if (user.password !== password) return fail(req, res, '账号或密码错误', '501')
  } else {
    // 自动注册
    const seq = await store.nextUserSeq()
    user = {
      id: 'u' + seq,
      account,
      password,
      nickname: account,
      avatar: '/img/avatar/' + account.slice(0, 1) + '.svg',
      gender: '保密',
      mobile: '',
      token: ''
    }
    await store.createUser(user)
  }
  if (!user.token) {
    user.token = crypto.randomUUID()
    await store.updateUserToken(user.id, user.token)
  }
  ok(req, res, {
    id: user.id,
    account: user.account,
    nickname: user.nickname,
    avatar: user.avatar,
    mobile: user.mobile,
    gender: user.gender,
    token: user.token
  })
})

// ---------- 首页 ----------
addRoute('GET', '/home/category/head', (req, res) => {
  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: '/img/cat/' + c.id + '.svg',
    picture: '/img/cat/' + c.id + '.svg',
    children: c.children.map((ch) => ({
      id: ch.id,
      name: ch.name,
      picture: '/img/cat/' + ch.id + '.svg',
      goods: listByCat2(ch.id).slice(0, 4).map(simpleGoods)
    })),
    goods: topGoodsByCat(c.id, 6).map(simpleGoods)
  }))
  ok(req, res, result)
})

addRoute('GET', '/home/banner', (req, res, params, url) => {
  const site = url.searchParams.get('distributionSite') || '1'
  ok(req, res, banners[site] || banners['1'])
})

addRoute('GET', '/home/new', (req, res) => {
  const list = [...goodsList].reverse().slice(0, 4).map((g) => ({
    id: g.id, name: g.name, desc: g.desc, picture: g.picture, orderNum: g.sales, price: g.price
  }))
  ok(req, res, list)
})

addRoute('GET', '/home/hot', (req, res) => {
  const list = [...goodsList].sort((a, b) => b.sales - a.sales).slice(0, 4).map((g) => ({
    id: g.id, picture: g.picture, title: g.name, alt: g.desc
  }))
  ok(req, res, list)
})

addRoute('GET', '/home/goods', (req, res) => {
  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    picture: '/img/cat/' + c.id + '.svg',
    saleInfo: c.saleInfo,
    children: c.children.map((ch) => ({ id: ch.id, name: ch.name, layer: 2, parent: null })),
    goods: topGoodsByCat(c.id, 8).map(simpleGoods)
  }))
  ok(req, res, result)
})

// ---------- 分类 ----------
addRoute('GET', '/category', (req, res, params, url) => {
  const id = url.searchParams.get('id')
  if (!id) return fail(req, res, '缺少分类id', '500')
  const c1 = cat1Map.get(id)
  if (c1) {
    const result = {
      id: c1.id,
      name: c1.name,
      picture: '/img/cat/' + c1.id + '.svg',
      children: c1.children.map((ch) => ({
        id: ch.id,
        name: ch.name,
        picture: '/img/cat/' + ch.id + '.svg',
        parentId: c1.id,
        parentName: c1.name,
        goods: listByCat2(ch.id).slice(0, 8).map(simpleGoods),
        categories: null,
        brands: null,
        saleProperties: null
      }))
    }
    return ok(req, res, result)
  }
  const c2 = cat2Map.get(id)
  if (c2) {
    const parent = c2.parent
    const result = {
      id: c2.id,
      name: c2.name,
      picture: '/img/cat/' + c2.id + '.svg',
      children: parent.children.map((ch) => ({
        id: ch.id,
        name: ch.name,
        picture: '/img/cat/' + ch.id + '.svg',
        parentId: parent.id,
        parentName: parent.name,
        goods: listByCat2(ch.id).slice(0, 8).map(simpleGoods),
        categories: null,
        brands: null,
        saleProperties: null
      }))
    }
    return ok(req, res, result)
  }
  fail(req, res, '分类不存在', '500')
})

addRoute('GET', '/category/sub/filter', (req, res, params, url) => {
  const id = url.searchParams.get('id')
  const c2 = id ? cat2Map.get(id) : null
  if (!c2) return fail(req, res, '分类不存在', '500')
  const parent = c2.parent
  const list = listByCat2(c2.id)
  const sample = list[0] || goodsList[0]
  const brandSet = new Map()
  for (const g of list) brandSet.set(g.brand.name, g.brand)
  const brands = [...brandSet.values()].map((b) => ({
    id: b.id, name: b.name, nameEn: b.nameEn, logo: b.logo, picture: b.picture, type: null, desc: '', place: b.place
  }))
  const saleProperties = (sample ? sample.specs : []).map((s) => ({
    id: s.id,
    name: s.name,
    properties: s.values.map((v) => ({ id: s.id + '-' + v.name, name: v.name }))
  }))
  ok(req, res, {
    id: c2.id,
    name: c2.name,
    picture: '/img/cat/' + c2.id + '.svg',
    parentId: parent.id,
    parentName: parent.name,
    goods: list.map(simpleGoods),
    categories: [],
    brands,
    saleProperties
  })
})

addRoute('POST', '/category/goods/temporary', async (req, res) => {
  const body = await readBody(req)
  const c2 = cat2Map.get(body.categoryId)
  if (!c2) return fail(req, res, '分类不存在', '500')
  const page = Math.max(1, Number(body.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(body.pageSize) || 20))
  let list = listByCat2(c2.id)
  const sort = body.sort || 'publishTime'
  if (sort === 'orderNum') list = [...list].sort((a, b) => b.sales - a.sales)
  else if (sort === 'evaluateNum') list = [...list].sort((a, b) => b.comments - a.comments)
  else list = [...list].reverse()
  const counts = list.length
  const pages = Math.max(1, Math.ceil(counts / pageSize))
  const items = list.slice((page - 1) * pageSize, page * pageSize).map(simpleGoods)
  ok(req, res, { counts, pageSize, pages, page, items })
})

// ---------- 商品 ----------
addRoute('GET', '/goods', (req, res, params, url) => {
  const id = url.searchParams.get('id')
  const g = goodsMap.get(id)
  if (!g) return fail(req, res, '商品不存在', '500')
  ok(req, res, getGoodsDetail(g))
})

addRoute('GET', '/goods/hot', (req, res, params, url) => {
  const id = url.searchParams.get('id')
  const type = url.searchParams.get('type') || '1'
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit')) || 3))
  const list = [...goodsList].filter((g) => g.id !== id)
  if (type === '1') list.sort((a, b) => b.sales - a.sales)
  else list.sort((a, b) => (b.sales * 0.6 + b.comments * 0.4) - (a.sales * 0.6 + a.comments * 0.4))
  ok(req, res, list.slice(0, limit).map(simpleGoods))
})

addRoute('GET', '/goods/relevant', (req, res, params, url) => {
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit')) || 4))
  ok(req, res, [...goodsList].sort((a, b) => b.sales - a.sales).slice(0, limit).map(simpleGoods))
})

// ---------- 购物车 ----------
addRoute('GET', '/member/cart', async (req, res) => {
  const user = await requireUser(req)
  // 未登录时返回空购物车，避免顶部购物车组件在游客页面报错
  if (!user) return ok(req, res, [])
  ok(req, res, await store.listCart(user.id))
})

addRoute('POST', '/member/cart', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const found = findSku(body.skuId)
  if (!found) return fail(req, res, '商品不存在', '500')
  const count = Math.max(1, Number(body.count) || 1)
  const exist = await store.findCartItem(user.id, found.sku.id)
  let item
  if (exist) {
    item = await store.updateCartItemCount(user.id, found.sku.id, Math.min(100, exist.count + count))
  } else {
    item = toCartItem(found.goods, found.sku, count)
    await store.insertCartItem(user.id, item)
  }
  ok(req, res, item)
})

addRoute('DELETE', '/member/cart', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const ids = Array.isArray(body.ids) ? body.ids : []
  await store.deleteCartItems(user.id, ids)
  ok(req, res, null)
})

addRoute('PUT', '/member/cart/selected', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const ids = Array.isArray(body.ids) ? body.ids : []
  await store.updateCartSelected(user.id, ids, !!body.selected)
  ok(req, res, null)
})

addRoute('PUT', '/member/cart/:id', async (req, res, params) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const exist = await store.findCartItem(user.id, params.id)
  if (!exist) return fail(req, res, '购物车中不存在该商品', '500')
  const item = await store.updateCartItemCount(user.id, params.id, Math.min(100, Math.max(1, Number(body.count) || 1)))
  ok(req, res, item)
})

// ---------- 结算 / 订单 ----------
addRoute('GET', '/member/order/pre', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const cart = (await store.listCart(user.id)).filter((i) => i.selected)
  const goods = cart.map((i) => ({
    id: i.skuId,
    name: i.name,
    picture: i.picture,
    count: i.count,
    skuId: i.skuId,
    attrsText: i.attrsText,
    price: i.price,
    payPrice: i.nowPrice,
    totalPrice: (Number(i.price) * i.count).toFixed(2),
    totalPayPrice: (Number(i.nowPrice) * i.count).toFixed(2)
  }))
  const summary = {
    goodsCount: goods.reduce((a, g) => a + g.count, 0),
    totalPrice: Number(goods.reduce((a, g) => a + Number(g.totalPrice), 0).toFixed(2)),
    totalPayPrice: Number(goods.reduce((a, g) => a + Number(g.totalPayPrice), 0).toFixed(2)),
    postFee: 6,
    discountPrice: 0
  }
  ok(req, res, { userAddresses: await store.listAddresses(user.id), goods, summary })
})

addRoute('POST', '/member/order', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const { order, error } = await makeOrder(user, body.addressId, body.goods, body)
  if (error) return fail(req, res, error, '500')
  await store.insertOrder(user.id, order)
  const ids = (body.goods || []).map((g) => g.skuId)
  await store.deleteCartItems(user.id, ids)
  ok(req, res, { id: order.id })
})

addRoute('GET', '/member/order', async (req, res, params, url) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const state = Number(url.searchParams.get('orderState')) || 0
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(20, Math.max(1, Number(url.searchParams.get('pageSize')) || 2))
  const { counts, items: raw } = await store.listOrders(user.id, { state, page, pageSize })
  const pages = Math.max(1, Math.ceil(counts / pageSize))
  const items = []
  for (const o of raw) items.push(await toOrderDetail(o))
  ok(req, res, { counts, pageSize, pages, page, items })
})

addRoute('GET', '/member/order/:id', async (req, res, params) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const order = await store.findOrder(user.id, params.id)
  if (!order) return fail(req, res, '订单不存在', '500')
  ok(req, res, await toOrderDetail(order))
})

// ---------- 收货地址 ----------
addRoute('GET', '/member/address', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  ok(req, res, await store.listAddresses(user.id))
})

addRoute('POST', '/member/address', async (req, res) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const item = {
    id: 'a' + Date.now(),
    receiver: body.receiver || '',
    contact: body.contact || '',
    provinceCode: body.provinceCode || '',
    cityCode: body.cityCode || '',
    countyCode: body.countyCode || '',
    address: body.address || '',
    isDefault: body.isDefault === 0 ? 0 : 1,
    fullLocation: body.fullLocation || lookupLocation(body.provinceCode, body.cityCode, body.countyCode),
    postalCode: body.postalCode || null,
    addressTags: body.addressTags || null
  }
  await store.insertAddress(user.id, item)
  if (item.isDefault === 0) await store.setDefaultAddress(user.id, item.id)
  ok(req, res, item)
})

addRoute('PUT', '/member/address/:id', async (req, res, params) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const item = await store.findAddress(user.id, params.id)
  if (!item) return fail(req, res, '地址不存在', '500')
  const updated = await store.updateAddress(user.id, params.id, {
    receiver: body.receiver ?? item.receiver,
    contact: body.contact ?? item.contact,
    provinceCode: body.provinceCode ?? item.provinceCode,
    cityCode: body.cityCode ?? item.cityCode,
    countyCode: body.countyCode ?? item.countyCode,
    address: body.address ?? item.address,
    isDefault: body.isDefault === 0 ? 0 : 1,
    fullLocation: body.fullLocation || lookupLocation(body.provinceCode ?? item.provinceCode, body.cityCode ?? item.cityCode, body.countyCode ?? item.countyCode),
    postalCode: body.postalCode ?? item.postalCode,
    addressTags: body.addressTags ?? item.addressTags
  })
  if (updated.isDefault === 0) await store.setDefaultAddress(user.id, params.id)
  ok(req, res, updated)
})

addRoute('DELETE', '/member/address/:id', async (req, res, params) => {
  const user = await requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  await store.deleteAddress(user.id, params.id)
  ok(req, res, null)
})

// ---------- 支付（模拟支付宝） ----------
addRoute('GET', '/pay/aliPay', async (req, res, params, url) => {
  const orderId = url.searchParams.get('orderId')
  const redirect = url.searchParams.get('redirect')
  let paid = false
  const order = orderId ? await store.findOrderAnyUser(orderId) : null
  if (order) {
    if (order.orderState === 1) {
      order.orderState = 2
      order.payState = 1
      order.payTime = fmtTime(Date.now())
      await store.updateOrder(order)
    }
    paid = true
  }
  const target = redirect ? decodeURIComponent(redirect) : null
  const query = 'orderId=' + encodeURIComponent(orderId || '') + '&payResult=' + (paid ? 'true' : 'false')
  if (target) {
    res.writeHead(302, { Location: target + (target.includes('?') ? '&' : '?') + query })
    res.end()
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<!doctype html><meta charset="utf-8"><h2>模拟支付宝支付</h2><p>订单 ' + orderId + (paid ? ' 支付成功' : ' 不存在') + '</p>')
  }
})

// ---------- 省市区 ----------
addRoute('GET', '/district/provinces', (req, res) => {
  send(res, 200, { list: provinceList })
})

addRoute('GET', '/district/city', (req, res, params, url) => {
  const proId = url.searchParams.get('proId')
  send(res, 200, { list: cityList.filter((c) => c.proId === proId) })
})

addRoute('GET', '/district/area', (req, res, params, url) => {
  const cityId = url.searchParams.get('cityId')
  send(res, 200, { list: areaList.filter((a) => a.cityId === cityId) })
})

// ================= 启动 =================

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let url
  try {
    url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'))
  } catch {
    url = new URL('http://localhost/')
  }
  let pathname = url.pathname
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    /* 忽略解码错误 */
  }
  const method = (req.method || 'GET').toUpperCase()
  const startedAt = process.hrtime.bigint()
  let metricRoute = 'unmatched'
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9
    recordRequest(metricRoute, method, res.statusCode, seconds)
  })

  const route = routes.find((r) => r.method === method && r.re.test(pathname))
  if (!route) {
    if ((method === 'GET' || method === 'HEAD') && tryStatic(res, pathname)) {
      console.log('[' + new Date().toLocaleTimeString() + '] ' + method + ' ' + pathname + ' -> 200 (静态页面)')
      return
    }
    fail(req, res, '接口不存在: ' + method + ' ' + pathname, '404', 404)
    console.log('[' + new Date().toLocaleTimeString() + '] ' + method + ' ' + pathname + ' -> 404')
    return
  }
  metricRoute = route.pattern
  const params = {}
  const m = pathname.match(route.re)
  route.keys.forEach((k, i) => {
    params[k] = m[i + 1]
  })
  try {
    await route.handler(req, res, params, url)
  } catch (e) {
    console.error('[server] 处理出错', method, pathname, e)
    try {
      fail(req, res, '服务器内部错误', '500', 500)
    } catch {
      /* 响应可能已发出 */
    }
  }
  console.log('[' + new Date().toLocaleTimeString() + '] ' + method + ' ' + pathname + ' -> ' + res.statusCode)
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用，请修改 PORT 环境变量后重试，例如: PORT=3001 node src/index.js')
    process.exit(1)
  }
  console.error(e)
  process.exit(1)
})

process.on('SIGINT', () => {
  store.close().finally(() => process.exit(0))
})

server.listen(PORT, () => {
  console.log('==================================================')
  console.log(' 小兔鲜商城本地后端已启动')
  console.log(' 接口地址: http://localhost:' + PORT)
  console.log(' 接口一览: http://localhost:' + PORT + '/')
  console.log(' 演示账号: xiaotuxian001 / 123456')
  console.log(' 数据存储: ' + (store.driver === 'mysql'
    ? 'MySQL ' + storeInfo.host + ':' + storeInfo.port + '/' + storeInfo.database
    : 'JSON 文件 ' + storeInfo.file))
  console.log(' 前端页面: ' + (HAS_STATIC ? STATIC_DIR : '未提供（仅接口，访问 / 看接口一览）'))
  console.log('==================================================')
})
