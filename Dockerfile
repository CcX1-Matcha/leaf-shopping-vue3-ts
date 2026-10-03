# 多阶段构建：web-builder 构建前端 -> api 运行后端 -> web 用 nginx 托管前端并反向代理接口
# 构建：docker compose build    运行：docker compose up -d

# ================= 1. 前端构建 =================
FROM node:22-alpine AS web-builder
WORKDIR /build
COPY package.json ./
RUN npm install --no-audit --no-fund --registry=https://registry.npmmirror.com
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
FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /build/dist /usr/share/nginx/html
EXPOSE 80
