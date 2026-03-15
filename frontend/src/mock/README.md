# Mock 数据配置

## 目录结构

```
src/mock/
├── index.ts              # Mock API 统一入口（vite-plugin-mock 自动加载）
├── config.ts             # Faker 配置中心，统一管理所有数据生成规则
├── chart.ts              # 图表相关的 faker 数据生成函数
├── mock.ts               # Mock API 配置（用于 vite-plugin-mock）
└── README.md             # 使用说明
```

## 工作流程

1. **Faker 配置** (`config.ts`)：定义数据生成规则
2. **数据生成函数** (`chart.ts`)：使用 faker 生成具体数据
3. **Mock API 配置** (`mock.ts`)：定义 API 路由和响应
4. **统一入口** (`index.ts`)：导出所有 Mock API，供 vite-plugin-mock 使用

## 添加新的 Mock API

### 步骤 1: 在 `config.ts` 中添加配置

```typescript
export const newModuleConfig = {
    field1: { min: 0, max: 100 },
    field2: { options: ["选项1", "选项2"] },
};

export const createNewModuleGenerator = () => {
    return () => {
        return {
            field1: faker.number.int({
                min: newModuleConfig.field1.min,
                max: newModuleConfig.field1.max,
            }),
            field2: faker.helpers.arrayElement(newModuleConfig.field2.options),
        };
    };
};

export const fakerGenerators = {
    // ...
    newModuleData: createNewModuleGenerator(),
};
```

### 步骤 2: 在 `chart.ts` 中添加生成函数（或创建新文件）

```typescript
export const generateNewModuleData = () => {
    return fakerGenerators.newModuleData();
};
```

### 步骤 3: 在 `mock.ts` 中添加 Mock API 配置

```typescript
export const newModuleMockMethods: MockMethod[] = [
    {
        url: "/api/new-module",
        method: "get",
        response: () => {
            return {
                code: 200,
                message: "成功",
                data: generateNewModuleData(),
                success: true,
            };
        },
    },
];
```

### 步骤 4: 在 `index.ts` 中导入并导出

```typescript
import { chartMockMethods } from "./mock";
import { newModuleMockMethods } from "./mock";

export default [...chartMockMethods, ...newModuleMockMethods] as MockMethod[];
```

## 特性

- ✅ **自动拦截**：vite-plugin-mock 自动拦截匹配的 API 请求
- ✅ **无需代理**：不需要配置 Vite proxy
- ✅ **热更新**：修改 mock 文件后自动生效
- ✅ **Faker 集成**：使用 faker.js 生成随机数据
- ✅ **类型安全**：完整的 TypeScript 类型支持

## 注意事项

1. `mock/index.ts` 是 vite-plugin-mock 的入口文件，必须存在
2. 所有 Mock API 配置都要从 `mock/index.ts` 中导出
3. Faker 配置统一在 `config.ts` 中管理
4. 开发环境自动启用，生产环境自动禁用

## 查看 Mock API 列表

在浏览器控制台中可以看到 vite-plugin-mock 的日志，显示已注册的 Mock API 路由。
