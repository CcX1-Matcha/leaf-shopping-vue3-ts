// 省市区数据（演示用精简版，覆盖主要省市）
export const provinces = [
  { proId: '110000', proName: '北京市', cities: [{ cityId: '110100', cityName: '北京市', areas: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区'] }] },
  { proId: '120000', proName: '天津市', cities: [{ cityId: '120100', cityName: '天津市', areas: ['和平区', '南开区', '河西区', '河东区', '河北区'] }] },
  {
    proId: '130000', proName: '河北省',
    cities: [
      { cityId: '130100', cityName: '石家庄市', areas: ['长安区', '桥西区', '裕华区', '新华区'] },
      { cityId: '130200', cityName: '唐山市', areas: ['路南区', '路北区', '丰南区'] }
    ]
  },
  { proId: '310000', proName: '上海市', cities: [{ cityId: '310100', cityName: '上海市', areas: ['黄浦区', '徐汇区', '长宁区', '浦东新区', '静安区'] }] },
  {
    proId: '320000', proName: '江苏省',
    cities: [
      { cityId: '320100', cityName: '南京市', areas: ['玄武区', '秦淮区', '鼓楼区', '建邺区'] },
      { cityId: '320500', cityName: '苏州市', areas: ['虎丘区', '吴中区', '姑苏区', '相城区'] },
      { cityId: '320200', cityName: '无锡市', areas: ['梁溪区', '滨湖区', '惠山区'] }
    ]
  },
  {
    proId: '330000', proName: '浙江省',
    cities: [
      { cityId: '330100', cityName: '杭州市', areas: ['上城区', '拱墅区', '西湖区', '滨江区', '余杭区'] },
      { cityId: '330200', cityName: '宁波市', areas: ['海曙区', '鄞州区', '江北区'] }
    ]
  },
  { proId: '420000', proName: '湖北省', cities: [{ cityId: '420100', cityName: '武汉市', areas: ['江岸区', '武昌区', '洪山区', '蔡甸区'] }] },
  {
    proId: '440000', proName: '广东省',
    cities: [
      { cityId: '440100', cityName: '广州市', areas: ['荔湾区', '越秀区', '天河区', '白云区', '海珠区'] },
      { cityId: '440300', cityName: '深圳市', areas: ['罗湖区', '福田区', '南山区', '宝安区'] },
      { cityId: '441900', cityName: '东莞市', areas: ['莞城街道', '南城街道', '东城街道'] }
    ]
  },
  {
    proId: '510000', proName: '四川省',
    cities: [
      { cityId: '510100', cityName: '成都市', areas: ['锦江区', '青羊区', '武侯区', '成华区'] },
      { cityId: '510700', cityName: '绵阳市', areas: ['涪城区', '游仙区'] }
    ]
  },
  { proId: '610000', proName: '陕西省', cities: [{ cityId: '610100', cityName: '西安市', areas: ['新城区', '碑林区', '雁塔区', '长安区'] }] }
]

// 列表接口所需的数据结构（与黑马 hmajax 接口字段保持一致）
export const provinceList = provinces.map((p, i) => ({ id: i + 1, proId: p.proId, proName: p.proName }))

let citySeq = 1
export const cityList = []
export const areaList = []
let areaSeq = 1
for (const p of provinces) {
  for (const c of p.cities) {
    cityList.push({ id: citySeq++, cityId: c.cityId, cityName: c.cityName, proId: p.proId })
    c.areas.forEach((name, i) => {
      areaList.push({ id: areaSeq++, areaId: c.cityId.slice(0, 4) + String(i + 1).padStart(2, '0'), areaName: name, cityId: c.cityId })
    })
  }
}

const proNameMap = new Map(provinceList.map((p) => [p.proId, p.proName]))
const cityNameMap = new Map(cityList.map((c) => [c.cityId, c.cityName]))
const areaNameMap = new Map(areaList.map((a) => [a.areaId, a.areaName]))

export function lookupLocation(provinceCode, cityCode, countyCode) {
  return [proNameMap.get(provinceCode), cityNameMap.get(cityCode), areaNameMap.get(countyCode)].filter(Boolean).join(' ')
}
