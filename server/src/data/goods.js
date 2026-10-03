// 商品与分类数据（本地演示数据，图片由后端 SVG 动态生成）

// ============ 分类树 ============
export const categories = [
  { id: 'c1', name: '居家', saleInfo: '满199减30', children: [
    { id: 'c1-1', name: '床品套件' }, { id: 'c1-2', name: '智能家电' }, { id: 'c1-3', name: '收纳整理' }
  ] },
  { id: 'c2', name: '美食', saleInfo: '全场满99包邮', children: [
    { id: 'c2-1', name: '休闲零食' }, { id: 'c2-2', name: '粮油调味' }, { id: 'c2-3', name: '冲调饮品' }
  ] },
  { id: 'c3', name: '服饰', saleInfo: '秋季新品 7折起', children: [
    { id: 'c3-1', name: '男装' }, { id: 'c3-2', name: '女装' }, { id: 'c3-3', name: '运动户外' }
  ] },
  { id: 'c4', name: '母婴', saleInfo: '宝贝成长 放心之选', children: [
    { id: 'c4-1', name: '奶粉辅食' }, { id: 'c4-2', name: '玩具' }, { id: 'c4-3', name: '纸尿裤' }
  ] },
  { id: 'c5', name: '个护', saleInfo: '呵护你的每一天', children: [
    { id: 'c5-1', name: '洗发护发' }, { id: 'c5-2', name: '口腔护理' }, { id: 'c5-3', name: '身体护理' }
  ] },
  { id: 'c6', name: '严选', saleInfo: '严选好物 品质保证', children: [
    { id: 'c6-1', name: '严选好物' }, { id: 'c6-2', name: '品质生活' }
  ] },
  { id: 'c7', name: '数码', saleInfo: '数码狂欢 直降千元', children: [
    { id: 'c7-1', name: '手机' }, { id: 'c7-2', name: '电脑办公' }, { id: 'c7-3', name: '影音娱乐' }
  ] },
  { id: 'c8', name: '运动', saleInfo: '运动装备 5折秒杀', children: [
    { id: 'c8-1', name: '健身器材' }, { id: 'c8-2', name: '运动鞋服' }, { id: 'c8-3', name: '骑行装备' }
  ] }
]

export const cat1Map = new Map(categories.map((c) => [c.id, c]))
export const cat2Map = new Map()
for (const c of categories) {
  for (const ch of c.children) {
    cat2Map.set(ch.id, Object.assign({}, ch, { parent: c }))
  }
}

// ============ 品牌池 ============
const BRANDS = {
  c1: [['南极人', 'Nanjiren'], ['水星家纺', 'Shuixing'], ['苏泊尔', 'Supor'], ['小熊', 'Bear'], ['米家', 'Mijia']],
  c2: [['良品铺子', 'Bestore'], ['十月稻田', 'Shiyue'], ['金龙鱼', 'Arawana'], ['隅田川', 'Tasogare']],
  c3: [['优衣库', 'Uniqlo'], ['太平鸟', 'Peacebird'], ['安踏', 'Anta'], ['骆驼', 'Camel']],
  c4: [['飞鹤', 'Firmus'], ['嘉宝', 'Gerber'], ['乐高', 'LEGO'], ['好奇', 'Huggies']],
  c5: [['资生堂', 'Shiseido'], ['云南白药', 'YunnanBaiyao'], ['飞利浦', 'Philips'], ['欧舒丹', "L'Occitane"]],
  c6: [['网易严选', 'Yanxuan'], ['无印良品', 'MUJI']],
  c7: [['华为', 'HUAWEI'], ['小米', 'Xiaomi'], ['联想', 'Lenovo'], ['索尼', 'SONY']],
  c8: [['迪卡侬', 'Decathlon'], ['李宁', 'Li-Ning'], ['捷安特', 'GIANT']]
}

// ============ 颜色映射 ============
const COLOR_HEX = {
  '黑色': '#333333', '白色': '#f2f2f2', '浅灰': '#b8b8b8', '雾霾蓝': '#a3b8cc',
  '香槟金': '#d9c9a3', '米白': '#efe9df', '墨绿': '#2f5d50', '酒红': '#7a2e3b',
  '深蓝': '#2b4d7a', '浅蓝': '#a8c6e0', '银灰': '#c0c4c8', '深空黑': '#1c1e22'
}
export const colorHex = (name) => COLOR_HEX[name] || '#9aa5b1'

