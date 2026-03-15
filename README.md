# 空气质量监测大屏

基于 React + Express + MySQL 的全国空气质量实时监测数据可视化大屏系统，支持 Docker 一键部署。

## 预览

访问地址：`http://<服务器IP>/big-screen/`

## 架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│    Nginx     │────▶│  Express API │────▶│  MySQL   │
│  前端 + 代理  │     │  (port:8080) │     │  (3306)  │
│  (port:80)   │     └──────────────┘     └──────────┘
└──────────────┘
```

## 技术栈

**前端**
- React 18 + TypeScript
- Vite 7
- ECharts 6（地图 + 图表）
- Tailwind CSS 3 + Ant Design 5
- TanStack Query（数据请求/缓存）

**后端**
- Express 4
- MySQL 8.0 + mysql2

**部署**
- Docker Compose
- Nginx 反向代理

## 项目结构

```
big-screen/
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── api/             # API 接口
│   │   ├── assets/          # 静态资源（图片/SVG）
│   │   ├── components/      # 通用组件（Card、Title 等）
│   │   ├── constants/       # 常量配置
│   │   ├── contexts/        # React Context
│   │   ├── data/            # 地图 GeoJSON 数据
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── layouts/         # 布局组件
│   │   ├── views/dashboard/ # 大屏页面（左/中/右/底部面板）
│   │   └── utils/           # 工具函数
│   ├── nginx.conf           # Nginx 配置
│   └── Dockerfile
├── server/                  # 后端项目
│   ├── src/
│   │   ├── app.js           # Express 入口
│   │   ├── db.js            # MySQL 连接池
│   │   ├── routes/          # API 路由
│   │   └── services/        # 业务逻辑
│   ├── sql/init.sql         # 数据库初始化
│   ├── scripts/             # 数据填充脚本
│   └── Dockerfile
├── docker-compose.yml
└── deploy.sh                # 一键部署脚本
```

## 快速开始

### 本地开发

```bash
# 1. 启动后端（需要 MySQL）
cd server
cp .env.example .env         # 编辑数据库连接信息
npm install
npm run dev

# 2. 启动前端
cd frontend
pnpm install
pnpm run dev                 # http://localhost:5173
```

### 服务器部署（Docker）

```bash
# SSH 登录服务器后执行
git clone git@github.com:iLeoWang/big-screen.git /opt/big-screen
cd /opt/big-screen
cp .env.production .env      # 修改数据库密码
docker compose up -d --build
```

或使用一键部署脚本：

```bash
curl -O https://raw.githubusercontent.com/iLeoWang/big-screen/main/deploy.sh
bash deploy.sh
```

详细部署说明见 [DEPLOY.md](DEPLOY.md)。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_PASSWORD` | 123456 | MySQL root 密码 |
| `DB_HOST` | mysql | 数据库主机（Docker 内网） |
| `DB_PORT` | 3306 | 数据库端口 |
| `PORT` | 8080 | 后端服务端口 |

## 常用命令

```bash
docker compose ps              # 查看容器状态
docker compose logs -f server  # 查看后端日志
docker compose restart server  # 重启后端
docker compose down            # 停止服务
docker compose down -v         # 停止并清除数据
```

## License

MIT
