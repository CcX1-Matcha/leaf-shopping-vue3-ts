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
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

import { categories, cat1Map, cat2Map, goodsMap, findSku, getGoodsDetail, simpleGoods, listByCat2, topGoodsByCat, goods as goodsList } from './data/goods.js'
import { banners } from './data/banners.js'
import { provinceList, cityList, areaList, lookupLocation } from './data/district.js'
import { renderSvg } from './svg.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const PORT = Number(process.env.PORT || 3000)

// ================= 通用工具 =================
const pad = (n) => String(n).padStart(2, '0')
const fmtTime = (ts) => {
  const d = new Date(ts)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}
const parseTs = (s) => new Date(String(s).replace(' ', 'T')).getTime()

let db = null

function saveDb() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (e) {
    console.warn('[db] 写入失败，本次运行将以内存模式继续:', e.message)
  }
}

// ================= 订单 =================
function makeOrder(d, userId, addressId, goodsList, opts = {}) {
  const address = (d.addresses[userId] || []).find((a) => a.id === addressId)
  if (!address) return { error: '收货地址不存在' }
  if (!goodsList || !goodsList.length) return { error: '请选择要结算的商品' }
  const now = Date.now()
  const skus = []
  let totalMoney = 0
  let totalNum = 0
  for (const item of goodsList) {
    const found = findSku(item.skuId)
    if (!found) return { error: '商品 ' + item.skuId + ' 不存在或已下架' }
    const { goods: g, sku } = found
    const quantity = Math.min(99, Math.max(1, Number(item.count) || 1))
    const realPay = Number((Number(sku.price) * quantity).toFixed(2))
    totalMoney += realPay
    totalNum += quantity
    skus.push({
      id: sku.id,
      name: g.name,
      image: g.picture,
      attrsText: sku.specs.map((s) => s.name + ':' + s.valueName).join(' '),
      properties: sku.specs.map((s) => ({ propertyMainName: s.name, propertyValueName: s.valueName })),
      quantity,
      curPrice: Number(sku.oldPrice),
      realPay,
      spuId: g.id
    })
  }
  const postFee = 6
  totalMoney = Number((totalMoney + postFee).toFixed(2))
  d.seq.order += 1
  const id = String(now) + String(d.seq.order % 1000).padStart(3, '0')
  const order = {
    id,
    createTime: fmtTime(now),
    closeTime: fmtTime(now + 30 * 60 * 1000),
    payLatestTime: fmtTime(now + 30 * 60 * 1000),
    payTime: null,
    endTime: null,
    consignTime: null,
    evaluationTime: null,
    orderState: 1,
    payState: 0,
    payType: opts.payType ?? 1,
    payChannel: opts.payChannel ?? 1,
    deliveryTimeType: opts.deliveryTimeType ?? 1,
    buyerMessage: opts.buyerMessage || '',
    address: {
      receiver: address.receiver,
      contact: address.contact,
      fullLocation: address.fullLocation,
      receiverAddress: address.address,
      provinceCode: address.provinceCode,
      cityCode: address.cityCode,
      countyCode: address.countyCode
    },
    postFee,
    totalMoney,
    totalNum,
    skus
  }
  return { order }
}

