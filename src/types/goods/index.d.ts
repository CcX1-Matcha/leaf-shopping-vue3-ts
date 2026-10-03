// 商品信息接口
export interface GoodsItem {
  id: string
  name: string
  desc: string
  price: string
  picture: string
  orderNum: null | number // 可能为 null 或数字
}

// 分类子项接口
export interface CategoryChild {
  id: string
  name: string
  picture: string
  children: null | CategoryChild[] // 递归引用自身，可能为 null
  goods: null | GoodsItem[] // 可能为 null 或商品数组
}

// 顶级分类接口
export interface Category {
  id: string
  name: string
  picture: string
  children: CategoryChild[] // 子分类数组
  goods: GoodsItem[] // 商品数组
}

export interface ProductCategoryChild {
  /** 子分类ID */
  id: string
  /** 子分类名称 */
  name: string
  /** 分类层级（固定为2） */
  layer: number
  /** 父分类ID（JSON中均为null，暂定义为null） */
  parent: null
}

export interface ProductMainCategory {
  /** 顶层分类ID */
  id: string
  /** 顶层分类名称（如"居家"、"美食"） */
  name: string
  /** 顶层分类图片URL */
  picture: string
  /** 促销信息（如"大额优惠等你来拿"） */
  saleInfo: string
  /** 子分类数组 */
  children: ProductCategoryChild[]
  /** 该分类下的商品数组 */
  goods: GoodsItem[]
}

export interface SecondCategoryChild {
  /** 二级分类ID */
  id: string
  /** 二级分类名称 */
  name: string
  /** 二级分类图标URL */
  picture: string
  /** 关联的一级分类ID（与根分类id一致） */
  parentId: string
  /** 关联的一级分类名称（与根分类name一致） */
  parentName: string
  /** 二级分类下的商品列表 */
  goods: GoodsItem[]
  /** 预留字段：三级分类（暂为null） */
  categories: null
  /** 预留字段：品牌列表（暂为null） */
  brands: null
  /** 预留字段：销售属性（暂为null） */
  saleProperties: null
}

export interface SecondCategory {
  /** 一级分类ID */
  id: string
  /** 一级分类名称 */
  name: string
  /** 一级分类图标URL（可为null） */
  picture: string | null
  /** 二级分类列表 */
  children: SecondCategoryChild[]
}

// 品牌信息类型
export interface BrandItem {
  id: string
  name: string
  nameEn: string
  logo: string
  picture: string
  type: string | null
  desc: string
  place: string
}

// 销售属性值类型
export interface SalePropertyValue {
  id: string
  name: string
}

// 销售属性类型
export interface SaleProperty {
  id: string
  name: string
  properties: SalePropertyValue[]
}

// 分类详情整体数据类型
export interface CategorySubFilter {
  id: string
  name: string
  picture: string | null
  parentId: string
  parentName: string
  goods: GoodsItem[]
  categories: ProductCategoryChild[]
  brands: BrandItem[]
  saleProperties: SaleProperty[]
}

// 分类筛选条件类型
export interface SubFiltrate {
  categoryId: string
  page: number
  pageSize: number
  sort: 'publishTime' | 'orderNum' | 'evaluateNum'
}

// 分类筛选详情数据类型
export interface FiltrateData {
  counts: number
  pageSize: number
  pages: number
  page: number
  items: GoodsItem[]
}
