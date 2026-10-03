// 收货地址信息接口
export interface UserAddress {
  id?: string
  receiver: string // 收货人
  contact: string // 联系方式
  provinceCode: string // 省份编码
  cityCode: string // 城市编码
  countyCode: string // 区县编码
  address: string // 详细地址
  isDefault: 0 | 1 // 是否默认地址（1-是，0-否）
  fullLocation: string // 完整地址（省市区拼接）
  postalCode: string | null // 邮政编码（可能为null）
  addressTags: string | null // 地址标签（可能为null）
}

// 商品信息接口
export interface GoodsItem {
  id: string
  name: string // 商品名称
  picture: string // 商品图片URL
  count: number // 购买数量
  skuId: string // SKU编号
  attrsText: string // 规格属性文本
  price: string // 单价（字符串形式，保留两位小数）
  payPrice: string // 实付单价（字符串形式）
  totalPrice: string // 总价（单价×数量，字符串形式）
  totalPayPrice: string // 实付总价（字符串形式）
}

// 订单汇总信息接口
export interface OrderSummary {
  goodsCount: number // 商品总数量
  totalPrice: number // 商品总价（数字形式）
  totalPayPrice: number // 实付总价（数字形式）
  postFee: number // 运费
  discountPrice: number // 折扣金额
}

// 整体结果接口
export interface CheckoutData {
  userAddresses: UserAddress[] // 收货地址列表
  goods: GoodsItem[] // 商品列表
  summary: OrderSummary // 订单汇总信息
}

// 提交订单接口
export interface submitOderData {
  /**
   * 收货地址id
   */
  addressId: string
  /**
   * 买家备注留言，默认为空字符串即可
   */
  buyerMessage: string
  /**
   * 配送时间，默认为1即可
   */
  deliveryTimeType: number
  /**
   * 订单内商品集合，需要自己携带给后台
   */
  goods: Good[]
  /**
   * 支付渠道，默认为1即可(支付宝支付-此项目只支持支付宝)
   */
  payChannel: number
  /**
   * 支付方式，默认为1即可(在线支付)
   */
  payType: number
}

export interface Good {
  /**
   * 商品数量
   */
  count: number
  /**
   * 商品库存量单位id
   */
  skuId: string
}
