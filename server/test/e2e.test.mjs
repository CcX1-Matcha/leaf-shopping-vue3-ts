// 后端接口端到端测试：node test/e2e.test.mjs（需后端已启动）
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

let passCount = 0
let failCount = 0
const failures = []

function check(name, flag, detail) {
  if (flag) {
    passCount += 1
    console.log('  PASS ' + name)
  } else {
    failCount += 1
    failures.push(name)
    console.log('  FAIL ' + name + '  -> ' + detail)
  }
}

async function req(path, options) {
  const r = await fetch(BASE + path, options)
  const ct = r.headers.get('content-type') || ''
  const body = ct.includes('json') ? await r.json().catch(() => null) : await r.text()
  return { status: r.status, body, headers: r.headers }
}

const get = (path, headers) => req(path, { headers })
const send = (method, path, data, headers) =>
  req(path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: data === undefined ? undefined : JSON.stringify(data)
  })

async function main() {
  console.log('>>> 首页接口')
  let r = await get('/')
  check('GET / 返回接口一览页', r.status === 200 && typeof r.body === 'string' && r.body.includes('小兔鲜'), 'status=' + r.status)

  r = await get('/home/category/head')
  check('分类导航', r.body && r.body.code === '1' && r.body.result.length === 8, JSON.stringify(r.body).slice(0, 100))
  check('分类子项', r.body.result.every((c) => c.children.length >= 2 && c.goods.length >= 1), '')
  check('图片绝对地址', r.body.result[0].picture.startsWith(BASE + '/img/'), r.body.result[0].picture)

  r = await get('/home/banner?distributionSite=1')
  check('首页轮播图', r.body.code === '1' && r.body.result.length === 4, '')
  r = await get('/home/banner?distributionSite=2')
  check('二级页轮播图', r.body.result.length === 2, '')
  r = await get('/home/new')
  check('新鲜好物', r.body.result.length === 4 && !!r.body.result[0].price, '')
  r = await get('/home/hot')
  check('人气推荐', r.body.result.length === 4 && !!r.body.result[0].title, '')
  r = await get('/home/goods')
  check('首页商品楼层', r.body.result.length === 8 && r.body.result.every((c) => c.goods.length >= 1), '')

  console.log('>>> 分类接口')
  r = await get('/category?id=c1')
  check('一级分类页', r.body.result.children.length === 3 && r.body.result.children[0].parentId === 'c1', '')
  r = await get('/category?id=c1-1')
  check('二级分类页(同级)', r.body.result.children.length === 3, '')
  r = await get('/category/sub/filter?id=c1-1')
  check('子分类筛选', r.body.result.parentId === 'c1' && r.body.result.goods.length === 3 && r.body.result.saleProperties.length === 2, '')
  r = await send('POST', '/category/goods/temporary', { categoryId: 'c1-1', page: 1, pageSize: 2, sort: 'publishTime' })
  check('分类商品分页', r.body.result.counts === 3 && r.body.result.items.length === 2 && r.body.result.pages === 2, '')
  r = await send('POST', '/category/goods/temporary', { categoryId: 'c3-1', page: 1, pageSize: 20, sort: 'orderNum' })
  check('分类商品排序', r.body.result.items[0].orderNum >= r.body.result.items[1].orderNum, '')

  console.log('>>> 商品接口')
  r = await get('/goods?id=g1001')
  check('商品详情结构', r.body.result.skus.length === 6 && r.body.result.specs.length === 2 && r.body.result.categories[0].id === 'c1-1' && r.body.result.categories[1].id === 'c1', '')
  check('缺货SKU(禁用规格)', r.body.result.skus[5].inventory === 0, '')
  check('主图4张', r.body.result.mainPictures.length === 4, '')
  r = await get('/goods?id=not-exist')
  check('商品不存在', r.body.code !== '1' && r.body.message === '商品不存在', '')
  r = await get('/goods/hot?id=g1001&type=1&limit=3')
  check('24小时热销', r.body.result.length === 3 && r.body.result.every((x) => x.id !== 'g1001'), '')
  r = await get('/goods/relevant?limit=4')
  check('猜你喜欢', r.body.result.length === 4, '')

  console.log('>>> 登录')
  r = await send('POST', '/login', { account: 'xiaotuxian001', password: '123456' })
  check('登录成功', r.body.code === '1' && !!r.body.result.token, '')
  const token = r.body.result.token
  const auth = { Authorization: 'Bearer ' + token }
  r = await send('POST', '/login', { account: 'xiaotuxian001', password: 'wrong666' })
  check('密码错误提示', r.body.code === '501' && r.body.message === '账号或密码错误', '')
  r = await send('POST', '/login', { account: 'e2e' + Date.now(), password: 'e2e12345' })
  check('自动注册', r.body.code === '1' && !!r.body.result.token, '')

  console.log('>>> 购物车')
  r = await get('/member/cart')
  check('游客购物车为空', r.body.code === '1' && Array.isArray(r.body.result) && r.body.result.length === 0, '')
  r = await get('/member/address')
  check('未登录401', r.status === 401 && r.body.message === '请先登录', 'status=' + r.status)
  r = await send('POST', '/member/cart', { skuId: 'g1001-sku1', count: 2 }, auth)
  check('加入购物车', r.body.result.skuId === 'g1001-sku1' && r.body.result.count === 2, '')
  r = await send('POST', '/member/cart', { skuId: 'g1001-sku1', count: 1 }, auth)
  check('重复加购累加', r.body.result.count === 3, '')
  r = await send('PUT', '/member/cart/g1001-sku1', { count: 5 }, auth)
  check('修改数量', r.body.result.count === 5, '')
  r = await send('PUT', '/member/cart/selected', { selected: false, ids: ['g1001-sku1'] }, auth)
  check('取消勾选', r.body.code === '1', '')
  r = await send('POST', '/member/cart', { skuId: 'g1002-sku1', count: 1 }, auth)
  r = await get('/member/cart', auth)
  check('购物车列表', r.body.result.length === 2 && !!r.body.result[0].nowPrice, '')
  check('购物车图片绝对地址', r.body.result[0].picture.startsWith(BASE), '')
  r = await send('DELETE', '/member/cart', { ids: ['g1002-sku1'] }, auth)
  check('删除购物车商品', r.body.code === '1', '')

  console.log('>>> 结算')
  r = await send('POST', '/member/cart', { skuId: 'g1002-sku1', count: 2 }, auth)
  r = await get('/member/order/pre', auth)
  check('结算数据', r.body.result.goods.length === 1 && r.body.result.goods[0].count === 2 && r.body.result.summary.goodsCount === 2, '')
  check('收货地址', r.body.result.userAddresses.length === 2, '')

  console.log('>>> 地址管理')
  r = await get('/member/address', auth)
  check('地址列表', r.body.result.length === 2 && r.body.result[0].isDefault === 0, '')
  r = await send('POST', '/member/address', { receiver: '王五', contact: '13700137000', provinceCode: '440000', cityCode: '440100', countyCode: '440101', address: '荔湾区中山八路1号', isDefault: 1 }, auth)
  check('新增地址', r.body.code === '1' && !!r.body.result.id && r.body.result.fullLocation.includes('荔湾区'), '')
  const newAddrId = r.body.result.id
  r = await send('PUT', '/member/address/' + newAddrId, { id: newAddrId, receiver: '王五', contact: '13700137000', provinceCode: '440000', cityCode: '440100', countyCode: '440101', address: '荔湾区中山八路2号', isDefault: 0 }, auth)
  check('修改并设为默认', r.body.code === '1', '')
  r = await get('/member/address', auth)
  check('默认地址唯一', r.body.result.filter((a) => a.isDefault === 0).length === 1, '')
  r = await send('DELETE', '/member/address/' + newAddrId, null, auth)
  check('删除地址', r.body.code === '1', '')

  console.log('>>> 订单流程')
  r = await send('POST', '/member/order', { addressId: 'a1', buyerMessage: '尽快发货', deliveryTimeType: 1, payType: 1, payChannel: 1, goods: [{ skuId: 'g1002-sku1', count: 2 }] }, auth)
  check('提交订单', r.body.code === '1' && !!r.body.result.id, '')
  const orderId = r.body.result.id
  r = await get('/member/order/' + orderId, auth)
  check('订单详情', r.body.result.orderState === 1 && r.body.result.countdown > 0 && r.body.result.totalNum === 2, '')
  r = await get('/member/order?orderState=0&page=1&pageSize=2', auth)
  check('订单列表分页', r.body.result.items.length === 2 && r.body.result.counts >= 6 && r.body.result.pages >= 3, 'counts=' + r.body.result.counts + ' pages=' + r.body.result.pages)
  r = await get('/member/order?orderState=2&page=1&pageSize=2', auth)
  check('按状态筛选', r.body.result.items.length >= 1, '')
  const pay = await fetch(BASE + '/pay/aliPay?orderId=' + orderId + '&redirect=' + encodeURIComponent('http://127.0.0.1:5173/pay/result'), { redirect: 'manual' })
  check('模拟支付302跳转', pay.status === 302 && String(pay.headers.get('location')).includes('payResult=true'), '')
  r = await get('/member/order/' + orderId, auth)
  check('支付后订单状态', r.body.result.orderState === 2 && r.body.result.payState === 1 && !!r.body.result.payTime, '')

  console.log('>>> 省市区')
  r = await get('/district/provinces')
  check('省份列表', r.body.list.length >= 8, '')
  r = await get('/district/city?proId=440000')
  check('城市列表', r.body.list.length >= 3, '')
  r = await get('/district/area?cityId=440100')
  check('区县列表', r.body.list.length >= 5, '')

  console.log('>>> 图片服务')
  const img1 = await fetch(BASE + '/img/goods/g1001.svg')
  check('商品图', img1.status === 200 && (img1.headers.get('content-type') || '').startsWith('image/'), '')
  const img1b = await fetch(BASE + '/img/detail/g1001-1.svg')
  check('详情图', img1b.status === 200 && (img1b.headers.get('content-type') || '').startsWith('image/'), '')
  const img2 = await fetch(BASE + '/img/banner/1.svg')
  check('轮播图SVG', img2.status === 200, '')
  const img3 = await fetch(BASE + '/img/color/333333.svg')
  check('色块SVG', img3.status === 200, '')
  const img4 = await fetch(BASE + '/img/avatar/兔.svg')
  check('头像SVG', img4.status === 200, '')
  const img5 = await fetch(BASE + '/img/detail/g1001-1.svg')
  check('详情图SVG', img5.status === 200, '')

  // 清理测试产生的购物车数据
  await send('DELETE', '/member/cart', { ids: ['g1001-sku1'] }, auth)

  console.log('')
  console.log('================================')
  console.log(' PASS: ' + passCount + '   FAIL: ' + failCount)
  if (failCount) {
    console.log(' 失败项: ' + failures.join(' | '))
    process.exitCode = 1
  } else {
    console.log(' 全部通过 ✅')
  }
}

main().catch((e) => {
  console.error('测试执行出错:', e)
  process.exitCode = 1
})
