// MySQL 存储驱动：DB_DRIVER=mysql 时启用
// 表结构在首次启动时自动创建，空库会自动写入演示数据
// mysql2 采用动态 import：不用 MySQL 的部署（默认 json 模式）不需要安装这个依赖
import { buildSeedData } from './seed.js'

export const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    account VARCHAR(64) NOT NULL,
    password VARCHAR(128) NOT NULL,
    nickname VARCHAR(64) NULL,
    avatar VARCHAR(255) NULL,
    gender VARCHAR(16) NULL,
    mobile VARCHAR(32) NULL,
    token VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_account (account),
    KEY idx_token (token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS addresses (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    receiver VARCHAR(64) NULL,
    contact VARCHAR(32) NULL,
    province_code VARCHAR(16) NULL,
    city_code VARCHAR(16) NULL,
    county_code VARCHAR(16) NULL,
    address VARCHAR(255) NULL,
    is_default TINYINT NOT NULL DEFAULT 1,
    full_location VARCHAR(128) NULL,
    postal_code VARCHAR(16) NULL,
    address_tags VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS carts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    sku_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NULL,
    attrs_text VARCHAR(255) NULL,
    picture VARCHAR(255) NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    now_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    now_original_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selected TINYINT NOT NULL DEFAULT 1,
    stock INT NOT NULL DEFAULT 0,
    count INT NOT NULL DEFAULT 1,
    is_effective TINYINT NOT NULL DEFAULT 1,
    post_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    specs_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_sku (user_id, sku_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    create_time DATETIME NULL,
    close_time DATETIME NULL,
    pay_latest_time DATETIME NULL,
    pay_time DATETIME NULL,
    end_time DATETIME NULL,
    consign_time DATETIME NULL,
    evaluation_time DATETIME NULL,
    order_state INT NOT NULL DEFAULT 1,
    pay_state INT NOT NULL DEFAULT 0,
    pay_type INT NOT NULL DEFAULT 1,
    pay_channel INT NOT NULL DEFAULT 1,
    delivery_time_type INT NOT NULL DEFAULT 1,
    buyer_message VARCHAR(255) NULL,
    receiver VARCHAR(64) NULL,
    contact VARCHAR(32) NULL,
    full_location VARCHAR(128) NULL,
    receiver_address VARCHAR(255) NULL,
    province_code VARCHAR(16) NULL,
    city_code VARCHAR(16) NULL,
    county_code VARCHAR(16) NULL,
    post_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_money DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_num INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_state (user_id, order_state),
    KEY idx_create_time (create_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL,
    sku_id VARCHAR(64) NULL,
    name VARCHAR(255) NULL,
    image VARCHAR(255) NULL,
    attrs_text VARCHAR(255) NULL,
    properties_json JSON NULL,
    quantity INT NOT NULL DEFAULT 1,
    cur_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    real_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
    spu_id VARCHAR(32) NULL,
    sort INT NOT NULL DEFAULT 0,
    KEY idx_order (order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS counters (
    name VARCHAR(32) NOT NULL PRIMARY KEY,
    value BIGINT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
]

export async function createMysqlStore({ host, port, user, password, database }) {
  let mysql
  try {
    mysql = await import('mysql2/promise')
  } catch {
    throw new Error('使用 MySQL 需要先安装依赖：cd server && npm install mysql2')
  }
  const cfg = { host, port: Number(port) || 3306, user, password, database, charset: 'utf8mb4', dateStrings: true, connectionLimit: 5 }
  let pool = null

  const cartRow = (r, userId) => ({
    id: r.sku_id,
    skuId: r.sku_id,
    userId,
    name: r.name,
    attrsText: r.attrs_text,
    specs: r.specs_json || [],
    picture: r.picture,
    price: Number(r.price).toFixed(2),
    nowPrice: Number(r.now_price).toFixed(2),
    nowOriginalPrice: Number(r.now_original_price).toFixed(2),
    selected: !!r.selected,
    stock: r.stock,
    count: r.count,
    isEffective: !!r.is_effective,
    discount: null,
    isCollect: false,
    postFee: Number(r.post_fee)
  })

  const addressRow = (r) => ({
    id: r.id,
    receiver: r.receiver,
    contact: r.contact,
    provinceCode: r.province_code,
    cityCode: r.city_code,
    countyCode: r.county_code,
    address: r.address,
    isDefault: r.is_default,
    fullLocation: r.full_location,
    postalCode: r.postal_code,
    addressTags: r.address_tags
  })

  function orderRow(r, items) {
    return {
      id: r.id,
      createTime: r.create_time,
      closeTime: r.close_time,
      payLatestTime: r.pay_latest_time,
      payTime: r.pay_time,
      endTime: r.end_time,
      consignTime: r.consign_time,
      evaluationTime: r.evaluation_time,
      orderState: r.order_state,
      payState: r.pay_state,
      payType: r.pay_type,
      payChannel: r.pay_channel,
      deliveryTimeType: r.delivery_time_type,
      buyerMessage: r.buyer_message || '',
      address: {
        receiver: r.receiver,
        contact: r.contact,
        fullLocation: r.full_location,
        receiverAddress: r.receiver_address,
        provinceCode: r.province_code,
        cityCode: r.city_code,
        countyCode: r.county_code
      },
      postFee: Number(r.post_fee),
      totalMoney: Number(r.total_money),
      totalNum: r.total_num,
      skus: (items || []).map((it) => ({
        id: it.sku_id,
        name: it.name,
        image: it.image,
        attrsText: it.attrs_text,
        properties: it.properties_json || [],
        quantity: it.quantity,
        curPrice: Number(it.cur_price),
        realPay: Number(it.real_pay),
        spuId: it.spu_id
      }))
    }
  }

  const orderParams = (userId, o) => [
    o.id, userId, o.createTime, o.closeTime, o.payLatestTime, o.payTime, o.endTime, o.consignTime, o.evaluationTime,
    o.orderState, o.payState, o.payType, o.payChannel, o.deliveryTimeType, o.buyerMessage || '',
    o.address.receiver, o.address.contact, o.address.fullLocation, o.address.receiverAddress,
    o.address.provinceCode, o.address.cityCode, o.address.countyCode,
    Number(o.postFee), Number(o.totalMoney), o.totalNum
  ]

  const ORDER_COLS = 'id,user_id,create_time,close_time,pay_latest_time,pay_time,end_time,consign_time,evaluation_time,' +
    'order_state,pay_state,pay_type,pay_channel,delivery_time_type,buyer_message,' +
    'receiver,contact,full_location,receiver_address,province_code,city_code,county_code,post_fee,total_money,total_num'

  async function insertItems(conn, order) {
    let sort = 0
    for (const s of order.skus || []) {
      await conn.execute(
        'INSERT INTO order_items (order_id,sku_id,name,image,attrs_text,properties_json,quantity,cur_price,real_pay,spu_id,sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [order.id, s.id, s.name, s.image, s.attrsText, JSON.stringify(s.properties || []), s.quantity, Number(s.curPrice), Number(s.realPay), s.spuId, sort++]
      )
    }
  }

  async function loadItems(orderId) {
    const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ? ORDER BY sort, id', [orderId])
    return rows
  }

  async function nextSeq(name, startAt) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute('INSERT INTO counters (name, value) VALUES (?, 1) ON DUPLICATE KEY UPDATE value = value + 1', [name])
      const [rows] = await conn.execute('SELECT value FROM counters WHERE name = ?', [name])
      await conn.commit()
      return Number(rows[0].value)
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }

  return {
    driver: 'mysql',
    async init() {
      // 库不存在就先建库
      const boot = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, charset: 'utf8mb4' })
      await boot.query('CREATE DATABASE IF NOT EXISTS `' + cfg.database + '` DEFAULT CHARACTER SET utf8mb4')
      await boot.end()

      pool = mysql.createPool(cfg)
      for (const sql of MYSQL_SCHEMA) await pool.query(sql)

      // 空库自动写入演示数据
      const [cnt] = await pool.execute('SELECT COUNT(*) AS n FROM users')
      if (Number(cnt[0].n) === 0) {
        const seed = buildSeedData()
        for (const u of seed.users) {
          await pool.execute('INSERT INTO users (id,account,password,nickname,avatar,gender,mobile,token) VALUES (?,?,?,?,?,?,?,?)',
            [u.id, u.account, u.password, u.nickname, u.avatar, u.gender, u.mobile, u.token])
        }
        for (const [userId, list] of Object.entries(seed.addresses)) {
          for (const a of list) {
            await pool.execute('INSERT INTO addresses (id,user_id,receiver,contact,province_code,city_code,county_code,address,is_default,full_location,postal_code,address_tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
              [a.id, userId, a.receiver, a.contact, a.provinceCode, a.cityCode, a.countyCode, a.address, a.isDefault, a.fullLocation, a.postalCode, a.addressTags])
          }
        }
        for (const [userId, list] of Object.entries(seed.orders)) {
          for (const o of list) {
            await pool.execute('INSERT INTO orders (' + ORDER_COLS + ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', orderParams(userId, o))
            await insertItems(pool, o)
          }
        }
        await pool.execute('INSERT IGNORE INTO counters (name, value) VALUES (?, ?), (?, ?)', ['user', seed.seq.user, 'order', seed.seq.order])
        console.log('[mysql] 空库已写入演示数据')
      }
      // 保证计数器存在
      await pool.execute('INSERT IGNORE INTO counters (name, value) VALUES (?, ?), (?, ?)', ['user', 1000, 'order', 0])
      return { host: cfg.host, port: cfg.port, database: cfg.database, tables: MYSQL_SCHEMA.length }
    },
    async close() { if (pool) await pool.end() },

    // ---- 用户 ----
    async findUserByAccount(account) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE account = ? LIMIT 1', [account])
      return rows[0] || null
    },
    async findUserByToken(token) {
      const [rows] = await pool.execute('SELECT * FROM users WHERE token = ? LIMIT 1', [token])
      return rows[0] || null
    },
    async nextUserSeq() { return nextSeq('user', 1000) },
    async createUser(user) {
      await pool.execute('INSERT INTO users (id,account,password,nickname,avatar,gender,mobile,token) VALUES (?,?,?,?,?,?,?,?)',
        [user.id, user.account, user.password, user.nickname, user.avatar, user.gender, user.mobile, user.token || ''])
      return user
    },
    async updateUserToken(userId, token) {
      await pool.execute('UPDATE users SET token = ? WHERE id = ?', [token, userId])
    },

    // ---- 购物车 ----
    async listCart(userId) {
      const [rows] = await pool.execute('SELECT * FROM carts WHERE user_id = ? ORDER BY id', [userId])
      return rows.map((r) => cartRow(r, userId))
    },
    async findCartItem(userId, skuId) {
      const [rows] = await pool.execute('SELECT * FROM carts WHERE user_id = ? AND sku_id = ? LIMIT 1', [userId, skuId])
      return rows[0] ? cartRow(rows[0], userId) : null
    },
    async insertCartItem(userId, item) {
      await pool.execute(
        'INSERT INTO carts (user_id,sku_id,name,attrs_text,picture,price,now_price,now_original_price,selected,stock,count,is_effective,post_fee,specs_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [userId, item.skuId, item.name, item.attrsText, item.picture, Number(item.price), Number(item.nowPrice),
         Number(item.nowOriginalPrice), item.selected ? 1 : 0, item.stock, item.count, item.isEffective ? 1 : 0,
         Number(item.postFee), JSON.stringify(item.specs || [])]
      )
      return item
    },
    async updateCartItemCount(userId, skuId, count) {
      await pool.execute('UPDATE carts SET count = ? WHERE user_id = ? AND sku_id = ?', [count, userId, skuId])
      return this.findCartItem(userId, skuId)
    },
    async updateCartSelected(userId, skuIds, selected) {
      if (!skuIds.length) return
      const marks = skuIds.map(() => '?').join(',')
      await pool.execute('UPDATE carts SET selected = ? WHERE user_id = ? AND sku_id IN (' + marks + ')', [selected ? 1 : 0, userId, ...skuIds])
    },
    async deleteCartItems(userId, skuIds) {
      if (!skuIds.length) return
      const marks = skuIds.map(() => '?').join(',')
      await pool.execute('DELETE FROM carts WHERE user_id = ? AND sku_id IN (' + marks + ')', [userId, ...skuIds])
    },

    // ---- 收货地址 ----
    async listAddresses(userId) {
      const [rows] = await pool.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default, id', [userId])
      return rows.map(addressRow)
    },
    async findAddress(userId, id) {
      const [rows] = await pool.execute('SELECT * FROM addresses WHERE user_id = ? AND id = ? LIMIT 1', [userId, id])
      return rows[0] ? addressRow(rows[0]) : null
    },
    async insertAddress(userId, a) {
      await pool.execute('INSERT INTO addresses (id,user_id,receiver,contact,province_code,city_code,county_code,address,is_default,full_location,postal_code,address_tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [a.id, userId, a.receiver, a.contact, a.provinceCode, a.cityCode, a.countyCode, a.address, a.isDefault, a.fullLocation, a.postalCode, a.addressTags])
      return a
    },
    async updateAddress(userId, id, patch) {
      const fields = []
      const values = []
      const map = { receiver: 'receiver', contact: 'contact', provinceCode: 'province_code', cityCode: 'city_code', countyCode: 'county_code', address: 'address', isDefault: 'is_default', fullLocation: 'full_location', postalCode: 'postal_code', addressTags: 'address_tags' }
      for (const [k, col] of Object.entries(map)) {
        if (patch[k] !== undefined) { fields.push(col + ' = ?'); values.push(patch[k]) }
      }
      if (fields.length) await pool.execute('UPDATE addresses SET ' + fields.join(', ') + ' WHERE user_id = ? AND id = ?', [...values, userId, id])
      return this.findAddress(userId, id)
    },
    async deleteAddress(userId, id) { await pool.execute('DELETE FROM addresses WHERE user_id = ? AND id = ?', [userId, id]) },
    async setDefaultAddress(userId, id) {
      await pool.execute('UPDATE addresses SET is_default = IF(id = ?, 0, 1) WHERE user_id = ?', [id, userId])
    },

    // ---- 订单 ----
    async nextOrderSeq() { return nextSeq('order', 0) },
    async listOrders(userId, { state = 0, page = 1, pageSize = 2 } = {}) {
      const where = state ? ' WHERE user_id = ? AND order_state = ?' : ' WHERE user_id = ?'
      const args = state ? [userId, state] : [userId]
      const [cnt] = await pool.execute('SELECT COUNT(*) AS n FROM orders' + where, args)
      const counts = Number(cnt[0].n)
      const [rows] = await pool.execute(
        'SELECT * FROM orders' + where + ' ORDER BY create_time DESC, id DESC LIMIT ? OFFSET ?',
        [...args, Number(pageSize), (Math.max(1, page) - 1) * Number(pageSize)]
      )
      const items = []
      for (const r of rows) items.push(orderRow(r, await loadItems(r.id)))
      return { counts, items }
    },
    async findOrder(userId, orderId) {
      const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ? AND id = ? LIMIT 1', [userId, orderId])
      if (!rows[0]) return null
      return orderRow(rows[0], await loadItems(orderId))
    },
    async findOrderAnyUser(orderId) {
      const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId])
      if (!rows[0]) return null
      return orderRow(rows[0], await loadItems(orderId))
    },
    async insertOrder(userId, order) {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        await conn.execute('INSERT INTO orders (' + ORDER_COLS + ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', orderParams(userId, order))
        await insertItems(conn, order)
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }
    },
    async stats() {
      const [rows] = await pool.query(
        'SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM addresses) AS addresses, ' +
        '(SELECT COUNT(*) FROM carts) AS carts, (SELECT COUNT(*) FROM orders) AS orders'
      )
      return {
        users: Number(rows[0].users),
        addresses: Number(rows[0].addresses),
        carts: Number(rows[0].carts),
        orders: Number(rows[0].orders)
      }
    },
    async updateOrder(order) {
      await pool.execute(
        'UPDATE orders SET order_state = ?, pay_state = ?, pay_time = ?, close_time = ?, consign_time = ?, end_time = ?, evaluation_time = ? WHERE id = ?',
        [order.orderState, order.payState, order.payTime, order.closeTime, order.consignTime, order.endTime, order.evaluationTime, order.id]
      )
    }
  }
}
