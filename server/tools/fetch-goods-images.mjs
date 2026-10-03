/**
 * 商品图抓取脚本
 *
 * 数据来源：360 图片搜索接口（image.so.com/j）。该接口会直接返回原图地址，
 * 其中大量是淘宝/天猫商品图（img.alicdn.com），脚本优先挑选淘宝 CDN 的原图。
 * （淘宝站内搜索页需要登录且有滑块风控，无法直接抓取，所以走这个聚合入口。）
 *
 * 用法：
 *   node tools/fetch-goods-images.mjs               # 抓全部商品 + 分类封面
 *   node tools/fetch-goods-images.mjs --limit=5     # 只抓前5个（试跑）
 *   node tools/fetch-goods-images.mjs --only=g1001  # 只抓指定商品
 *   node tools/fetch-goods-images.mjs --skip-cat    # 只抓商品图
 *
 * 产物：
 *   public/images/goods/<商品id>-1..4.jpg   每个商品最多4张（封面 + 详情图）
 *   public/images/cat/<分类id>.jpg          分类封面
 *   data/images-manifest.json               抓取记录（来源、尺寸、站点）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { goods, categories } from '../src/data/goods.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const GOODS_DIR = path.join(ROOT, 'public', 'images', 'goods')
const CAT_DIR = path.join(ROOT, 'public', 'images', 'cat')
const MANIFEST_FILE = path.join(ROOT, 'data', 'images-manifest.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const PER_GOODS = 4
const CONCURRENCY = 3
const MIN_BYTES = 6000

const argLimit = process.argv.find((a) => a.startsWith('--limit='))
const argOnly = process.argv.find((a) => a.startsWith('--only='))
const skipCat = process.argv.includes('--skip-cat')
const LIMIT = argLimit ? Number(argLimit.split('=')[1]) : Infinity
const ONLY = argOnly ? argOnly.split('=')[1].split(',') : null

fs.mkdirSync(GOODS_DIR, { recursive: true })
fs.mkdirSync(CAT_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function sniff(buf) {
  if (!buf || buf.length < 12) return null
  const hex = buf.slice(0, 4).toString('hex')
  if (hex.startsWith('ffd8')) return 'jpg'
  if (hex === '89504e47') return 'png'
  if (hex.startsWith('47494638')) return 'gif'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp'
  if (hex.startsWith('424d')) return 'bmp'
  return null
}

async function searchImages(query, pn) {
  const url = 'https://image.so.com/j?q=' + encodeURIComponent(query) + '&src=srp&sn=0&pn=' + (pn || 40)
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://image.so.com/' },
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error('搜索接口 HTTP ' + res.status)
  const json = await res.json()
  return (json.list || []).filter((x) => x && (x.img || x.thumb))
}

// 打分：淘宝原图 > 其他站点原图 > 360 缩略图；越接近方形越适合商品卡片
function score(item) {
  const img = item.img || ''
  const site = (item.site || item.dspurl || '').toLowerCase()
  let s = 0
  if (img.includes('alicdn')) s += 100          // 淘宝/天猫 CDN 原图优先
  else if (img && /^https?:\/\//.test(img)) s += 45
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(img)) s += 10
  // 商品详情图库通常是干净的商品图；比价/内容站多为带促销文字的合成图
  if (/(detail\.tmall|uland\.taobao|detail\.1688|tmall\.com|taobao\.com)/.test(site)) s += 25
  if (/(manmanbuy|smzdm|guancha|zhihu|bilibili|99114|jd\.com)/.test(site)) s -= 18
  const w = Number(item.width) || 0
  const h = Number(item.height) || 0
  if (w && h) {
    const ratio = w / h
    s += Math.max(0, 30 - Math.abs(Math.log(ratio)) * 25)
    if (Math.min(w, h) >= 600) s += 12
    if (Math.min(w, h) < 260) s -= 25
    if (h / w > 1.8 || w / h > 1.8) s -= 20   // 长条促销图/详情长图
  }
  if (item.thumb) s += 4
  return s
}

async function download(url, referer) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: referer || 'https://image.so.com/', Accept: 'image/*,*/*' },
      signal: AbortSignal.timeout(25000)
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < MIN_BYTES) return null
    const ext = sniff(buf)
    if (!ext || ext === 'gif' || ext === 'bmp') return null
    return { buf, ext }
  } catch {
    return null
  }
}

function countGoodsImages(id) {
  if (!fs.existsSync(GOODS_DIR)) return 0
  return fs.readdirSync(GOODS_DIR).filter((f) => f.startsWith(id + '-') && /-(\d+)\.(jpg|png|webp)$/.test(f)).length
}

