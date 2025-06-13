# LCA字段与OpenLCA对比文档

## 概述

本文档详细对比了我们系统中的LCA字段设计与OpenLCA标准的异同，帮助理解每个字段的具体含义和使用场景。

## 🎯 核心概念对比

### 1. 主要产品 (Main Product)

| 字段 | 我们的系统 | OpenLCA | 说明 |
|------|------------|---------|------|
| `isMainProduct` | `boolean` | Reference Product | 标识系统的主要产品 |
| 数量限制 | 每个工作流1个 | 每个产品系统1个 | ✅ 概念一致 |
| 用途 | 碳足迹计算基准 | LCA计算基准 | ✅ 完全对应 |

**示例**：
```typescript
// 智能手机作为主要产品
{
  isMainProduct: true,
  productCategory: 'main',
  functionalUnit: {
    value: 1,
    unit: '台',
    description: '一台智能手机的完整生命周期'
  }
}
```

### 2. 产品分类 (Product Categories)

| 分类 | 我们的系统 | OpenLCA | 应用场景 |
|------|------------|---------|----------|
| `main` | 主要产品 | Reference Product | 系统核心产品 |
| `co_product` | 联产品 | Co-product | 同时产出的有价值产品 |
| `byproduct` | 副产品 | By-product | 生产过程的次要产出 |
| `avoided_product` | 避免产品 | Avoided Product | 替代其他产品的建模 |

**实际应用**：
```typescript
// 石油炼制过程
{
  // 汽油 - 主要产品
  productCategory: 'main',
  label: '汽油'
},
{
  // 柴油 - 联产品  
  productCategory: 'co_product',
  label: '柴油'
},
{
  // 石蜡 - 副产品
  productCategory: 'byproduct', 
  label: '石蜡'
}
```

### 3. 基准流 (Reference Flow)

| 字段 | 我们的系统 | OpenLCA | 差异分析 |
|------|------------|---------|----------|
| `value` | 数值 | Target Amount | ✅ 完全对应 |
| `unit` | 单位 | Flow Property + Unit | ✅ 简化表示 |
| `description` | 描述 | Flow Description | ⚠️ 我们增加的字段 |

**OpenLCA映射**：
```typescript
// 我们的表示
referenceFlow: {
  value: 1000,
  unit: 'kg',
  description: '1000kg钢材产品'
}

// 对应OpenLCA的：
// Target Amount: 1000
// Flow Property: Mass
// Unit: kg
```

### 4. 功能单位 (Functional Unit)

| 属性 | 我们的系统 | OpenLCA | 说明 |
|------|------------|---------|------|
| 定义层级 | 节点级别 | 产品系统级别 | ⚠️ 粒度更细 |
| `value` | 功能数量 | ✅ 包含在描述中 | 我们显式分离 |
| `unit` | 功能单位 | ✅ 包含在描述中 | 我们显式分离 |
| `standardReference` | 标准参考 | ❌ 无对应字段 | 我们扩展的企业级功能 |

**优势分析**：
```typescript
// 我们的细粒度定义
functionalUnit: {
  value: 1,
  unit: '台·年',
  description: '一台洗衣机使用一年的功能',
  standardReference: 'ISO 14040:2006'
}

// OpenLCA通常只有文本描述：
// "一台洗衣机使用一年"
```

### 5. 过程信息 (Process Information)

| 字段 | 我们的系统 | OpenLCA位置 | 对比分析 |
|------|------------|-------------|----------|
| `processType` | 过程级别 | Process → Process Type | ✅ 完全对应 |
| `systemBoundary` | 过程级别 | Product System → Description | ⚠️ 层级不同 |
| `cutOffRules` | 过程级别 | Method → Cut-off Rules | ⚠️ 层级不同 |
| `allocationMethod` | 过程级别 | Process → Allocation | ✅ 位置一致 |

## 🔄 数据结构映射

### OpenLCA → 我们的系统

