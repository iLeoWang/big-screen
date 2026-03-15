# 大屏可视化仪表盘框架

基于 React+Vite+ECharts+TypeScript+Tailwind CSS 技术栈的响应式大屏可视化仪表盘框架。

## 技术栈

- React 18
- Vite 4+
- ECharts 5+
- TypeScript 5+
- Tailwind CSS 3+

## 项目特点

- 响应式设计，适配不同分辨率屏幕
- 模块化组件设计，易于扩展和定制
- 丰富的图表组件封装，简化开发
- TypeScript 类型支持，提高代码健壮性
- Tailwind CSS 工具类，快速构建界面

## 项目结构

```text
.
├── public/              # 公共静态资源（Cesium 等）
├── src/                 # 源代码目录
│   ├── api/             # API 接口
│   ├── assets/          # 静态资源
│   │   ├── images/      # 图片资源（卡片装饰、标题装饰等）
│   │   └── svg/         # SVG 图标资源
│   ├── components/      # 组件
│   │   ├── Card/        # 卡片组件
│   │   ├── CardInner/   # 内部卡片组件
│   │   ├── ChartCard/   # 图表卡片组件
│   │   ├── ErrorBoundary/# 错误边界组件
│   │   ├── ErrorDisplay/# 错误显示组件
│   │   ├── Title/       # 标题组件
│   │   └── WeatherIcon/  # 天气图标组件
│   ├── constants/       # 常量配置
│   ├── contexts/        # React Context
│   ├── data/            # 静态数据（地图数据等）
│   ├── hooks/           # 自定义钩子
│   │   ├── useECharts/  # ECharts Hook
│   │   ├── useChinaMap/ # 中国地图 Hook
│   │   └── useScreenAdapt/# 屏幕适配 Hook
│   ├── layouts/         # 布局组件
│   │   └── DashboardLayout/# 仪表盘布局
│   ├── providers/       # 全局 Provider（如 QueryClientProvider）
│   ├── styles/          # 样式文件
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   ├── views/           # 页面视图
│   │   └── dashboard/  # 仪表盘页面
│   ├── App.tsx          # 根组件
│   └── main.tsx         # 入口文件
├── .editorconfig        # 编辑器配置
├── .gitignore           # Git 忽略配置
├── .prettierrc          # Prettier 配置
├── .prettierignore      # Prettier 忽略配置
├── index.html            # HTML 入口
├── package.json         # 项目配置
├── pnpm-lock.yaml       # 依赖锁定文件
├── postcss.config.js    # PostCSS 配置
├── tailwind.config.js   # Tailwind CSS 配置
├── tsconfig.json        # TypeScript 配置
└── vite.config.ts       # Vite 配置
```

## 组件说明

### 基础组件

- `Card`: 卡片组件，提供统一的卡片样式和装饰
- `CardInner`: 内部卡片组件，用于嵌套卡片
- `ChartCard`: 图表卡片组件，基于 `useECharts` Hook 封装
- `Title`: 标题组件，提供统一的标题样式
- `ErrorBoundary`: 错误边界组件，捕获并处理 React 错误
- `ErrorDisplay`: 错误显示组件，用于展示错误信息
- `WeatherIcon`: 天气图标组件

### 布局组件

- `DashboardLayout`: 仪表盘布局组件，提供整体布局结构

### 自定义钩子

- `useECharts`: ECharts React Hook，封装图表初始化、更新、清理等逻辑
- `useChinaMap`: 中国地图 Hook，处理地图数据加载和交互
- `useScreenAdapt`: 屏幕适配钩子，实现大屏自适应缩放

## 使用方法

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

项目支持多环境配置，通过 `.env` 文件管理：

- `.env` - 默认配置（所有环境共享）
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

主要配置项：

- `VITE_BASE_PATH` - 部署基础路径（生产环境默认为 `/big-screen/`）
- `VITE_API_BASE_URL` - API 基础地址

### 开发模式

```bash
pnpm run dev
```

开发环境默认使用根路径 `/`，通过 `/api` 代理到后端服务。

### 构建项目