function toOrderDetail(o) {
  const now = Date.now()
  // 待付款订单超时自动取消
  if (o.orderState === 1 && parseTs(o.payLatestTime) - now <= 0) {
    o.orderState = 6
    o.payState = 0
    o.closeTime = o.payLatestTime
    saveDb()
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

// ================= 演示数据 =================
function seedDb() {
  const d = { seq: { order: 0, address: 0, user: 1000 }, users: [], carts: {}, addresses: {}, orders: {} }
  const u1 = {
    id: 'u1',
    account: 'xiaotuxian001',
    password: '123456',
    nickname: '小兔鲜儿',
    avatar: '/img/avatar/兔.svg',
    gender: '男',
    mobile: '13800138000',
    token: ''
  }
  d.users.push(u1)
  d.addresses.u1 = [
    { id: 'a1', receiver: '张三', contact: '13800138000', provinceCode: '440000', cityCode: '440100', countyCode: '440106', address: '天河区体育西路123号6栋601室', isDefault: 0, fullLocation: '广东省 广州市 天河区', postalCode: null, addressTags: null },
    { id: 'a2', receiver: '李四', contact: '13900139000', provinceCode: '330000', cityCode: '330100', countyCode: '330106', address: '西湖区文三路100号3单元202室', isDefault: 1, fullLocation: '浙江省 杭州市 西湖区', postalCode: null, addressTags: null }
  ]
  d.carts.u1 = []

  const now = Date.now()
  const H = 3600 * 1000
  const D = 24 * H

  // 待付款
  const { order: o1 } = makeOrder(d, 'u1', 'a1', [
    { skuId: 'g2001-sku1', count: 2 },
    { skuId: 'g2002-sku1', count: 1 }
  ])
  o1.createTime = fmtTime(now - 2 * 60 * 1000)

  // 待发货
  const { order: o2 } = makeOrder(d, 'u1', 'a2', [{ skuId: 'g3001-sku2', count: 2 }], { buyerMessage: '请发顺丰快递' })
  o2.orderState = 2
  o2.payState = 1
  o2.createTime = fmtTime(now - 1 * D)
  o2.payTime = fmtTime(now - 1 * D + 5 * 60 * 1000)
  o2.payLatestTime = fmtTime(now - 1 * D + 30 * 60 * 1000)
  o2.closeTime = null
  o2.consignTime = fmtTime(now - 12 * H)

  // 待收货
  const { order: o3 } = makeOrder(d, 'u1', 'a1', [{ skuId: 'g5001-sku2', count: 1 }])
  o3.orderState = 3
  o3.payState = 1
  o3.createTime = fmtTime(now - 2 * D)
  o3.payTime = fmtTime(now - 2 * D + 10 * 60 * 1000)
  o3.payLatestTime = fmtTime(now - 2 * D + 30 * 60 * 1000)
  o3.closeTime = null
  o3.consignTime = fmtTime(now - 1 * D - 12 * H)

  // 已完成
  const { order: o4 } = makeOrder(d, 'u1', 'a2', [
    { skuId: 'g6001-sku3', count: 1 },
    { skuId: 'g1007-sku1', count: 2 }
  ])
  o4.orderState = 5
  o4.payState = 1
  o4.createTime = fmtTime(now - 5 * D)
  o4.payTime = fmtTime(now - 5 * D + 8 * 60 * 1000)
  o4.payLatestTime = fmtTime(now - 5 * D + 30 * 60 * 1000)
  o4.closeTime = null
  o4.consignTime = fmtTime(now - 4 * D - 12 * H)
  o4.endTime = fmtTime(now - 3 * D)
  o4.evaluationTime = fmtTime(now - 3 * D + 2 * H)

  // 已取消
  const { order: o5 } = makeOrder(d, 'u1', 'a1', [{ skuId: 'g3004-sku1', count: 1 }])
  o5.orderState = 6
  o5.payState = 0
  o5.createTime = fmtTime(now - 1 * D)
  o5.closeTime = fmtTime(now - 1 * D + 30 * 60 * 1000)
  o5.payLatestTime = o5.closeTime

  d.orders.u1 = [o1, o5, o2, o3, o4]
  return d
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (e) {
      console.warn('[db] 数据文件解析失败，将重新初始化:', e.message)
      db = null
    }
  }
  if (!db) {
    db = seedDb()
    saveDb()
  }
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

function requireUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  return db.users.find((u) => u.token === token) || null
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
  routes.push({ method, re: new RegExp(re), keys, handler })
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
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.writeHead(200)
  res.end(LANDING_HTML)
})