// ============ 商品目录 ============
// specs 可选：自定义规格（color: true 表示该规格值为颜色，会生成色块图）
const CATALOG = [{"id":"g1001","name":"全棉磨毛四件套 1.8米床","desc":"100%纯棉 柔软亲肤 透气保暖","price":299,"oldPrice":399,"cat2":"c1-1","sales":12680,"comments":3120,"collects":5600},{"id":"g1002","name":"100支长绒棉贡缎四件套","desc":"高支高密 丝滑垂坠 裸睡级体验","price":399,"oldPrice":499,"cat2":"c1-1","sales":8930,"comments":2210,"collects":4100},{"id":"g1003","name":"泰国进口天然乳胶枕 一对","desc":"93%天然乳胶 护颈助眠","price":159,"oldPrice":199,"cat2":"c1-1","sales":21500,"comments":5640,"collects":9800},{"id":"g1004","name":"苏泊尔5L智能电饭煲","desc":"IH电磁加热 24小时预约","price":329,"oldPrice":429,"cat2":"c1-2","sales":4520,"comments":1100,"collects":2300},{"id":"g1005","name":"米家扫拖一体机器人","desc":"激光导航 自动回充 手机控制","price":1499,"oldPrice":1999,"cat2":"c1-2","sales":3210,"comments":860,"collects":1900},{"id":"g1006","name":"小熊加湿器 4L大容量","desc":"静音加湿 上加水 缺水断电","price":109,"oldPrice":159,"cat2":"c1-2","sales":18700,"comments":4980,"collects":7600},{"id":"g1007","name":"布艺收纳箱三件套","desc":"可折叠 防尘防潮 大容量","price":59,"oldPrice":89,"cat2":"c1-3","sales":34200,"comments":8100,"collects":12400},{"id":"g1008","name":"抽屉式衣柜收纳盒","desc":"透明可视 分类收纳 叠放稳固","price":79,"oldPrice":119,"cat2":"c1-3","sales":15100,"comments":3720,"collects":6100},{"id":"g2001","name":"每日坚果混合装 30包","desc":"6种坚果果干 科学配比 独立锁鲜","price":79,"oldPrice":109,"cat2":"c2-1","sales":56200,"comments":13200,"collects":20100},{"id":"g2002","name":"手撕面包整箱 1kg","desc":"奶香浓郁 层层松软 早餐代餐","price":29.9,"oldPrice":39.9,"cat2":"c2-1","sales":48900,"comments":11200,"collects":16800},{"id":"g2003","name":"卤味鸭脖 108g×3袋","desc":"微辣鲜香 锁鲜装 追剧必备","price":39.9,"oldPrice":49.9,"cat2":"c2-1","sales":26500,"comments":6740,"collects":9900},{"id":"g2004","name":"五常大米 5kg 当季新米","desc":"东北五常产区 米粒饱满 饭香四溢","price":69,"oldPrice":89,"cat2":"c2-2","sales":39800,"comments":9840,"collects":14300},{"id":"g2005","name":"特级初榨橄榄油 500ml","desc":"西班牙进口 冷榨工艺 0添加","price":89,"oldPrice":119,"cat2":"c2-2","sales":9800,"comments":2410,"collects":4200},{"id":"g2006","name":"零添加头道酱油 1.9L","desc":"非转基因黄豆 酿造180天","price":19.9,"oldPrice":25.9,"cat2":"c2-2","sales":30100,"comments":7200,"collects":10600},{"id":"g2007","name":"蓝山风味挂耳咖啡 20片","desc":"新鲜烘焙 现磨风味 3分钟手冲","price":49,"oldPrice":69,"cat2":"c2-3","sales":22400,"comments":5610,"collects":8700},{"id":"g2008","name":"云南高山红茶 250g","desc":"古树红茶 蜜香醇厚 礼盒装","price":129,"oldPrice":169,"cat2":"c2-3","sales":7600,"comments":1980,"collects":3500},{"id":"g3001","name":"男士纯棉基础款T恤","desc":"新疆长绒棉 重磅220g 多色可选","price":69,"oldPrice":99,"cat2":"c3-1","sales":43200,"comments":10800,"collects":15600,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","雾霾蓝"]},{"name":"尺码","values":["S","M","L","XL","XXL"]}]},{"id":"g3002","name":"男士休闲夹克外套","desc":"防风保暖 立体剪裁 春秋新款","price":299,"oldPrice":399,"cat2":"c3-1","sales":8600,"comments":2100,"collects":3900,"specs":[{"name":"颜色","color":true,"values":["黑色","墨绿","浅灰"]},{"name":"尺码","values":["M","L","XL","XXL"]}]},{"id":"g3003","name":"男士直筒牛仔裤","desc":"弹力面料 修身不紧绷 百搭","price":159,"oldPrice":219,"cat2":"c3-1","sales":12700,"comments":3100,"collects":5200,"specs":[{"name":"颜色","color":true,"values":["深蓝","浅蓝","黑色"]},{"name":"尺码","values":["28","29","30","31","32","33","34"]}]},{"id":"g3004","name":"法式碎花连衣裙","desc":"雪纺面料 收腰显瘦 度假风","price":189,"oldPrice":259,"cat2":"c3-2","sales":9800,"comments":2500,"collects":4400,"specs":[{"name":"颜色","color":true,"values":["米白","酒红","墨绿"]},{"name":"尺码","values":["S","M","L","XL"]}]},{"id":"g3005","name":"女士针织开衫外套","desc":"软糯亲肤 慵懒风 显白百搭","price":139,"oldPrice":199,"cat2":"c3-2","sales":11500,"comments":2870,"collects":4900,"specs":[{"name":"颜色","color":true,"values":["雾霾蓝","香槟金","米白"]},{"name":"尺码","values":["S","M","L"]}]},{"id":"g3006","name":"高腰阔腿裤女","desc":"垂感面料 遮肉显高 四季款","price":119,"oldPrice":169,"cat2":"c3-2","sales":16700,"comments":4020,"collects":6300,"specs":[{"name":"颜色","color":true,"values":["黑色","浅灰","米白"]},{"name":"尺码","values":["S","M","L","XL"]}]},{"id":"g3007","name":"速干运动T恤 男女同款","desc":"吸湿排汗 轻薄透气 健身跑步","price":59,"oldPrice":89,"cat2":"c3-3","sales":23100,"comments":5600,"collects":8100,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","墨绿"]},{"name":"尺码","values":["S","M","L","XL","XXL"]}]},{"id":"g3008","name":"户外冲锋衣 三合一","desc":"防风防水 可拆卸内胆 登山必备","price":399,"oldPrice":599,"cat2":"c3-3","sales":6400,"comments":1690,"collects":3100,"specs":[{"name":"颜色","color":true,"values":["墨绿","酒红","黑色"]},{"name":"尺码","values":["M","L","XL","XXL"]}]},{"id":"g4001","name":"婴幼儿配方奶粉3段 900g","desc":"含OPO结构脂 DHA+ARA 助力成长","price":268,"oldPrice":338,"cat2":"c4-1","sales":18600,"comments":4800,"collects":7400},{"id":"g4002","name":"宝宝高铁米粉 225g","desc":"强化铁锌钙 易冲调 6-36个月","price":39,"oldPrice":59,"cat2":"c4-1","sales":14200,"comments":3500,"collects":5600},{"id":"g4003","name":"大颗粒积木 1000粒装","desc":"安全ABS材质 益智启蒙 附收纳桶","price":149,"oldPrice":199,"cat2":"c4-2","sales":8900,"comments":2200,"collects":4000},{"id":"g4004","name":"儿童早教故事机","desc":"海量资源 国学英语 哄睡神器","price":129,"oldPrice":179,"cat2":"c4-2","sales":10500,"comments":2600,"collects":4500},{"id":"g4005","name":"超薄透气纸尿裤 L码54片","desc":"3D亲肤面层 瞬吸干爽 整夜安睡","price":89,"oldPrice":129,"cat2":"c4-3","sales":27600,"comments":6800,"collects":10200,"specs":[{"name":"尺码","values":["S","M","L","XL"]}]},{"id":"g4006","name":"婴儿柔纸巾 40抽×30包","desc":"保湿因子 云柔触感 无香精","price":49,"oldPrice":69,"cat2":"c4-3","sales":19800,"comments":4900,"collects":7300},{"id":"g5001","name":"氨基酸洗发水 500ml","desc":"温和清洁 控油蓬松 无硅油","price":69,"oldPrice":99,"cat2":"c5-1","sales":32100,"comments":7800,"collects":11400},{"id":"g5002","name":"修护发膜 200g","desc":"角蛋白修护 抚平毛躁 顺滑亮泽","price":59,"oldPrice":89,"cat2":"c5-1","sales":15700,"comments":3800,"collects":5900},{"id":"g5003","name":"声波电动牙刷","desc":"3.2万次/分钟 4种模式 30天续航","price":199,"oldPrice":299,"cat2":"c5-2","sales":13300,"comments":3300,"collects":5200,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","雾霾蓝"]},{"name":"版本","values":["标准版","礼盒版"]}]},{"id":"g5004","name":"牙膏家庭装 3支","desc":"含氟防蛀 清新口气 全家适用","price":29.9,"oldPrice":39.9,"cat2":"c5-2","sales":41200,"comments":9600,"collects":13800},{"id":"g5005","name":"烟酰胺身体乳 400ml","desc":"持久保湿 提亮肤色 清爽不腻","price":49,"oldPrice":79,"cat2":"c5-3","sales":24600,"comments":5900,"collects":8600},{"id":"g5006","name":"香氛沐浴露 750ml","desc":"前中后调留香 绵密泡沫 温和","price":39,"oldPrice":59,"cat2":"c5-3","sales":28900,"comments":7100,"collects":9900},{"id":"g6001","name":"316不锈钢保温杯 500ml","desc":"真空锁温 12小时长效保温","price":89,"oldPrice":129,"cat2":"c6-1","sales":36400,"comments":8600,"collects":12100,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","香槟金"]},{"name":"容量","values":["350ml","500ml"]}]},{"id":"g6002","name":"便携榨汁杯 300ml","desc":"无线充电 6叶刀头 一键鲜榨","price":79,"oldPrice":119,"cat2":"c6-1","sales":9800,"comments":2300,"collects":4100},{"id":"g6003","name":"香薰蜡烛礼盒","desc":"大豆蜡 天然精油 助眠安神","price":69,"oldPrice":99,"cat2":"c6-2","sales":6700,"comments":1600,"collects":2900},{"id":"g6004","name":"纯棉毛巾三件套","desc":"A类标准 柔软吸水 不掉毛","price":39,"oldPrice":59,"cat2":"c6-2","sales":17500,"comments":4300,"collects":6400},{"id":"g7001","name":"旗舰5G手机 12+256G","desc":"骁龙旗舰芯片 2K屏 5000mAh","price":3999,"oldPrice":4299,"cat2":"c7-1","sales":5200,"comments":1350,"collects":2800,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","雾霾蓝"]},{"name":"版本","values":["12G+256G","16G+512G"]}]},{"id":"g7002","name":"千元性价比手机 8+128G","desc":"高刷屏 大电池 学生备用首选","price":1299,"oldPrice":1499,"cat2":"c7-1","sales":11200,"comments":2800,"collects":4600,"specs":[{"name":"颜色","color":true,"values":["黑色","墨绿","浅灰"]},{"name":"版本","values":["8G+128G","8G+256G"]}]},{"id":"g7003","name":"轻薄本 14英寸","desc":"2.8K OLED 16G+512G 1.29kg","price":4299,"oldPrice":4999,"cat2":"c7-2","sales":3100,"comments":820,"collects":1900,"specs":[{"name":"颜色","color":true,"values":["银灰","深空黑"]},{"name":"版本","values":["16G+512G","16G+1TB"]}]},{"id":"g7004","name":"机械键盘 87键","desc":"热插拔轴体 三模连接 RGB背光","price":299,"oldPrice":399,"cat2":"c7-2","sales":8400,"comments":2100,"collects":3800,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","浅灰"]},{"name":"轴体","values":["红轴","茶轴","青轴"]}]},{"id":"g7005","name":"真无线降噪耳机","desc":"40dB深度降噪 30小时续航","price":499,"oldPrice":699,"cat2":"c7-3","sales":7800,"comments":1950,"collects":3500},{"id":"g7006","name":"便携蓝牙音箱","desc":"360°环绕声 12小时续航 防水","price":199,"oldPrice":299,"cat2":"c7-3","sales":6900,"comments":1700,"collects":3000},{"id":"g8001","name":"家用折叠跑步机","desc":"静音电机 免安装 可折叠收纳","price":1999,"oldPrice":2599,"cat2":"c8-1","sales":2100,"comments":540,"collects":1200},{"id":"g8002","name":"加厚防滑瑜伽垫","desc":"TPE材质 8mm加厚 回弹耐磨","price":59,"oldPrice":89,"cat2":"c8-1","sales":18700,"comments":4600,"collects":7100,"specs":[{"name":"颜色","color":true,"values":["雾霾蓝","墨绿","酒红"]},{"name":"厚度","values":["6mm","8mm","10mm"]}]},{"id":"g8003","name":"轻便缓震跑步鞋","desc":"全掌气垫 透气网面 轻若无物","price":299,"oldPrice":399,"cat2":"c8-2","sales":9800,"comments":2400,"collects":4300,"specs":[{"name":"颜色","color":true,"values":["黑色","白色","雾霾蓝"]},{"name":"尺码","values":["39","40","41","42","43","44"]}]},{"id":"g8004","name":"运动套装 女 两件套","desc":"速干面料 修身显瘦 瑜伽健身","price":159,"oldPrice":229,"cat2":"c8-2","sales":12500,"comments":3100,"collects":5100,"specs":[{"name":"颜色","color":true,"values":["黑色","酒红","墨绿"]},{"name":"尺码","values":["S","M","L","XL"]}]},{"id":"g8005","name":"山地自行车 27速","desc":"铝合金车架 前后碟刹 城市越野","price":1299,"oldPrice":1699,"cat2":"c8-3","sales":1400,"comments":360,"collects":900,"specs":[{"name":"颜色","color":true,"values":["黑色","雾霾蓝","墨绿"]},{"name":"轮径","values":["26寸","27.5寸"]}]},{"id":"g8006","name":"一体成型骑行头盔","desc":"轻量透气 安全认证 可调头围","price":129,"oldPrice":179,"cat2":"c8-3","sales":3200,"comments":800,"collects":1600}]

