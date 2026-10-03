// JSON 文件存储：数据放在 data/db.json（默认驱动，零依赖）
import fs from 'node:fs'
import path from 'node:path'
import { buildSeedData, parseTs } from './seed.js'

export function createJsonStore({ dbFile }) {
  let db = null

  function save() {
    try {
      fs.mkdirSync(path.dirname(dbFile), { recursive: true })
      fs.writeFileSync(dbFile, JSON.stringify(db, null, 2))
    } catch (e) {
      console.warn('[db] 写入失败，本次运行将以内存模式继续:', e.message)
    }
  }

  const cart = (userId) => (db.carts[userId] = db.carts[userId] || [])
  const addr = (userId) => (db.addresses[userId] = db.addresses[userId] || [])
  const orders = (userId) => (db.orders[userId] = db.orders[userId] || [])

  return {
    driver: 'json',
    async init() {
      if (fs.existsSync(dbFile)) {
        try {
          db = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
        } catch (e) {
          console.warn('[db] 数据文件解析失败，将重新初始化:', e.message)
          db = null
        }
      }
      if (!db) {
        db = buildSeedData()
        save()
      }
      return { file: dbFile }
    },
    async close() { save() },

    // ---- 用户 ----
    async findUserByAccount(account) { return db.users.find((u) => u.account === account) || null },
    async findUserByToken(token) { return db.users.find((u) => u.token && u.token === token) || null },
    async nextUserSeq() { db.seq.user += 1; return db.seq.user },
    async createUser(user) { db.users.push(user); save(); return user },
    async updateUserToken(userId, token) {
      const u = db.users.find((x) => x.id === userId)
      if (u) { u.token = token; save() }
    },

    // ---- 购物车 ----
    async listCart(userId) { return cart(userId) },
    async findCartItem(userId, skuId) { return cart(userId).find((i) => i.skuId === skuId) || null },
    async insertCartItem(userId, item) { cart(userId).push(item); save() },
    async updateCartItemCount(userId, skuId, count) {
      const item = cart(userId).find((i) => i.skuId === skuId)
      if (!item) return null
      item.count = count
      save()
      return item
    },
    async updateCartSelected(userId, skuIds, selected) {
      for (const i of cart(userId)) if (skuIds.includes(i.skuId)) i.selected = selected
      save()
    },
    async deleteCartItems(userId, skuIds) {
      db.carts[userId] = cart(userId).filter((i) => !skuIds.includes(i.skuId))
      save()
    },

    // ---- 收货地址 ----
    async listAddresses(userId) { return [...addr(userId)].sort((a, b) => a.isDefault - b.isDefault) },
    async findAddress(userId, id) { return addr(userId).find((a) => a.id === id) || null },
    async insertAddress(userId, address) { addr(userId).push(address); save(); return address },
    async updateAddress(userId, id, patch) {
      const item = addr(userId).find((a) => a.id === id)
      if (!item) return null
      Object.assign(item, patch)
      save()
      return item
    },
    async deleteAddress(userId, id) { db.addresses[userId] = addr(userId).filter((a) => a.id !== id); save() },
    async setDefaultAddress(userId, id) {
      for (const a of addr(userId)) a.isDefault = a.id === id ? 0 : 1
      save()
    },

    // ---- 订单 ----
    async nextOrderSeq() { db.seq.order += 1; return db.seq.order },
    async listOrders(userId, { state = 0, page = 1, pageSize = 2 } = {}) {
      let list = orders(userId)
      if (state) list = list.filter((o) => o.orderState === state)
      list = [...list].sort((a, b) => parseTs(b.createTime) - parseTs(a.createTime))
      const counts = list.length
      const size = Number(pageSize) || 2
      const items = list.slice((Math.max(1, page) - 1) * size, Math.max(1, page) * size)
      return { counts, items }
    },
    async findOrder(userId, orderId) { return orders(userId).find((o) => o.id === orderId) || null },
    async findOrderAnyUser(orderId) {
      for (const list of Object.values(db.orders)) {
        const found = list.find((o) => o.id === orderId)
        if (found) return found
      }
      return null
    },
    async insertOrder(userId, order) { orders(userId).unshift(order); save() },
    async stats() {
      return {
        users: db.users.length,
        addresses: Object.values(db.addresses).flat().length,
        carts: Object.values(db.carts).flat().length,
        orders: Object.values(db.orders).flat().length
      }
    },
    async updateOrder(order) { save() }
  }
}