async function fetchForGoods(g, manifest) {
  if (countGoodsImages(g.id) >= PER_GOODS) {
    console.log('  [跳过] ' + g.id + '（已有）')
    return
  }
  const query = (g.name + ' ' + g.cat1Name).replace(/\s+/g, ' ').trim()
  let list = []
  try {
    list = await searchImages(query, 40)
  } catch (e) {
    console.log('  [搜索失败] ' + g.id + ' ' + e.message)
    return
  }
  const ranked = list.slice().sort((a, b) => score(b) - score(a))
  const picked = []
  const seen = new Set()
  for (const item of ranked) {
    if (picked.length >= PER_GOODS) break
    const candidates = []
    if (item.img && /^https?:\/\//.test(item.img)) candidates.push({ url: item.img, referer: item.link || 'https://image.so.com/' })
    if (item.thumb) candidates.push({ url: item.thumb, referer: 'https://image.so.com/' })
    for (const c of candidates) {
      if (seen.has(c.url)) continue
      seen.add(c.url)
      const got = await download(c.url, c.referer)
      if (!got) continue
      const file = g.id + '-' + (picked.length + 1) + '.' + got.ext
      fs.writeFileSync(path.join(GOODS_DIR, file), got.buf)
      picked.push({
        file,
        source: c.url,
        site: item.site || item.dspurl || '',
        width: Number(item.width) || null,
        height: Number(item.height) || null,
        bytes: got.buf.length,
        taobao: c.url.includes('alicdn')
      })
      break
    }
    await sleep(120)
  }
  manifest[g.id] = { id: g.id, name: g.name, query, images: picked }
  console.log('  [完成] ' + g.id + ' ' + g.name + ' -> ' + picked.length + ' 张（淘宝原图 ' + picked.filter((p) => p.taobao).length + '）')
  await sleep(200)
}

async function fetchForCat(catId, name, manifest, keywords) {
  if (fs.existsSync(CAT_DIR) && fs.readdirSync(CAT_DIR).some((f) => f.startsWith(catId + '.'))) return
  let list = []
  try {
    list = await searchImages(name + ' ' + (keywords || '商品 白底图'), 24)
  } catch {
    return
  }
  const ranked = list.slice().sort((a, b) => score(b) - score(a))
  for (const item of ranked) {
    const tryUrls = []
    if (item.img && /^https?:\/\//.test(item.img)) tryUrls.push({ url: item.img, referer: item.link || 'https://image.so.com/' })
    if (item.thumb) tryUrls.push({ url: item.thumb, referer: 'https://image.so.com/' })
    for (const c of tryUrls) {
      const got = await download(c.url, c.referer)
      if (!got) continue
      const file = catId + '.' + got.ext
      fs.writeFileSync(path.join(CAT_DIR, file), got.buf)
      manifest['cat:' + catId] = { id: catId, name, images: [{ file, source: c.url, taobao: c.url.includes('alicdn') }] }
      console.log('  [分类图] ' + catId + ' ' + name)
      return
    }
    await sleep(100)
  }
}

async function runPool(items, worker, size) {
  let cursor = 0
  const runners = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      await worker(items[idx])
    }
  })
  await Promise.all(runners)
}

async function main() {
  let manifest = {}
  if (fs.existsSync(MANIFEST_FILE)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')) } catch { manifest = {} }
  }
  let targets = goods
  if (ONLY) targets = targets.filter((g) => ONLY.includes(g.id))
  else targets = targets.slice(0, LIMIT)

  console.log('开始抓取 ' + targets.length + ' 个商品的图片...')
  const t0 = Date.now()
  await runPool(targets, (g) => fetchForGoods(g, manifest), CONCURRENCY)
  console.log('商品图完成，用时 ' + Math.round((Date.now() - t0) / 1000) + 's')

  if (!skipCat && !ONLY && LIMIT === Infinity) {
    console.log('开始抓取分类封面...')
    const catTargets = []
    for (const c of categories) {
      catTargets.push({ id: c.id, name: c.name, kw: c.name + ' 商品 白底图' })
      for (const ch of c.children) catTargets.push({ id: ch.id, name: ch.name, kw: ch.name + ' 商品' })
    }
    await runPool(catTargets, (c) => fetchForCat(c.id, c.name, manifest, c.kw), 2)
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2))
  const goodsImgs = fs.readdirSync(GOODS_DIR).length
  const catImgs = fs.readdirSync(CAT_DIR).length
  console.log('全部完成 ✅  商品图 ' + goodsImgs + ' 张，分类图 ' + catImgs + ' 张')
}

main().catch((e) => {
  console.error('抓取出错:', e)
  process.exitCode = 1
})