```typescript
// OpenLCA产品系统结构
{
  referenceProcess: "smartphone_assembly",
  targetAmount: 1,
  targetUnit: "piece",
  functionalUnit: "1 smartphone for 2 years usage"
}

// 映射到我们的系统
{
  isMainProduct: true,
  productCategory: 'main',
  referenceFlow: {
    value: 1,
    unit: 'piece',
    description: '智能手机组装过程的参考流'
  },
  functionalUnit: {
    value: 1,
    unit: '台·2年',
    description: '一台智能手机使用2年的功能',
    standardReference: 'ISO 14040'
  }
}
```

## 🎨 设计优势

### 1. **更细粒度的控制**
- OpenLCA：功能单位在产品系统级别
- 我们：每个节点都可定义功能单位，支持复杂层级结构

### 2. **企业级扩展**
```typescript
// 企业标准化支持
functionalUnit: {
  standardReference: 'GB/T 24040-2008', // 支持国标
  description: '符合企业内部核算标准'
}
```

### 3. **实时验证**
```typescript
// 自动验证LCA理论一致性
if (mainProducts.length !== 1) {
  throw new Error('每个LCA系统必须有且仅有一个主要产品');
}
```

## 📋 实施建议

### 1. **渐进式迁移**
```typescript
// 阶段1：添加基础LCA字段
interface BasicLCANode {
  isMainProduct?: boolean;
  productCategory?: 'main' | 'co_product' | 'byproduct';
}

// 阶段2：完善详细信息
interface CompleteLCANode extends BasicLCANode {
  referenceFlow?: ReferenceFlow;
  functionalUnit?: FunctionalUnit;
  processInfo?: ProcessInfo;
}
```

### 2. **数据兼容性**
```typescript
// 支持从OpenLCA导入
function importFromOpenLCA(openLCAData: any): NodeData {
  return {
    isMainProduct: openLCAData.isReferenceProduct,
    productCategory: openLCAData.isReferenceProduct ? 'main' : 'co_product',
    referenceFlow: {
      value: openLCAData.targetAmount,
      unit: openLCAData.targetUnit,
      description: `${openLCAData.targetAmount} ${openLCAData.targetUnit}`
    }
  };
}
```

### 3. **验证规则**
```typescript
// LCA理论验证
const lcaRules = {
  mainProduct: '每个系统必须有且仅有一个主要产品',
  functionalUnit: '主要产品必须定义功能单位',
  referenceFlow: '主要产品必须定义基准流',
  allocation: '多产品过程必须指定分配方法'
};
```

## 🔗 与图片理论的对应

根据您提供的LCA理论图片：

1. **过程** → `processInfo.processType: 'unit_process'`
2. **输入及输出** → `inputs: string[]` 和 `outputs: string[]` (节点ID数组)
3. **主要产品** → `isMainProduct: true` + `productCategory: 'main'`
4. **功能单位** → `functionalUnit` 对象
5. **基准流** → `referenceFlow` 对象

### 📋 输入输出关系设计

**简化设计原则**：
- 使用节点ID数组表示输入输出关系
- 避免重复建模，充分利用现有节点结构
- 与React Flow的边(edges)概念完美对应

```typescript
// ✅ 简洁的输入输出设计
interface ProcessNode {
  inputs?: string[];   // 输入节点ID数组 ['silicon-node', 'energy-node']
  outputs?: string[];  // 输出节点ID数组 ['chip-node', 'waste-node']
}

// 对应OpenLCA的Input/Output flows
// 但我们使用节点引用而不是独立的流对象
```

**优势**：
1. **避免重复建模**：物质信息存储在对应节点中
2. **图形一致性**：与React Flow的边完全对应
3. **数据完整性**：所有物质属性都在节点的完整数据结构中
4. **查询效率**：可以直接通过节点ID查找详细信息

我们的设计完全符合LCA理论要求，同时提供了比OpenLCA更灵活的企业级功能。 