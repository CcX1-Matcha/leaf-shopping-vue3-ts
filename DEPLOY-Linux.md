# 部署到云 Linux 主机

## 一、环境要求
- Node.js 20.19+ 或 22.12+（推荐 22 LTS）：`node -v` 检查
- pnpm 或 npm 均可
- 可选：nginx（托管前端静态文件）

## 二、上传解压
```bash
scp leaf-shopping-vue3-ts-main.zip root@<公网IP>:/opt/
ssh root@<公网IP>
cd /opt && unzip -q leaf-shopping-vue3-ts-main.zip -d leaf-shopping
cd leaf-shopping
```
压缩包里**不含 node_modules**（Windows 版依赖在 Linux 上不能用），必须重新安装。

## 三、安装依赖
```bash
npm install        # 或 pnpm install
```

## 四、启动后端（默认 3000 端口）
```bash
cd server
PORT=3000 nohup node src/index.js > /opt/leaf-shopping/server.log 2>&1 &
curl http://127.0.0.1:3000/     # 返回接口一览页就说明成功了
```
用 pm2 常驻（推荐）：
```bash
npm i -g pm2
pm2 start /opt/leaf-shopping/server/src/index.js --name leaf-api
pm2 save && pm2 startup
```

## 五、构建并托管前端
**关键**：前端接口地址必须填云主机的公网地址，不能是 localhost（否则浏览器会去访问你自己的电脑）。
```bash
cd /opt/leaf-shopping
echo "VITE_API_BASE=http://<公网IP>:3000" > .env.production
npm run build                  # 产物在 dist/
```
nginx 托管 dist（/etc/nginx/conf.d/leaf.conf）：
```nginx
server {
    listen 80;
    server_name _;
    root /opt/leaf-shopping/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }   # 必须有，否则刷新页面 404
}
```
```bash
nginx -t && systemctl reload nginx
```
不想装 nginx 也可以临时预览：`npx vite preview --host 0.0.0.0 --port 4173`

## 六、安全组放行
云主机安全组需放行 80（前端）和 3000（后端）。若只想暴露 80，可用 nginx 反代 3000：
```nginx
location /api/ { proxy_pass http://127.0.0.1:3000/; }
```
此时 .env.production 写 `VITE_API_BASE=http://<公网IP>/api`。

## 七、常见问题
| 现象 | 原因 / 解决 |
|---|---|
| 页面空白 | 前端构建时 VITE_API_BASE 用了 localhost，改成公网 IP 后重新 `npm run build` |
| 刷新页面 404 | nginx 少了 `try_files ... /index.html` 那段 |
| 图片显示不出来 | 商品图由后端提供（server/public/images），确认浏览器能访问 `http://公网IP:3000/img/goods/g1001.svg` |
| 接口报跨域 | 后端已允许所有来源跨域，一般是地址写错或端口没放行 |
| 3000 端口被占用 | 换端口启动：`PORT=3001 node src/index.js`（前端 .env.production 同步改） |

## 八、演示信息
- 演示账号：`xiaotuxian001` / `123456`（任意账号 + 6 位以上密码可自动注册）
- 数据文件：`server/data/db.json`，删掉后重启即重置为初始演示数据
- 接口一览：`http://公网IP:3000/`
