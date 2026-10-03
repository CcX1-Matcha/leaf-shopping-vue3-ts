# vue-leaf-shopping

技术栈： Vue3、Pinia、Vite、TypeScript、Element-UI Plus.
代码规范：ESlint、prettier.

## 推荐 IDE 配置

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (禁用vetur).

## 推荐浏览器配置

- 基于 Chromium 的浏览器（Chrome、Edge、Brave 等）：
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox 浏览器：
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## 项目接口（本地后端）

本项目内置了零依赖的 Node.js 后端（server/ 目录），不再依赖黑马远程接口。

- 启动后端：pnpm server（默认端口 3000，可用环境变量 PORT 修改）
- 前端通过根目录 .env 中的 VITE_API_BASE 访问后端（默认 http://localhost:3000）
- 接口一览页面：http://localhost:3000/
- 测试账号：xiaotuxian001 / 123456（任意账号 + 6 位以上密码均可自动注册）
- 数据持久化在 server/data/db.json，删除该文件即可重置演示数据
- 商品图已从网上抓取真实商品照片（淘宝/天猫/1688 等来源），存放在 server/public/images/，离线可用
- 重新抓图：cd server && node tools/fetch-goods-images.mjs（支持 --limit=5 / --only=g1001 / --skip-cat）
- 没抓到图的商品、以及轮播图/头像，自动回退为动态生成的 SVG 占位图


## 项目设置

```sh
pnpm install
```

### 开发环境编译及热重载

```sh
pnpm run dev
```

### 使用 ESLint 进行代码检查

```sh
pnpm lint-staged
```
