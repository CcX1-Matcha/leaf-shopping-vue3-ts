/**
 * 把 data/db.json 里的数据迁移到 MySQL（可重复执行，按主键覆盖）
 *
 * 用法：
 *   DB_DRIVER=mysql MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 MYSQL_USER=root \
 *   MYSQL_PASSWORD=你的密码 MYSQL_DATABASE=leaf_shopping \
 *   node tools/migrate-json-to-mysql.mjs
 *
 * 可选参数：
 *   --file=../data/db.json   指定源文件（默认 server/data/db.json）
 *   --dry-run                只统计不写入
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MYSQL_SCHEMA } from '../src/store/mysql-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const argFile = process.argv.find((a) => a.startsWith('--file='))
const dryRun = process.argv.includes('--dry-run')
const dbFile = argFile ? path.resolve(argFile.split('=')[1]) : path.join(__dirname, '..', 'data', 'db.json')

const cfg = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'leaf_shopping'
}

if (!fs.existsSync(dbFile)) {
  console.error('❌ 找不到源文件: ' + dbFile)
  process.exit(1)
}
const src = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
const stats = { users: 0, addresses: 0, carts: 0, orders: 0, orderItems: 0 }

console.log('源文件: ' + dbFile)
console.log('目标库: ' + cfg.user + '@' + cfg.host + ':' + cfg.port + '/' + cfg.database)
console.log('待迁移: 用户 ' + (src.users || []).length + ' 个，地址 ' + Object.values(src.addresses || {}).flat().length +
  ' 条，购物车 ' + Object.values(src.carts || {}).flat().length + ' 项，订单 ' + Object.values(src.orders || {}).flat().length + ' 单')
if (dryRun) {
  console.log('(--dry-run 模式，不写入)')
  process.exit(0)
}

let mysql
try {
  mysql = await import('mysql2/promise')
} catch {
  console.error('❌ 缺少依赖，请先执行：cd server && npm install mysql2')
  process.exit(1)
}

const boot = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, charset: 'utf8mb4' })
await boot.query('CREATE DATABASE IF NOT EXISTS `' + cfg.database + '` DEFAULT CHARACTER SET utf8mb4')
await boot.end()

const conn = await mysql.createConnection({ ...cfg, charset: 'utf8mb4', dateStrings: true, multipleStatements: true })
for (const sql of MYSQL_SCHEMA) await conn.query(sql)
console.log('✅ 表结构就绪')

for (const u of src.users || []) {
  await conn.execute(
    'INSERT INTO users (id,account,password,nickname,avatar,gender,mobile,token) VALUES (?,?,?,?,?,?,?,?) ' +
    'ON DUPLICATE KEY UPDATE account=VALUES(account), password=VALUES(password), nickname=VALUES(nickname), ' +
    'avatar=VALUES(avatar), gender=VALUES(gender), mobile=VALUES(mobile), token=VALUES(token)',
    [u.id, u.account, u.password, u.nickname ?? null, u.avatar ?? null, u.gender ?? null, u.mobile ?? null, u.token ?? '']
  )
  stats.users++
}

for (const [userId, list] of Object.entries(src.addresses || {})) {
  for (const a of list) {
    await conn.execute(
      'INSERT INTO addresses (id,user_id,receiver,contact,province_code,city_code,county_code,address,is_default,full_location,postal_code,address_tags) ' +
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE receiver=VALUES(receiver), contact=VALUES(contact), ' +
      'province_code=VALUES(province_code), city_code=VALUES(city_code), county_code=VALUES(county_code), address=VALUES(address), ' +
      'is_default=VALUES(is_default), full_location=VALUES(full_location), postal_code=VALUES(postal_code), address_tags=VALUES(address_tags)',
      [a.id, userId, a.receiver ?? null, a.contact ?? null, a.provinceCode ?? null, a.cityCode ?? null, a.countyCode ?? null,
       a.address ?? null, a.isDefault ?? 1, a.fullLocation ?? null, a.postalCode ?? null, a.addressTags ?? null]
    )
    stats.addresses++
  }
}

for (const [userId, list] of Object.entries(src.carts || {})) {
  for (const i of list) {
    await conn.execute(
      'INSERT INTO carts (user_id,sku_id,name,attrs_text,picture,price,now_price,now_original_price,selected,stock,count,is_effective,post_fee,specs_json) ' +
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), attrs_text=VALUES(attrs_text), ' +
      'picture=VALUES(picture), price=VALUES(price), now_price=VALUES(now_price), now_original_price=VALUES(now_original_price), ' +
      'selected=VALUES(selected), stock=VALUES(stock), count=VALUES(count), is_effective=VALUES(is_effective), post_fee=VALUES(post_fee), specs_json=VALUES(specs_json)',
      [userId, i.skuId, i.name ?? null, i.attrsText ?? null, i.picture ?? null, Number(i.price) || 0, Number(i.nowPrice) || 0,
       Number(i.nowOriginalPrice) || 0, i.selected ? 1 : 0, i.stock ?? 0, i.count ?? 1, i.isEffective ? 1 : 0, Number(i.postFee) || 0,
       JSON.stringify(i.specs || [])]
    )
    stats.carts++
  }
}

for (const [userId, list] of Object.entries(src.orders || {})) {
  for (const o of list) {
    await conn.execute(
      'INSERT INTO orders (id,user_id,create_time,close_time,pay_latest_time,pay_time,end_time,consign_time,evaluation_time,' +
      'order_state,pay_state,pay_type,pay_channel,delivery_time_type,buyer_message,receiver,contact,full_location,receiver_address,' +
      'province_code,city_code,county_code,post_fee,total_money,total_num) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ' +
      'ON DUPLICATE KEY UPDATE order_state=VALUES(order_state), pay_state=VALUES(pay_state), pay_time=VALUES(pay_time), ' +
      'close_time=VALUES(close_time), consign_time=VALUES(consign_time), end_time=VALUES(end_time), evaluation_time=VALUES(evaluation_time)',
      [o.id, userId, o.createTime, o.closeTime, o.payLatestTime, o.payTime, o.endTime, o.consignTime, o.evaluationTime,
       o.orderState, o.payState, o.payType, o.payChannel, o.deliveryTimeType, o.buyerMessage || '',
       o.address?.receiver ?? null, o.address?.contact ?? null, o.address?.fullLocation ?? null, o.address?.receiverAddress ?? null,
       o.address?.provinceCode ?? null, o.address?.cityCode ?? null, o.address?.countyCode ?? null,
       Number(o.postFee) || 0, Number(o.totalMoney) || 0, o.totalNum ?? 0]
    )
    await conn.execute('DELETE FROM order_items WHERE order_id = ?', [o.id])
    let sort = 0
    for (const s of o.skus || []) {
      await conn.execute(
        'INSERT INTO order_items (order_id,sku_id,name,image,attrs_text,properties_json,quantity,cur_price,real_pay,spu_id,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [o.id, s.id, s.name ?? null, s.image ?? null, s.attrsText ?? null, JSON.stringify(s.properties || []),
         s.quantity ?? 1, Number(s.curPrice) || 0, Number(s.realPay) || 0, s.spuId ?? null, sort++]
      )
      stats.orderItems++
    }
    stats.orders++
  }
}

// 计数器取源文件与库里的较大值，保证后续新订单号不重复
const seq = src.seq || {}
await conn.execute('INSERT INTO counters (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=GREATEST(value, VALUES(value))', ['user', seq.user ?? 1000])
await conn.execute('INSERT INTO counters (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=GREATEST(value, VALUES(value))', ['order', seq.order ?? 0])

const [rows] = await conn.query(
  'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM addresses) AS addresses, ' +
  '(SELECT COUNT(*) FROM carts) AS carts, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM order_items) AS order_items'
)
await conn.end()

console.log('\n本次写入: ' + JSON.stringify(stats))
console.log('库中当前: ' + JSON.stringify(rows[0]))
console.log('\n✅ 迁移完成。用 MySQL 启动后端：')
console.log('   DB_DRIVER=mysql MYSQL_HOST=' + cfg.host + ' MYSQL_PORT=' + cfg.port + ' MYSQL_USER=' + cfg.user +
  ' MYSQL_PASSWORD=*** MYSQL_DATABASE=' + cfg.database + ' node src/index.js')