function makeSpecs(g, idx) {
  if (g.specs) {
    return g.specs.map((s, si) => ({
      id: g.id + '-spec' + (si + 1),
      name: s.name,
      values: s.values.map((v) => ({
        name: v,
        desc: s.name + ': ' + v,
        picture: s.color ? '/img/color/' + colorHex(v).slice(1) + '.svg' : null
      }))
    }))
  }
  const palettes = [
    ['黑色', '白色', '浅灰'],
    ['雾霾蓝', '香槟金', '米白'],
    ['墨绿', '酒红', '米白'],
    ['黑色', '雾霾蓝', '浅灰']
  ]
  const palette = palettes[idx % palettes.length]
  return [
    {
      id: g.id + '-spec1',
      name: '颜色',
      values: palette.map((c) => ({ name: c, desc: '颜色: ' + c, picture: '/img/color/' + colorHex(c).slice(1) + '.svg' }))
    },
    {
      id: g.id + '-spec2',
      name: '规格',
      values: [
        { name: '标准版', desc: '标准配置', picture: null },
        { name: '升级版', desc: '升级配置', picture: null }
      ]
    }
  ]
}

function makeSkus(g, specs) {
  const skus = []
  const combo = []
  const walk = (depth) => {
    if (depth === specs.length) {
      const i = skus.length
      const price = Number((g.price + i * 15).toFixed(2))
      const oldPrice = Number((g.oldPrice + i * 15).toFixed(2))
      const totalCombos = specs[0].values.length * (specs.length > 1 ? specs[1].values.length : 1)
      // 演示一个缺货 SKU（详情页的禁用规格逻辑会用到）
      const inventory = g.id === 'g1001' && i === totalCombos - 1 ? 0 : 50 + ((i * 37 + 11) % 121)
      skus.push({
        id: g.id + '-sku' + (i + 1),
        skuCode: g.id + '-sku' + (i + 1),
        inventory,
        oldPrice: oldPrice.toFixed(2),
        price: price.toFixed(2),
        specs: combo.map((c) => ({ name: c.name, valueName: c.valueName }))
      })
      return
    }
    for (const v of specs[depth].values) {
      combo.push({ name: specs[depth].name, valueName: v.name })
      walk(depth + 1)
      combo.pop()
    }
  }
  walk(0)
  return skus
}

