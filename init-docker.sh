#!/usr/bin/env bash
# ============================================================
#  小兔鲜商城 · Docker 初始化脚本（阿里云 ECS 用）
#  作用：在项目根目录生成 Dockerfile / docker-compose.yml /
#        nginx.conf / .dockerignore 四个文件
#  用法：
#    bash init-docker.sh          # 只生成文件
#    bash init-docker.sh --up     # 生成后直接构建并启动容器
# ============================================================
set -euo pipefail

# ---------- 1. 定位项目根目录 ----------
if [ -f "./server/src/index.js" ]; then
  :
elif [ -f "./leaf-shopping-vue3-ts-main/server/src/index.js" ]; then
  cd leaf-shopping-vue3-ts-main
else
  echo "❌ 未找到项目文件，请在项目根目录（含 server/ 、src/ 的那一层）执行本脚本"
  exit 1
fi
echo "📁 项目目录: $(pwd)"
echo

# ---------- 2. 备份同名文件 ----------
for f in Dockerfile docker-compose.yml nginx.conf .dockerignore; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    echo "ℹ️  $f 已存在，已备份为 $f.bak"
  fi
done
echo
# ---------- 生成 Dockerfile ----------
cat > Dockerfile <<'__LEAF_EOF__'
# 多阶段构建：web-builder 构建前端 -> api 运行后端 -> web 用 nginx 托管前端并反向代理接口
# 构建：docker compose build    运行：docker compose up -d

# ================= 1. 前端构建 =================
FROM node:22-alpine AS web-builder
WORKDIR /build
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
# 关键：接口地址用同源的 /api 前缀，由 nginx 反代到后端。这样镜像里不写死 IP，
# 换服务器、换端口都不用重新构建。
RUN rm -f .env .env.production .env.local \
 && VITE_API_BASE=/api npm run build-only

# ================= 2. 后端（零依赖，无需装包） =================
FROM node:22-alpine AS api
# tzdata 让订单时间按东八区显示
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Shanghai
COPY server/ ./
EXPOSE 3000
CMD ["node", "src/index.js"]

# ================= 3. 前端静态托管 + 反向代理 =================
FROM nginx:alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /build/dist /usr/share/nginx/html
EXPOSE 80
__LEAF_EOF__

# ---------- 生成 docker-compose.yml ----------
cat > docker-compose.yml <<'__LEAF_EOF__'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: api
    image: leaf-shopping-api:latest
    container_name: leaf-api
    restart: unless-stopped
    environment:
      PORT: 3000
      TZ: Asia/Shanghai
    volumes:
      # 订单/购物车/地址等数据持久化，容器重建不丢
      - leaf-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
    # 需要直连后端调试时打开（浏览器访问 http://服务器IP:3000）
    # ports:
    #   - "3000:3000"

  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: web
    image: leaf-shopping-web:latest
    container_name: leaf-web
    restart: unless-stopped
    depends_on:
      - api
    ports:
      # 左边是宿主机端口，想用 80 就改成 "80:80"
      - "8080:80"

volumes:
  leaf-data:
__LEAF_EOF__

# ---------- 生成 nginx.conf ----------
cat > nginx.conf <<'__LEAF_EOF__'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_min_length 1k;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # 接口：/api/xxx  ->  后端 /xxx
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }

    # 商品图片：后端返回的是绝对地址 http://<当前访问的域名>/img/...，
    # 所以这里也要把 /img/ 转给后端
    location /img/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 单页应用路由：找不到的路径一律回退 index.html，否则刷新页面 404
    location / {
        try_files $uri $uri/ /index.html;
    }
}
__LEAF_EOF__

# ---------- 生成 .dockerignore ----------
cat > .dockerignore <<'__LEAF_EOF__'
node_modules
dist
.git
.gitignore
.husky
.vscode
*.zip
*.log
.env.local
DEPLOY-Linux.md
DEPLOY-Docker.md
README.md
__LEAF_EOF__

# ---------- 3. 检查结果 ----------
echo "✅ 四个文件已生成："
ls -l Dockerfile docker-compose.yml nginx.conf .dockerignore
echo

if command -v docker > /dev/null 2>&1; then
  if docker compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml 语法校验通过"
  else
    echo "⚠️  docker compose config 校验失败，请检查 docker-compose.yml"
  fi
else
  echo "⚠️  未检测到 docker 命令，记得先安装 Docker 并配置镜像加速"
fi
echo

# ---------- 4. 可选：直接构建启动 ----------
if [ "$#" -gt 0 ] && [ "$1" = "--up" ]; then
  echo "🚀 开始构建并启动（首次约 2~4 分钟）..."
  docker compose up -d --build
  echo
  docker compose ps
  echo
  echo "🎉 完成，浏览器访问： http://<你的ECS公网IP>:8080"
  echo "   演示账号： xiaotuxian001 / 123456"
else
  echo "👉 下一步执行："
  echo "   sudo docker compose up -d --build"
  echo "   sudo docker compose ps"
  echo "   curl -I http://127.0.0.1:8080/"
  echo
  echo "   （也可以直接： bash init-docker.sh --up 一步到位）"
fi
