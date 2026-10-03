# 用 Docker 部署（阿里云 ECS）

## 方案说明（单容器，不需要 nginx）

一个容器搞定：**Node 后端同时提供接口和前端页面**，浏览器只访问一个端口。

```
浏览器 ──► 容器 leaf-app :3000
              ├── /           前端页面（dist 构建产物）
              ├── /home /goods /member 等   接口
              └── /img/...    商品图片
```

这样做的好处：
- 只依赖 `node:22-alpine` 一个基础镜像（**不需要拉 nginx 镜像**，阿里云加速器对 `nginx:alpine` 经常返回 403）
- 前端产物已随包提供，容器构建**不用联网装 npm 包**，几秒钟就构建完
- 接口和页面同源，**不用配跨域、不用配反向代理、不用写死 IP**，换服务器/换端口都不用重新构建

## 一、环境要求
- Docker 20.10+ 与 Docker Compose v2：`docker compose version`
- 只需要放行**一个**端口（默认 8080）

## 二、上传解压
```bash
scp leaf-shopping-vue3-ts-main.zip root@<公网IP>:/opt/
ssh root@<公网IP>
cd /opt && unzip -q leaf-shopping-vue3-ts-main.zip -d leaf-shopping
cd leaf-shopping
ls        # 应看到 dist/  server/  src/  Dockerfile  docker-compose.yml  init-docker.sh
```

## 三、生成 Docker 文件并启动
```bash
bash init-docker.sh --up
```
等价于：
```bash
bash init-docker.sh                        # 只生成 4 个文件
sudo docker compose up -d --build          # 构建并启动（几秒）
sudo docker compose ps                     # 状态应为 Up (healthy)
curl -I http://127.0.0.1:8080/             # 返回 200 即成功
```

## 四、阿里云安全组放行
ECS 控制台 → 实例 → 安全组 → 配置规则 → 入方向 → 添加：

| 端口范围 | 授权对象 |
|---|---|
| `8080/8080` | `0.0.0.0/0` |

想直接用 80 端口：把 `docker-compose.yml` 里 `"8080:3000"` 改成 `"80:3000"`，安全组放行 80，再 `sudo docker compose up -d`。

## 五、访问
浏览器打开 **`http://<公网IP>:8080`**，用 `xiaotuxian001` / `123456` 登录。

## 六、常用运维
```bash
sudo docker compose logs -f app     # 看日志（每条接口请求都有记录）
sudo docker compose restart         # 重启
sudo docker compose down            # 停止（数据保留）
sudo docker compose down -v         # 停止并清空数据（重置演示数据）
sudo docker compose up -d --build   # 重新构建启动
```

## 七、数据持久化
- 订单、购物车、收货地址在命名卷 `leaf-data`（容器内 `/app/data`），容器重建不丢
- 商品图（239 张）已打进镜像，无需挂载
- 重置演示数据：`sudo docker compose down -v && sudo docker compose up -d`

## 八、改了前端代码怎么办
包里的 `dist/` 是构建好的产物。改完前端源码后，两种方式：
1. **本地构建**（推荐，快）：本地执行 `npm run build-only`，把新的 `dist/` 上传覆盖，然后 `sudo docker compose up -d --build`。
2. **服务器上构建**：把 `docker-compose.yml` 里的 `dockerfile: Dockerfile` 改成 `dockerfile: Dockerfile.build`，再：
   ```bash
   sudo docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
   sudo docker compose up -d
   ```
   （会联网装 npm 依赖，默认走 npmmirror 国内源；纯前端改动不需要动后端）