```bash
# 生产环境构建（默认）
pnpm run build

# 开发环境构建
pnpm run build:dev
```

### 预览构建

```bash
# 预览构建结果
pnpm run preview

# 预览生产环境构建
pnpm run preview:prod
```

### 类型检查

```bash
pnpm run type-check
```

### 代码格式化

```bash
# 格式化所有代码
pnpm run format

# 检查代码格式（不修改文件）
pnpm run format:check

# 代码检查和格式化（lint = format:check + type-check）
pnpm run lint
```

## 路径别名配置

项目配置了完整的路径别名，方便导入模块：

```typescript
// 基础别名（src 根目录）
import { something } from "@/utils/helper";

// 目录别名
import { get } from "@api/common";              // API 接口
import logo from "@assets/images/logo.png";     // 静态资源
import Card from "@components/Card";             // 组件
import { API_SUCCESS_CODE } from "@constants/config";  // 常量
import { MapContext } from "@contexts/MapContext";     // Context
import { getDivisions } from "@data/divisions";        // 数据
import { useECharts } from "@hooks/useECharts";        // Hooks
import DashboardLayout from "@layouts/DashboardLayout"; // 布局
import { useDict } from "@hooks/useDict";              // 字典缓存 Hook（TanStack Query）
import "@/styles/index.css";                           // 样式
import type { CardProps } from "@types/common";        // 类型定义
import { cn } from "@utils/cn";                       // 工具函数
import Dashboard from "@views/dashboard";              // 页面视图
```

### 别名列表

| 别名 | 路径 | 说明 |
|------|------|------|
| `@` | `src/` | 源代码根目录 |
| `@api` | `src/api/` | API 接口 |
| `@assets` | `src/assets/` | 静态资源 |
| `@components` | `src/components/` | 组件 |
| `@constants` | `src/constants/` | 常量配置 |
| `@contexts` | `src/contexts/` | React Context |
| `@data` | `src/data/` | 静态数据 |
| `@hooks` | `src/hooks/` | 自定义 Hooks |
| `@layouts` | `src/layouts/` | 布局组件 |
| `@styles` | `src/styles/` | 样式文件 |
| `@types` | `src/types/` | 类型定义 |
| `@utils` | `src/utils/` | 工具函数 |
| `@views` | `src/views/` | 页面视图 |

## 代码规范

项目使用以下工具保证代码质量：

- **EditorConfig**: 统一编辑器配置
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查

提交代码前请确保：
- 通过类型检查：`pnpm run type-check`
- 代码已格式化：`pnpm run format`
- 或运行完整检查：`pnpm run lint`

## 自定义配置

### Tailwind 配置

可在 `tailwind.config.js` 中自定义颜色、字体大小等主题配置。

### 图表配置

使用 `useECharts` Hook 或 `ChartCard` 组件创建图表，直接传入 ECharts 配置项即可。

### 布局配置

可在 `DashboardLayout` 和 `MainContent` 组件中自定义布局。

## 响应式适配

使用 `useScreenAdapt` 钩子实现大屏自适应，支持以下适配模式：

- `fit`: 等比缩放，确保内容完全显示
- `fill`: 等比缩放，确保填满屏幕
- `none`: 不缩放

## 部署说明

### Nginx 部署

项目已配置为部署到 `/big-screen/` 路径下，参考 `nginx.conf.example` 进行 nginx 配置。

主要配置要点：

1. 将构建后的 `dist` 目录部署到服务器
2. 配置 nginx 的 `location /big-screen` 指向 dist 目录
3. 使用 `try_files` 确保路由正常工作
4. 配置静态资源缓存策略

### 字典缓存

项目基于 TanStack Query 封装了标准字典 hooks（`useDict`），默认缓存时间为 10 分钟。

## 注意事项

- 设计稿尺寸为 1920px × 1080px
- 使用 TypeScript 严格模式，确保类型安全
- 使用 Tailwind CSS 工具类，避免编写大量 CSS
- 使用 ECharts 实例管理，避免内存泄漏
- 生产环境部署路径为 `/big-screen/`，确保 nginx 配置正确
