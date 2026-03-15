# 空气质量大屏 - 阿里云部署文档

## 项目架构

```
┌──────────┐     ┌──────────────┐     ┌─────────┐
│  Nginx   │────▶│ Express API  │────▶│  MySQL  │
│ (前端+代理)│     │  (port:8080) │     │ (3306)  │
│ (port:80)│     └──────────────┘     └─────────┘
└──────────┘
```

- **前端**：React + Vite 构建后由 Nginx 托管，路径 `/big-screen/`
- **后端**：Express 服务，端口 8080
- **数据库**：MySQL 8.0
- **Nginx** 同时负责反向代理 `/api/` 到后端

---

## 一、服务器准备

### 1.1 登录阿里云服务器

```bash
ssh root@<你的服务器IP>
```

### 1.2 安装 Docker 和 Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 验证
docker --version
docker compose version
```

> Docker Compose V2 已内置在 Docker 中，无需单独安装。

### 1.3 开放端口

在阿里云控制台 → 安全组，放行以下端口：

| 端口 | 用途 |
|------|------|
| 80   | 前端访问 |
| 8080 | 后端 API（可选，仅调试用） |
| 3306 | MySQL（可选，仅调试用） |

> 生产环境建议只开放 80 端口，其他端口通过内网访问。

---

## 二、部署步骤

### 2.1 上传代码到服务器

```bash
# 方式一：git clone
cd /opt
git clone <你的仓库地址> air-quality
cd air-quality

# 方式二：scp 上传
scp -r ./ root@<服务器IP>:/opt/air-quality
ssh root@<服务器IP>
cd /opt/air-quality
```

### 2.2 一键启动

```bash
docker compose up -d --build
```

首次启动会：
1. 拉取 `mysql:8.0`、`node:18-alpine`、`nginx:alpine` 镜像
2. 构建前端（多阶段构建：pnpm build → Nginx 静态托管）
3. 构建后端（Node.js 应用）
4. 自动执行 `server/sql/init.sql` 初始化数据库（建表 + 省份/区划数据）

### 2.3 填充模拟数据

MySQL 初始化只创建了表结构和省份基础数据，需要手动运行 seed 脚本填充业务数据：

```bash
docker compose exec server node src/seed.js
```

### 2.4 验证

```bash
# 检查容器状态
docker compose ps

# 检查后端健康
curl http://localhost:8080/health

# 检查前端
curl -I http://localhost/big-screen/
```

浏览器访问：`http://<你的服务器IP>/big-screen/`

---

## 三、常用运维命令

```bash
# 查看日志
docker compose logs -f server    # 后端日志
docker compose logs -f frontend  # Nginx 日志
docker compose logs -f mysql     # MySQL 日志

# 重启服务
docker compose restart server

# 停止所有服务
docker compose down

# 停止并删除数据卷（清空数据库）
docker compose down -v

# 重新构建并启动
docker compose up -d --build
```

---

## 四、配置说明

### 4.1 环境变量

在 `docker-compose.yml` 中可修改：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MYSQL_ROOT_PASSWORD` | 123456 | MySQL root 密码 |
| `DB_HOST` | mysql | 数据库主机（容器内服务名） |
| `DB_PORT` | 3306 | 数据库端口 |
| `PORT` | 8080 | 后端端口 |

### 4.2 Nginx 配置

前端 Nginx 配置在 `frontend/nginx.conf`：

- `/big-screen/` → 前端静态文件
- `/api/` → 反向代理到 `server:8080`

### 4.3 数据库持久化

MySQL 数据存储在 Docker Volume `mysql_data` 中，`docker compose down` 不会删除数据。

只有 `docker compose down -v` 才会清除数据。

---

## 五、生产环境优化建议

### 5.1 配置 HTTPS

```bash
# 安装 certbot 获取 Let's Encrypt 证书
apt install certbot -y
certbot certonly --standalone -d yourdomain.com
```

修改 `frontend/nginx.conf` 添加 SSL：

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... 其余配置不变
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### 5.2 修改数据库密码

修改 `docker-compose.yml` 中的 `MYSQL_ROOT_PASSWORD` 和 `DB_PASSWORD`，保持一致。

### 5.3 限制端口暴露

生产环境 `docker-compose.yml` 中：
- 移除 MySQL 的 `ports: - "3306:3306"`
- 移除 server 的 `ports: - "8080:8080"`
- 只保留 frontend 的 `ports: - "80:80"`

容器间通过 Docker 网络内部通信，无需暴露到宿主机。

---

## 六、目录结构总览

```
air-quality/
├── docker-compose.yml          # Docker Compose 编排
├── frontend/
│   ├── Dockerfile              # 前端构建镜像（多阶段）
│   ├── nginx.conf              # Nginx 配置
│   ├── .dockerignore
│   ├── package.json
│   ├── src/                    # React 源码
│   └── dist/                   # 构建产物（Docker 内生成）
├── server/
│   ├── Dockerfile              # 后端镜像
│   ├── .dockerignore
│   ├── package.json
│   ├── src/
│   │   ├── app.js              # Express 入口
│   │   ├── db.js               # MySQL 连接池
│   │   ├── seed.js             # 数据填充脚本
│   │   ├── routes/             # API 路由
│   │   │   ├── left.js
│   │   │   ├── right.js
│   │   │   ├── bottom.js
│   │   │   ├── middle.js
│   │   │   ├── weather.js
│   │   │   └── province.js
│   │   └── utils/
│   │       └── response.js
│   └── sql/
│       └── init.sql            # 数据库初始化脚本
```