## 九、排查
| 现象 | 原因 / 解决 |
|---|---|
| `failed to resolve source metadata ... 403 Forbidden` | 拉不到基础镜像。本方案只用 `node:22-alpine`；如仍失败，检查 `/etc/docker/daemon.json` 的镜像加速器，或换用公共镜像源后 `systemctl restart docker` |
| 构建被 `Killed` | 内存不足（1核1G）。本方案不装 npm 依赖，通常已足够；仍失败可加 swap：<br>`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| 页面打不开 | `sudo docker compose logs -f app` 看日志；确认安全组放行了 8080 |
| 页面打开但没数据 | 容器里确认 `STATIC_DIR=/app/web` 且 `/app/web/index.html` 存在：`docker compose exec app ls /app/web` |
| 图片不显示 | `docker compose exec app ls public/images/goods | head` 确认镜像里有图 |
| 刷新页面 404 | 后端已做单页应用回退，若出现请确认用的是最新版 `server/src/index.js` |
| 启动报 `使用 MySQL 需要先安装依赖` | 镜像构建时跳过了依赖安装。把 `.env` 里的 `INSTALL_DEPS` 改成 1（或删掉），再 `sudo docker compose up -d --build` |
| 连不上 MySQL（ECONNREFUSED / ETIMEDOUT） | ①MySQL 的 `bind-address` 还是 127.0.0.1；②账号没授权给容器来源；③ECS 防火墙/安全组挡了 3306 |
| `Access denied for user` | `.env` 里的 `MYSQL_USER`/`MYSQL_PASSWORD` 不对，或授权主机写成了 `localhost` 而不是 `%` |


## 十、改用 MySQL 存数据

默认是容器内的 JSON 文件（命名卷 `leaf-data`）。想换成 MySQL 完全没问题，**不需要额外拉 MySQL 镜像**——直接用云主机上装好的 MySQL，或者阿里云 RDS。

后端支持两种存储驱动，切换只改环境变量：

| DB_DRIVER | 数据存放位置 |
|---|---|
| `json`（默认） | 容器内 `/app/data/db.json`（命名卷 `leaf-data`） |
| `mysql` | MySQL 的 6 张表：`users` / `addresses` / `carts` / `orders` / `order_items` / `counters` |

表结构在首次启动时**自动创建**，如果库里没有任何用户数据，还会自动写入一份演示数据（5 条订单、2 个地址、演示账号）。

### 1. 在 ECS 上准备 MySQL

```bash
# 建库 + 建账号（给容器用）
mysql -uroot -p
```
```sql
CREATE DATABASE IF NOT EXISTS leaf_shopping DEFAULT CHARSET utf8mb4;
CREATE USER IF NOT EXISTS 'leaf'@'%' IDENTIFIED BY '换成你的强密码';
GRANT ALL PRIVILEGES ON leaf_shopping.* TO 'leaf'@'%';
FLUSH PRIVILEGES;
```

如果 MySQL 只监听 127.0.0.1，容器是连不上的，要放开（`/etc/my.cnf` 或 `/etc/mysql/mysql.conf.d/mysqld.cnf`）：

```ini
bind-address = 0.0.0.0
```
```bash
sudo systemctl restart mysqld     # 或 mysql
```
> 安全提示：不要把 3306 开到公网。可以把授权主机写窄一点，例如 `'leaf'@'172.17.%'`（Docker 默认网段），并在 ECS 安全组里**不要**放行 3306。

### 2. 项目根目录写 .env

```bash
cd /opt/leaf-shopping
cat > .env <<'EOF'
DB_DRIVER=mysql
MYSQL_HOST=host.docker.internal
MYSQL_PORT=3306
MYSQL_USER=leaf
MYSQL_PASSWORD=换成你的强密码
MYSQL_DATABASE=leaf_shopping
EOF
```
`host.docker.internal` 已在 compose 里通过 `extra_hosts: host-gateway` 映射到宿主机；如果用 **RDS**，把它换成 RDS 的**内网地址**，并在 RDS 白名单里加上 ECS 的内网 IP。

### 3. 重建并启动

```bash
sudo docker compose up -d --build
sudo docker compose logs app | grep 数据存储
# 应输出： 数据存储: MySQL host.docker.internal:3306/leaf_shopping
```

### 4. 把原有 JSON 数据迁移过去（可选）

之前用 json 模式跑出来的订单、购物车、地址可以通过脚本导入 MySQL（可重复执行，按主键覆盖）：

```bash
# 先看看要迁多少（不写入）
sudo docker compose exec app node tools/migrate-json-to-mysql.mjs --dry-run

# 正式迁移
sudo docker compose exec app node tools/migrate-json-to-mysql.mjs
```
> 脚本读的是容器里的 `/app/data/db.json`（也就是那个命名卷）。如果换机器导致卷没了，可以先 `docker compose cp 旧的db.json app:/app/data/db.json`。
> 迁移完成后，JSON 文件就不再被使用了，但保留着做备份没坏处。

### 5. 验证数据确实在 MySQL 里

```bash
mysql -uleaf -p leaf_shopping -e "
  select 'users' t, count(*) n from users
  union all select 'addresses', count(*) from addresses
  union all select 'orders', count(*) from orders
  union all select 'order_items', count(*) from order_items;"
```
之后在页面上下一单，再查一次 `orders` 就能看到新订单记录。

### 6. 切回 JSON 文件模式

把 `.env` 里 `DB_DRIVER` 改成 `json`（或整行删掉），然后：

```bash
sudo docker compose up -d --force-recreate
```
数据会回到命名卷里的 db.json，两套数据互不影响（切回来看到的是切换前那份）。

### 7. 顺带一提

数据放到 MySQL 之后，容器和卷就变成无状态的了：**换服务器、重建容器都不影响数据**，备份也只要备份 MySQL 一个库。