addRoute('GET', '/favicon.ico', (req, res) => {
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

// ---------- 登录 ----------
addRoute('POST', '/login', async (req, res) => {
  const body = await readBody(req)
  const account = String(body.account || '').trim()
  const password = String(body.password || '')
  if (!account || !password) return fail(req, res, '请输入账号和密码', '500')
  let user = db.users.find((u) => u.account === account)
  if (user) {
    if (user.password !== password) return fail(req, res, '账号或密码错误', '501')
  } else {
    // 自动注册
    db.seq.user += 1
    user = {
      id: 'u' + db.seq.user,
      account,
      password,
      nickname: account,
      avatar: '/img/avatar/' + account.slice(0, 1) + '.svg',
      gender: '保密',
      mobile: '',
      token: ''
    }
    db.users.push(user)
    db.carts[user.id] = []
    db.addresses[user.id] = []
    db.orders[user.id] = []
  }
  if (!user.token) {
    user.token = crypto.randomUUID()
    saveDb()
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
addRoute('GET', '/member/cart', (req, res) => {
  const user = requireUser(req)
  // 未登录时返回空购物车，避免顶部购物车组件在游客页面报错
  if (!user) return ok(req, res, [])
  ok(req, res, db.carts[user.id] || [])
})

addRoute('POST', '/member/cart', async (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const found = findSku(body.skuId)
  if (!found) return fail(req, res, '商品不存在', '500')
  const cart = (db.carts[user.id] = db.carts[user.id] || [])
  const count = Math.max(1, Number(body.count) || 1)
  const exist = cart.find((i) => i.skuId === found.sku.id)
  let item
  if (exist) {
    exist.count = Math.min(100, exist.count + count)
    item = exist
  } else {
    item = toCartItem(found.goods, found.sku, count)
    cart.push(item)
  }
  saveDb()
  ok(req, res, item)
})

addRoute('DELETE', '/member/cart', async (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const ids = Array.isArray(body.ids) ? body.ids : []
  db.carts[user.id] = (db.carts[user.id] || []).filter((i) => !ids.includes(i.skuId))
  saveDb()
  ok(req, res, null)
})

addRoute('PUT', '/member/cart/selected', async (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const ids = Array.isArray(body.ids) ? body.ids : []
  for (const i of db.carts[user.id] || []) {
    if (ids.includes(i.skuId)) i.selected = !!body.selected
  }
  saveDb()
  ok(req, res, null)
})

addRoute('PUT', '/member/cart/:id', async (req, res, params) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const item = (db.carts[user.id] || []).find((i) => i.skuId === params.id)
  if (!item) return fail(req, res, '购物车中不存在该商品', '500')
  item.count = Math.min(100, Math.max(1, Number(body.count) || 1))
  saveDb()
  ok(req, res, item)
})

// ---------- 结算 / 订单 ----------
addRoute('GET', '/member/order/pre', (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const cart = (db.carts[user.id] || []).filter((i) => i.selected)
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
  ok(req, res, { userAddresses: db.addresses[user.id] || [], goods, summary })
})

addRoute('POST', '/member/order', async (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const { order, error } = makeOrder(db, user.id, body.addressId, body.goods, body)
  if (error) return fail(req, res, error, '500')
  db.orders[user.id] = db.orders[user.id] || []
  db.orders[user.id].unshift(order)
  const ids = (body.goods || []).map((g) => g.skuId)
  db.carts[user.id] = (db.carts[user.id] || []).filter((i) => !ids.includes(i.skuId))
  saveDb()
  ok(req, res, { id: order.id })
})

addRoute('GET', '/member/order', (req, res, params, url) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const state = Number(url.searchParams.get('orderState')) || 0
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(20, Math.max(1, Number(url.searchParams.get('pageSize')) || 2))
  let list = db.orders[user.id] || []
  if (state) list = list.filter((o) => o.orderState === state)
  list = [...list].sort((a, b) => parseTs(b.createTime) - parseTs(a.createTime))
  const counts = list.length
  const pages = Math.max(1, Math.ceil(counts / pageSize))
  const items = list.slice((page - 1) * pageSize, page * pageSize).map((o) => toOrderDetail(o))
  ok(req, res, { counts, pageSize, pages, page, items })
})

addRoute('GET', '/member/order/:id', (req, res, params) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const order = (db.orders[user.id] || []).find((o) => o.id === params.id)
  if (!order) return fail(req, res, '订单不存在', '500')
  ok(req, res, toOrderDetail(order))
})

// ---------- 收货地址 ----------
addRoute('GET', '/member/address', (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const list = db.addresses[user.id] || []
  ok(req, res, [...list].sort((a, b) => a.isDefault - b.isDefault))
})

addRoute('POST', '/member/address', async (req, res) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const list = (db.addresses[user.id] = db.addresses[user.id] || [])
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
  if (item.isDefault === 0) for (const a of list) a.isDefault = 1
  list.push(item)
  saveDb()
  ok(req, res, item)
})

addRoute('PUT', '/member/address/:id', async (req, res, params) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const body = await readBody(req)
  const list = db.addresses[user.id] || []
  const item = list.find((a) => a.id === params.id)
  if (!item) return fail(req, res, '地址不存在', '500')
  Object.assign(item, {
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
  if (item.isDefault === 0) for (const a of list) if (a.id !== item.id) a.isDefault = 1
  saveDb()
  ok(req, res, item)
})

addRoute('DELETE', '/member/address/:id', (req, res, params) => {
  const user = requireUser(req)
  if (!user) return fail(req, res, '请先登录', '401', 401)
  const list = db.addresses[user.id] || []
  db.addresses[user.id] = list.filter((a) => a.id !== params.id)
  saveDb()
  ok(req, res, null)
})

// ---------- 支付（模拟支付宝） ----------
addRoute('GET', '/pay/aliPay', (req, res, params, url) => {
  const orderId = url.searchParams.get('orderId')
  const redirect = url.searchParams.get('redirect')
  let paid = false
  for (const list of Object.values(db.orders)) {
    const order = list.find((o) => o.id === orderId)
    if (order) {
      if (order.orderState === 1) {
        order.orderState = 2
        order.payState = 1
        order.payTime = fmtTime(Date.now())
        saveDb()
      }
      paid = true
      break
    }
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
loadDb()

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

  const route = routes.find((r) => r.method === method && r.re.test(pathname))
  if (!route) {
    fail(req, res, '接口不存在: ' + method + ' ' + pathname, '404', 404)
    console.log('[' + new Date().toLocaleTimeString() + '] ' + method + ' ' + pathname + ' -> 404')
    return
  }
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
  saveDb()
  process.exit(0)
})

server.listen(PORT, () => {
  console.log('==================================================')
  console.log(' 小兔鲜商城本地后端已启动')
  console.log(' 接口地址: http://localhost:' + PORT)
  console.log(' 接口一览: http://localhost:' + PORT + '/')
  console.log(' 演示账号: xiaotuxian001 / 123456')
  console.log(' 数据文件: ' + DB_FILE)
  console.log('==================================================')
})
