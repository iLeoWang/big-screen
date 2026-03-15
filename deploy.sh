#!/bin/bash
set -e

#===========================================
#  空气质量大屏 — 阿里云一键部署脚本
#
#  使用方法：
#    1. SSH 登录服务器
#    2. 把这个脚本内容粘贴保存为 deploy.sh
#    3. bash deploy.sh
#===========================================

# ========== 配置区 ==========
REPO_URL="https://github.com/你的用户名/big-screen.git"   # ← 改成你的仓库地址
BRANCH="master"
APP_DIR="/opt/big-screen"
DB_PASSWORD="AirQuality2024!"
# ============================

echo ""
echo "=========================================="
echo "  空气质量大屏 — 一键部署"
echo "=========================================="
echo ""

# 1. 安装 Docker
if ! command -v docker &> /dev/null; then
    echo "[1/7] 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
else
    echo "[1/7] Docker 已安装 ✓"
fi

# 2. 验证 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "错误: docker compose 不可用"
    exit 1
fi
echo "[2/7] Docker Compose 可用 ✓"

# 3. 安装 Git
if ! command -v git &> /dev/null; then
    echo "[3/7] 安装 Git..."
    if command -v yum &> /dev/null; then
        yum install -y git
    else
        apt-get update && apt-get install -y git
    fi
else
    echo "[3/7] Git 已安装 ✓"
fi

# 4. 拉取代码
if [ -d "$APP_DIR/.git" ]; then
    echo "[4/7] 更新代码..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
else
    echo "[4/7] 克隆代码..."
    rm -rf "$APP_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 5. 写入环境变量
echo "[5/7] 配置环境变量..."
cat > "$APP_DIR/.env" <<EOF
DB_PASSWORD=${DB_PASSWORD}
EOF

# 6. 构建并启动（首次约 3-5 分钟）
echo "[6/7] 构建并启动容器..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 7. 等待就绪 + 初始化数据
echo "[7/7] 等待服务就绪..."
READY=0
for i in $(seq 1 60); do
    if curl -sf http://localhost/api/health > /dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 2
done

if [ $READY -eq 1 ]; then
    echo "服务已就绪，初始化数据..."
    docker compose exec -T server node scripts/reseed-reasonable-data.mjs 2>/dev/null || true
    docker compose exec -T server node scripts/import-national-2025.mjs 2>/dev/null || true

    PUBLIC_IP=$(curl -sf ifconfig.me 2>/dev/null || echo "你的公网IP")
    echo ""
    echo "=========================================="
    echo "  部署成功！"
    echo "=========================================="
    echo ""
    echo "  访问地址:  http://${PUBLIC_IP}/big-screen/"
    echo ""
    echo "  常用命令:"
    echo "    查看状态:  cd $APP_DIR && docker compose ps"
    echo "    查看日志:  cd $APP_DIR && docker compose logs -f"
    echo "    重新部署:  cd $APP_DIR && git pull && docker compose up -d --build"
    echo ""
else
    echo ""
    echo "警告: 服务启动超时，请检查日志："
    echo "  cd $APP_DIR && docker compose logs --tail=50"
    echo ""
fi
