// 动态 SVG 图片生成器：所有商品图/轮播图/分类图/头像均由后端生成，无需外网图片
const PALETTES = [
  ['#5fcaa0', '#2e8f6c'],
  ['#6fb3e8', '#2e6f9f'],
  ['#f0a08e', '#c05f4f'],
  ['#eec37f', '#c08a3f'],
  ['#a89fe8', '#6f5fbf'],
  ['#7fc9c9', '#3f8f8f'],
  ['#e89fc0', '#bf5f8f'],
  ['#c3d19b', '#7f9f4f']
]

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function splitLines(text, max) {
  const lines = []
  let cur = ''
  for (const ch of String(text)) {
    cur += ch
    if (cur.length >= max) {
      lines.push(cur)
      cur = ''
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

export function renderSvg({ w = 400, h = 400, seed = 'img', label = '', sub = '', variant = 0, color = null, circle = false }) {
  if (color) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><rect width="' + w + '" height="' + h + '" fill="' + esc(color) + '"/></svg>'
  }
  const idx = (hash(String(seed)) + Number(variant || 0)) % PALETTES.length
  const c1 = PALETTES[idx][0]
  const c2 = PALETTES[idx][1]
  const gid = 'lg' + hash(String(seed)) + 'v' + Number(variant || 0)
  const fsMain = w >= 1000 ? 64 : h < 200 ? 22 : 30
  const fsSub = w >= 1000 ? 30 : h < 200 ? 14 : 20
  const lines = label ? splitLines(label, w >= 1000 ? 14 : 8) : []
  const lh = h < 200 ? 30 : 44
  const startY = h / 2 - ((lines.length - 1) * lh) / 2
  let texts = ''
  lines.forEach((ln, i) => {
    texts += '<text x="50%" y="' + (startY + i * lh) + '" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="' + fsMain + '" fill="#ffffff" text-anchor="middle" font-weight="bold">' + esc(ln) + '</text>'
  })
  if (sub) {
    texts += '<text x="50%" y="' + (startY + lines.length * lh) + '" font-family="Microsoft YaHei, Arial, sans-serif" font-size="' + fsSub + '" fill="rgba(255,255,255,0.9)" text-anchor="middle">' + esc(sub) + '</text>'
  }
  const body = circle ? '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + Math.min(w, h) * 0.42 + '" fill="rgba(255,255,255,0.25)"/>' : ''
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="' + w + '" height="' + h + '" fill="url(#' + gid + ')"/>' + body + texts + '</svg>'
}
