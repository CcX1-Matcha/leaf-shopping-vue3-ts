#!/usr/bin/env bash
# ============================================================
#  小兔鲜商城 · Docker 初始化脚本（阿里云 ECS · 单容器方案）
#  生成：Dockerfile / Dockerfile.build / docker-compose.yml / .dockerignore
#  默认用容器内 JSON 文件存数据；配好 .env 里的 MYSQL_* 并把
#  DB_DRIVER 设为 mysql，即可改用 MySQL（详见 DEPLOY-Docker.md）
#  用法：
#    bash init-docker.sh          # 只生成文件
#    bash init-docker.sh --up     # 生成后直接构建并启动
# ============================================================
set -euo pipefail

if [ -f "./server/src/index.js" ]; then
  :
elif [ -f "./leaf-shopping-vue3-ts-main/server/src/index.js" ]; then
  cd leaf-shopping-vue3-ts-main
else
  echo "❌ 未找到项目文件，请在项目根目录（含 server/ 、src/ 、dist/ 的那一层）执行本脚本"
  exit 1
fi
echo "📁 项目目录: $(pwd)"

if [ ! -f "./dist/index.html" ]; then
  echo "❌ 没找到 dist/index.html，请使用最新版压缩包（已带构建好的前端产物）"
  exit 1
fi
echo "✅ 找到前端产物 dist/index.html"

for f in Dockerfile Dockerfile.build docker-compose.yml .dockerignore; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    echo "ℹ️  $f 已存在，已备份为 $f.bak"
  fi
done
echo
# ---------- 生成 Dockerfile ----------
cat > Dockerfile <<'__LEAF_EOF__'
# 单容器部署：Node 后端同时提供【接口】和【前端页面】，一个端口搞定
# 只依赖 node:22-alpine 一个基础镜像（阿里云 ECS 上验证过可拉取），不需要 nginx 镜像
#
#   docker compose up -d --build
#
# 数据存储默认用容器内 JSON 文件（命名卷 leaf-data）；
# 想在 docker-compose.yml 里配 DB_DRIVER=mysql 就能换成 MySQL（需要装 mysql2 依赖）。

FROM node:22-alpine
# 换阿里云 Alpine 源再装 tzdata（默认官方 CDN 在国内很慢）
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories \
 && apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Shanghai \
    STATIC_DIR=/app/web

# 后端依赖：MySQL 模式需要 mysql2（纯 JS，很小）。不需要 MySQL 时可设 INSTALL_DEPS=0 跳过，
# 那样构建完全不需要联网装包。
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG INSTALL_DEPS=1
COPY server/package.json ./
RUN if [ "$INSTALL_DEPS" = "1" ]; then npm install --omit=dev --no-audit --no-fund --registry=$NPM_REGISTRY; fi

COPY server/ ./
COPY dist/ ./web/
EXPOSE 3000
CMD ["node", "src/index.js"]
__LEAF_EOF__

# ---------- 生成 Dockerfile.build ----------
cat > Dockerfile.build <<'__LEAF_EOF__'
# 备选：在前端源码改动后、想要在服务器上重新构建前端时使用
# 默认走 npmmirror 国内源，避免 npm 拉包慢/失败
#
#   docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
#
# 用法：把 docker-compose.yml 里的 dockerfile: Dockerfile 改成 Dockerfile.build

FROM node:22-alpine AS builder
ARG NPM_REGISTRY=https://registry.npmmirror.com
WORKDIR /build
COPY package.json ./
RUN npm install --no-audit --no-fund --registry=$NPM_REGISTRY
COPY . .
RUN rm -f .env .env.production .env.local && npm run build-only

FROM node:22-alpine
# 换阿里云 Alpine 源再装 tzdata（默认官方 CDN 在国内很慢）
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories \
 && apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Shanghai \
    STATIC_DIR=/app/web
COPY server/ ./
COPY --from=builder /build/dist ./web/
EXPOSE 3000
CMD ["node", "src/index.js"]
__LEAF_EOF__

# ---------- 生成 docker-compose.yml ----------
cat > docker-compose.yml <<'__LEAF_EOF__'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      # 前端源码改了要在服务器上重建时，把上面一行换成 Dockerfile.build
      args:
        INSTALL_DEPS: "${INSTALL_DEPS:-1}"
    image: leaf-shopping-app:latest
    container_name: leaf-app
    restart: unless-stopped
    environment:
      PORT: 3000
      TZ: Asia/Shanghai
      STATIC_DIR: /app/web
      # ---- 存储：json（默认，容器内文件）或 mysql ----
      DB_DRIVER: "${DB_DRIVER:-json}"
      MYSQL_HOST: "${MYSQL_HOST:-host.docker.internal}"
      MYSQL_PORT: "${MYSQL_PORT:-3306}"
      MYSQL_USER: "${MYSQL_USER:-root}"
      MYSQL_PASSWORD: "${MYSQL_PASSWORD:-}"
      MYSQL_DATABASE: "${MYSQL_DATABASE:-leaf_shopping}"
    # 让容器能用 host.docker.internal 访问【宿主机上】的 MySQL
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      # json 模式下订单/购物车/地址数据存在这个卷里
      - leaf-data:/app/data
    ports:
      # 左边是宿主机端口，想用 80 就改成 "80:3000"
      - "8080:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s

volumes:
  leaf-data:
__LEAF_EOF__

# ---------- 生成 .dockerignore ----------
cat > .dockerignore <<'__LEAF_EOF__'
node_modules
.git
.gitignore
.husky
.vscode
*.zip
*.log
*.bak
.env.buildbak
DEPLOY-Linux.md
DEPLOY-Docker.md
README.md
__LEAF_EOF__

echo "✅ 文件已生成："
ls -l Dockerfile Dockerfile.build docker-compose.yml .dockerignore
echo
if [ -f "./.env" ]; then
  echo "ℹ️  当前 .env 里的存储配置："
  grep -E "DB_DRIVER|MYSQL_HOST|MYSQL_DATABASE" .env || echo "   （没有 MYSQL_* 配置，将使用默认 JSON 文件存储）"
  echo
fi
if command -v docker > /dev/null 2>&1; then
  docker compose config > /dev/null 2>&1 && echo "✅ docker-compose.yml 语法校验通过" || echo "⚠️  compose 校验失败"
fi
echo
if [ "$#" -gt 0 ] && [ "$1" = "--up" ]; then
  echo "🚀 构建并启动..."
  docker compose up -d --build
  echo
  docker compose ps
  echo
  echo "🎉 完成，浏览器访问： http://<你的ECS公网IP>:8080"
  echo "   演示账号： xiaotuxian001 / 123456"
  echo
  echo "   查看存储方式： sudo docker compose logs app | grep 数据存储"
else
  echo "👉 下一步： sudo docker compose up -d --build"
fi
