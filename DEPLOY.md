# 空气质量大屏 — 部署文档

## 架构

```
用户浏览器  →  公网IP:80  →  Nginx (前端静态 + 反向代理)
                                ↓ /api/
                           Express Server :8080 (Docker 内网)
                                ↓
                           MySQL 8.0 :3306 (Docker 内网)
```

- **前端**：React + Vite → Nginx 托管，路径 `/big-screen/`
- **后端**：Express，2 个接口 `/dashboard/map` + `/dashboard/overview`
- **数据库**：MySQL 8.0，Docker Volume 持久化
- 只有 **80 端口** 暴露到公网，数据库和后端仅 Docker 内网通信

---

## 一键部署

### 前提

- 阿里云 ECS（或任意 Linux 服务器）
- 阿里云安全组已放行 **80 端口**（入方向 TCP 0.0.0.0/0）

### 执行

```bash
ssh root@你的服务器IP

# 下载并执行部署脚本
curl -sL https://raw.githubusercontent.com/iLeoWang/big-screen/main/deploy.sh | bash
```

脚本自动完成：
1. 安装 Docker + Git（如果没有）
2. 克隆代码到 `/opt/big-screen`
3. 创建 `.env` 配置数据库密码（默认 `AirQuality2024!`）
4. 构建并启动 3 个容器（MySQL + Server + Nginx）
5. 等待服务就绪后初始化数据
6. 输出访问地址

首次构建约 **3-5 分钟**（下载镜像 + npm install + pnpm build）。

部署完成后访问：`http://你的服务器IP/big-screen/`

---

## 数据库密码

密码通过项目根目录的 `.env` 文件管理，`docker-compose.yml` 自动读取。

### 首次部署

部署脚本自动创建 `/opt/big-screen/.env`：

```env
DB_PASSWORD=AirQuality2024!
```

### 修改密码

```bash
cd /opt/big-screen

# 1. 修改密码
vi .env
# 改 DB_PASSWORD=你的新密码

# 2. 必须删除旧数据库卷重建（密码在 MySQL 首次初始化时写入，改 env 不会生效）
docker compose down -v
docker compose up -d --build
```

> **注意**：`docker compose down -v` 会清空数据库，需要重新初始化数据。

---

## 更新部署

代码更新后，服务器上执行：

```bash
cd /opt/big-screen
git pull origin main
docker compose up -d --build
```

或者重新执行部署脚本（会自动 git pull）：

```bash
cd /opt/big-screen && bash deploy.sh
```

---

## 常用运维命令

```bash
cd /opt/big-screen

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f              # 全部
docker compose logs -f server       # 后端
docker compose logs -f frontend     # Nginx
docker compose logs -f mysql        # 数据库

# 重启单个服务
docker compose restart server

# 停止所有服务（保留数据）
docker compose down

# 停止并清空数据库（慎用）
docker compose down -v

# 手动初始化数据
docker compose exec server node scripts/reseed-reasonable-data.mjs
docker compose exec server node scripts/import-national-2025.mjs

# 备份数据库
docker compose exec mysql mysqldump -u root -pAirQuality2024! air_quality > backup.sql

# 恢复数据库
docker compose exec -T mysql mysql -u root -pAirQuality2024! air_quality < backup.sql

# 健康检查
curl http://localhost/api/health
```

---

## 配置说明

### 环境变量（`.env`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_PASSWORD` | `AirQuality2024!` | MySQL root 密码 |

### docker-compose.yml

| 服务 | 端口 | 说明 |
|------|------|------|
| `mysql` | 不暴露 | Docker 内网 3306 |
| `server` | 不暴露 | Docker 内网 8080 |
| `frontend` | **80:80** | 唯一对外端口 |

### Nginx 路由（`frontend/nginx.conf`）

| 路径 | 目标 |
|------|------|
| `/` | 301 重定向到 `/big-screen/` |
| `/big-screen/` | 前端静态文件（SPA） |
| `/api/` | 反向代理到 `server:8080/` |

### API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/dashboard/map` | 地图数据（34 省份 AQI + 坐标） |
| `GET /api/dashboard/overview?scope=ALL\|省份code` | 聚合面板数据 |
| `GET /api/health` | 健康检查 |

---

## 目录结构

```
big-screen/
├── deploy.sh                    # 一键部署脚本
├── docker-compose.yml           # Docker 编排
├── .env                         # 数据库密码（部署时生成，不入 git）
├── frontend/
│   ├── Dockerfile               # 多阶段构建（pnpm build → Nginx）
│   ├── nginx.conf               # Nginx 配置
│   └── src/                     # React 源码
├── server/
│   ├── Dockerfile               # Node.js 镜像
│   ├── src/
│   │   ├── app.js               # Express 入口
│   │   ├── routes/dashboard.js  # /dashboard/map + /dashboard/overview
│   │   └── services/            # 数据聚合、查询、演示数据
│   ├── scripts/                 # 数据种子脚本
│   └── sql/init.sql             # 数据库初始化
```
