export interface CartItem {
  /** 商品唯一标识ID（字符串类型，可能为数字字符串） */
  id?: string

  /** 商品SKU唯一标识（用于区分不同规格的商品，字符串类型） */
  skuId?: string

  /** 商品名称（展示用，字符串类型） */
  name?: string

  /** 商品属性文本描述（如"颜色:红色 尺码:M"，字符串类型） */
  attrsText?: string

  /** 商品规格详情列表（如[{name: '颜色', value: '红色'}, ...]，当前为任意类型数组，可根据实际结构细化） */
  specs?: string[]

  /** 商品主图URL（用于展示商品图片，字符串类型） */
  picture?: string

  /** 商品原价（原价标签展示，字符串类型，带两位小数，如"199.00"） */
  price?: string

  /** 商品当前售价（实际购买价格，字符串类型，带两位小数） */
  nowPrice?: string

  /** 商品当前原价（可能与price一致，用于促销场景对比，字符串类型，带两位小数） */
  nowOriginalPrice?: string

  /** 商品是否被选中（用于勾选结算，布尔值，true为选中） */
  selected?: boolean

  /** 商品库存数量（剩余可购买数量，数字类型） */
  stock?: number

  /** 商品购买数量（用户选择的购买个数，数字类型） */
  count?: number

  /** 商品是否有效（是否可购买，布尔值，true为有效） */
  isEffective?: boolean

  /** 商品折扣信息（可能为折扣规则对象，如{type: '满减', value: '20'}，也可能为null表示无折扣） */
  discount?: null

  /** 商品是否被收藏（用户收藏状态，布尔值，true为已收藏） */
  isCollect?: boolean

  /** 商品运费（配送费用，数字类型，单位：元） */
  postFee?: number
}