// ============ 构建完整商品数据 ============
const brandCursor = {}
export const goods = CATALOG.map((g, idx) => {
  const cat2 = cat2Map.get(g.cat2)
  const cat1 = cat2.parent
  if (!(cat1.id in brandCursor)) brandCursor[cat1.id] = 0
  const pool = BRANDS[cat1.id] || [['小兔鲜', 'Rabbit']]
  const pair = pool[brandCursor[cat1.id] % pool.length]
  brandCursor[cat1.id] += 1
  const specs = makeSpecs(g, idx)
  const skus = makeSkus(g, specs)
  const inventory = skus.reduce((a, s) => a + s.inventory, 0)
  const picture = '/img/goods/' + g.id + '.svg'
  return {
    id: g.id,
    name: g.name,
    desc: g.desc,
    price: g.price.toFixed(2),
    oldPrice: g.oldPrice.toFixed(2),
    picture,
    spuCode: 'SPU-' + g.id.toUpperCase(),
    cat1Id: cat1.id,
    cat1Name: cat1.name,
    cat2Id: cat2.id,
    cat2Name: cat2.name,
    sales: g.sales,
    comments: g.comments,
    collects: g.collects,
    inventory,
    skus,
    specs,
    brand: {
      id: 'b-' + g.id,
      name: pair[0],
      nameEn: pair[1],
      logo: '/img/brand/' + g.id + '.svg',
      picture: '/img/brand/' + g.id + '.svg',
      desc: null,
      place: '中国大陆',
      type: null
    }
  }
})

