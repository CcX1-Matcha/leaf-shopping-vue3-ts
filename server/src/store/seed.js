// 初始演示数据：两种存储驱动共用（db.json 首次生成 / MySQL 空库初始化）
import { findSku } from '../data/goods.js'

const pad = (n) => String(n).padStart(2, '0')
export const fmtTime = (ts) => {
  const d = new Date(ts)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}
export const parseTs = (s) => new Date(String(s).replace(' ', 'T')).getTime()

// 按商品 SKU 生成订单对象（下单接口和演示数据都用它）
export function buildOrder(id, address, goodsList, opts = {}) {
  const now = Date.now()
  const skus = []
  let totalMoney = 0
  let totalNum = 0
  for (const item of goodsList) {
    const found = findSku(item.skuId)
    if (!found) return { error: '商品 ' + item.skuId + ' 不存在或已下架' }
    const g = found.goods
    const sku = found.sku
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
  return {
    order: {
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
  }
}

export function buildSeedData() {
  const now = Date.now()
  const H = 3600 * 1000
  const D = 24 * H
  const data = {
    seq: { user: 1000, order: 0, address: 0 },
    users: [
      {
        id: 'u1',
        account: 'xiaotuxian001',
        password: '123456',
        nickname: '小兔鲜儿',
        avatar: '/img/avatar/兔.svg',
        gender: '男',
        mobile: '13800138000',
        token: ''
      }
    ],
    carts: { u1: [] },
    addresses: {
      u1: [
        { id: 'a1', receiver: '张三', contact: '13800138000', provinceCode: '440000', cityCode: '440100', countyCode: '440106', address: '天河区体育西路123号6栋601室', isDefault: 0, fullLocation: '广东省 广州市 天河区', postalCode: null, addressTags: null },
        { id: 'a2', receiver: '李四', contact: '13900139000', provinceCode: '330000', cityCode: '330100', countyCode: '330106', address: '西湖区文三路100号3单元202室', isDefault: 1, fullLocation: '浙江省 杭州市 西湖区', postalCode: null, addressTags: null }
      ]
    },
    orders: { u1: [] }
  }

  const nextId = () => {
    data.seq.order += 1
    return String(Date.now() - 5 * D) + String(data.seq.order % 1000).padStart(3, '0')
  }
  const addr = (id) => data.addresses.u1.find((a) => a.id === id)

  // 待付款
  const o1 = buildOrder(String(now) + '001', addr('a1'), [
    { skuId: 'g2001-sku1', count: 2 },
    { skuId: 'g2002-sku1', count: 1 }
  ]).order
  o1.createTime = fmtTime(now - 2 * 60 * 1000)

  // 待发货
  const o2 = buildOrder(String(now) + '002', addr('a2'), [{ skuId: 'g3001-sku2', count: 2 }], { buyerMessage: '请发顺丰快递' }).order
  o2.orderState = 2
  o2.payState = 1
  o2.createTime = fmtTime(now - 1 * D)
  o2.payTime = fmtTime(now - 1 * D + 5 * 60 * 1000)
  o2.payLatestTime = fmtTime(now - 1 * D + 30 * 60 * 1000)
  o2.closeTime = null
  o2.consignTime = fmtTime(now - 12 * H)

  // 待收货
  const o3 = buildOrder(String(now) + '003', addr('a1'), [{ skuId: 'g5001-sku2', count: 1 }]).order
  o3.orderState = 3
  o3.payState = 1
  o3.createTime = fmtTime(now - 2 * D)
  o3.payTime = fmtTime(now - 2 * D + 10 * 60 * 1000)
  o3.payLatestTime = fmtTime(now - 2 * D + 30 * 60 * 1000)
  o3.closeTime = null
  o3.consignTime = fmtTime(now - 1 * D - 12 * H)

  // 已完成
  const o4 = buildOrder(String(now) + '004', addr('a2'), [
    { skuId: 'g6001-sku3', count: 1 },
    { skuId: 'g1007-sku1', count: 2 }
  ]).order
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
  const o5 = buildOrder(String(now) + '005', addr('a1'), [{ skuId: 'g3004-sku1', count: 1 }]).order
  o5.orderState = 6
  o5.payState = 0
  o5.createTime = fmtTime(now - 1 * D)
  o5.closeTime = fmtTime(now - 1 * D + 30 * 60 * 1000)
  o5.payLatestTime = o5.closeTime

  data.orders.u1 = [o1, o5, o2, o3, o4]
  data.seq.order = 5
  return data
}
