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