export const goodsMap = new Map(goods.map((g) => [g.id, g]))
export const skuMap = new Map()
for (const g of goods) {
  for (const s of g.skus) skuMap.set(s.id, { goods: g, sku: s })
}

export const findSku = (id) => skuMap.get(id) || null

export const simpleGoods = (g) => ({
  id: g.id,
  name: g.name,
  desc: g.desc,
  price: g.price,
  picture: g.picture,
  orderNum: g.sales,
  discount: null
})

export const listByCat2 = (cat2Id) => goods.filter((g) => g.cat2Id === cat2Id)

export function topGoodsByCat(catId, n, excludeId) {
  const c1 = cat1Map.get(catId)
  const ids = c1 ? c1.children.map((c) => c.id) : [catId]
  return goods
    .filter((g) => ids.includes(g.cat2Id) && g.id !== excludeId)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, n)
}

export function getGoodsDetail(g) {
  const cat1 = cat1Map.get(g.cat1Id)
  const cat2 = cat2Map.get(g.cat2Id)
  // categories 数组：[三级分类(这里即二级叶子分类), 一级分类]，与前端面包屑取 categories[0]/[1] 对应
  const cat1Obj = { id: cat1.id, name: cat1.name, layer: 1, parent: null }
  const cat2Obj = { id: cat2.id, name: cat2.name, layer: 2, parent: { id: cat1.id, name: cat1.name, layer: 1, parent: null } }
  const similar = goods
    .filter((x) => x.cat2Id === g.cat2Id && x.id !== g.id)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 4)
    .map((x) => ({ id: x.id, name: x.name, desc: x.desc, picture: x.picture, orderNum: x.sales, price: x.price, discount: null }))
  const hot = goods
    .filter((x) => x.id !== g.id)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 3)
    .map((x) => ({ id: x.id, name: x.name, desc: x.desc, picture: x.picture, orderNum: x.sales, price: x.price, discount: null }))
  return {
    id: g.id,
    name: g.name,
    desc: g.desc,
    price: g.price,
    oldPrice: g.oldPrice,
    picture: g.picture,
    brand: g.brand,
    categories: [cat2Obj, cat1Obj],
    collectCount: g.collects,
    commentCount: g.comments,
    discount: 1,
    details: {
      pictures: [1, 2, 3].map((n) => '/img/detail/' + g.id + '-' + n + '.svg'),
      properties: [
        { name: '品牌', value: g.brand.name },
        { name: '产地', value: '中国大陆' },
        { name: '商品编号', value: g.spuCode },
        { name: '上市时间', value: '2025年' }
      ]
    },
    evaluationInfo: {
      content: '商品质量很好，物流很快，客服态度也很好，值得回购！',
      createTime: '2025-10-01 10:00:00',
      id: g.id + '-e1',
      member: null,
      officialReply: null,
      orderInfo: null,
      pictures: null,
      praiseCount: 128,
      praisePercent: 98,
      score: 5,
      tags: null
    },
    hotByDay: hot,
    inventory: g.inventory,
    isCollect: null,
    isPreSale: false,
    mainPictures: [0, 1, 2, 3].map((t) => g.picture + '?t=' + t),
    mainVideos: [],
    recommends: null,
    salesCount: g.sales,
    similarProducts: similar,
    skus: g.skus,
    specs: g.specs,
    spuCode: g.spuCode,
    userAddresses: null,
    videoScale: 1
  }
}
