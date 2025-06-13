# CarbonFlow Panel 架构文档

## 重构概述

原来的 `CarbonFlowPanel.tsx` 文件过于庞大（905行），包含了太多的状态管理和业务逻辑。经过重构，我们将其解耦成了更小、更专注的模块。

## 新的文件结构

```
app/components/workbench/CarbonFlow/panel/
├── CarbonFlowPanel.tsx          # 主组件（重构后约300行）
├── hooks/                       # 自定义hooks
│   ├── index.ts                 # hooks导出文件
│   ├── useFileOperations.ts     # 文件操作相关
│   ├── useAIFileOperations.ts   # AI文件解析相关
│   ├── useCarbonFactorMatch.ts  # 碳因子匹配相关
│   ├── useModalManagement.ts    # 模态框状态管理
│   ├── useCarbonFlowData.ts     # 核心数据管理
│   └── ...                     # 其他现有hooks
├── components/                  # UI组件
├── types/                      # 类型定义
├── utils/                      # 工具函数
└── constants/                  # 常量定义
```

## 各模块职责

### 1. CarbonFlowPanel.tsx (主组件)
- **职责**: 组件组合和布局，事件处理协调
- **大小**: 约300行（原905行）
- **主要功能**:
  - 使用各种hooks获取状态和操作函数
  - 定义表格列配置
  - 处理组件间的事件协调
  - 渲染UI布局

### 2. useFileOperations.ts
- **职责**: 文件相关的所有操作
- **主要功能**:
  - 文件上传、删除、预览
  - 文件列表获取和管理
  - 文件解析触发
  - 模态框文件列表管理

### 3. useAIFileOperations.ts
- **职责**: AI文件解析相关功能
- **主要功能**:
  - AI解析模态框状态管理
  - 文件解析结果事件监听
  - 解析结果状态更新
  - 聊天触发事件处理

### 4. useCarbonFactorMatch.ts
- **职责**: 碳因子匹配功能
- **主要功能**:
  - 碳因子匹配模态框状态
  - 匹配结果管理
  - 匹配操作处理

### 5. useModalManagement.ts
- **职责**: 统一管理所有模态框状态
- **主要功能**:
  - 设置模态框状态
  - 排放源抽屉状态
  - 文件上传模态框状态
  - 背景数据标签页状态

### 6. useCarbonFlowData.ts
- **职责**: 核心业务数据管理
- **主要功能**:
  - 场景信息管理
  - 节点数据管理
  - 排放源CRUD操作
  - 与数据服务层交互

## 重构优势

### 1. 代码可维护性
- **单一职责**: 每个hook专注于特定功能域
- **代码分离**: 业务逻辑从UI组件中分离
- **易于测试**: 每个hook可以独立测试

### 2. 代码复用性
- **Hook复用**: hooks可以在其他组件中复用
- **逻辑共享**: 相同的业务逻辑可以跨组件使用

### 3. 开发体验
- **文件大小**: 主组件从905行减少到约300行
- **关注点分离**: 开发者可以专注于特定功能
- **易于理解**: 每个文件的职责清晰明确

### 4. 性能优化
- **按需加载**: 可以实现hooks的懒加载
- **状态隔离**: 不相关的状态更新不会影响其他部分
- **优化重渲染**: 更细粒度的状态管理

## 使用示例

```typescript
// 在CarbonFlowPanel中使用hooks
const fileOperations = useFileOperations(workflowId);
const aiFileOperations = useAIFileOperations();
const carbonFactorMatch = useCarbonFactorMatch();
const modalManagement = useModalManagement();
const carbonFlowData = useCarbonFlowData(workflowId);

// 组合使用
const handleAddEmissionSource = () => {
  carbonFlowData.handleAddEmissionSource();
  modalManagement.handleOpenEmissionDrawer();
};
```

## 扩展性

### 添加新功能
1. 创建新的hook文件
2. 在hooks/index.ts中导出
3. 在主组件中使用

### 修改现有功能
1. 定位到对应的hook文件
2. 修改特定功能逻辑
3. 不影响其他模块

## 注意事项

1. **依赖关系**: hooks之间应该保持松耦合
2. **状态同步**: 需要注意跨hook的状态同步
3. **事件处理**: 复杂的事件流需要在主组件中协调
4. **类型安全**: 确保hooks之间的接口类型正确

## 未来优化方向

1. **状态管理**: 考虑使用Context或状态管理库
2. **事件系统**: 实现更完善的事件总线
3. **缓存策略**: 添加数据缓存和同步机制
4. **错误处理**: 统一的错误处理和用户反馈 