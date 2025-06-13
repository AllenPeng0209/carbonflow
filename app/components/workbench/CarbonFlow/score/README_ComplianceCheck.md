# 合规检查功能说明

## 概述

合规检查模块提供了对多种环境和碳足迹相关法规的自动评分和检查功能，参考了AI工作流分析的设计模式，为LCA建模提供全面的法规合规性评估。

## 支持的法规标准

### 1. **ISO 14067** - 产品碳足迹
- 产品标识要求
- 系统边界定义  
- 碳足迹计算方法
- 数据质量评估
- 不确定性分析
- 第三方验证

### 2. **GHG Protocol** - 温室气体协议
- Scope 1 直接排放
- Scope 2 间接电力排放
- Scope 3 其他间接排放
- 基准年设定
- 减排目标设定

### 3. **CBAM** - 欧盟碳边境调节机制
- 商品分类要求
- 碳含量计算
- 生产路径识别
- 监测报告系统
- 第三方验证

### 4. **其他标准**
- ISO 14040/14044 (LCA标准)
- ISO 14064 (温室气体核算)
- PAS 2050 (碳足迹规范)
- EU Taxonomy (欧盟分类法)
- TCFD (气候相关财务披露)
- CSRD (企业可持续发展报告)
- SBTi (科学碳目标倡议)

## 使用方法

### 1. 基本使用

```tsx
import { ComplianceCheck } from '~/components/workbench/CarbonFlow/score/ComplianceCheck';

// 在碳流分析界面中使用
<ComplianceCheck setSelectedNode={setSelectedNode} />
```

### 2. 配置合规检查

```tsx
// 选择要检查的法规标准
const selectedStandards = ['ISO_14067', 'GHG_PROTOCOL', 'CBAM'];

// 配置检查参数
const configuration = {
  enabledStandards: selectedStandards,
  reportFormat: 'detailed',
  includeRecommendations: true,
  includeNodeLevel: true,
  autoRefresh: true,
  thresholds: {
    critical: 60,    // 关键问题阈值
    warning: 75,     // 警告阈值  
    acceptable: 90   // 可接受阈值
  }
};
```

### 3. 手动触发检查

```tsx
import { createComplianceChecker } from '~/types/complianceCheck';

// 为特定标准创建检查器
const iso14067Checker = createComplianceChecker('ISO_14067');

// 执行合规检查
const result = iso14067Checker.checkCompliance(nodes, workflowData);

// 生成改进建议
const improvements = iso14067Checker.generateImprovements(result);
```

## 功能特性

### 1. **综合评分**
- 多标准平均得分
- 最佳/最差表现标准识别
- 权重化评分支持

### 2. **详细分析**
- 各标准单独评分
- 强制要求 vs 推荐要求
- 按类别分组的要求检查

### 3. **节点级问题识别**
- 自动识别有问题的节点
- 按严重性分类问题
- 点击跳转到问题节点

### 4. **通用问题识别**
- 跨标准的共同问题
- 影响多个标准的根本原因
- 优化建议的优先级排序

### 5. **行动项建议**
- 按影响优先级排序
- 预期改善分数估算
- 工作量评估 (低/中/高)

## 评分机制

### 评分等级
- **90-100分**: 完全合规 ✅
- **75-89分**: 基本合规 🔵  
- **60-74分**: 部分合规 ⚠️
- **0-59分**: 不合规 ❌

### 权重分配
每个法规的要求按重要性分配权重：
- **关键要求 (Critical)**: 权重 0.6
- **重要要求 (Major)**: 权重 0.3  
- **次要要求 (Minor)**: 权重 0.1

### 计算公式
```
总分 = Σ(要求得分 × 要求权重) / Σ(要求权重)
```

## 自定义扩展

### 1. 添加新的法规标准

```tsx
// 定义新标准的要求
export const CustomStandardRequirements: ComplianceRequirement[] = [
  {
    id: 'custom_requirement_1',
    name: '自定义要求',
    description: '要求描述',
    severity: 'critical',
    category: '要求类别',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['检查标准1', '检查标准2'],
    evidenceRequired: ['所需证据1', '所需证据2']
  }
];

// 在getStandardRequirements函数中添加
function getStandardRequirements(standard: ComplianceStandard): ComplianceRequirement[] {
  switch (standard) {
    case 'CUSTOM_STANDARD':
      return CustomStandardRequirements;
    // ... 其他标准
  }
}
```

### 2. 自定义检查逻辑

```tsx
// 重写特定要求的检查逻辑
function calculateRequirementScore(
  requirement: ComplianceRequirement,
  nodes: Node<NodeData>[],
  workflowData?: any
): number {
  switch (requirement.id) {
    case 'custom_requirement_1':
      // 实现自定义检查逻辑
      return customCheckLogic(nodes, workflowData);
    
    default:
      return defaultCheckLogic(requirement, nodes, workflowData);
  }
}
```

## 最佳实践

### 1. **定期检查**
- 启用自动刷新功能
- 在关键节点修改后手动检查
- 导出合规报告存档

### 2. **优先级管理**
- 先解决关键 (Critical) 问题
- 关注影响多个标准的通用问题
- 按预期影响分数优化改进顺序

### 3. **证据管理**
- 为每个节点上传相关证据文件
- 确保证据文件已通过验证
- 维护清晰的数据来源记录

### 4. **团队协作**
- 使用节点评论功能讨论合规问题
- 分配专人负责特定法规的合规性
- 定期review合规状态

## 常见问题

### Q: 如何提高ISO 14067评分？
A: 
1. 确保产品信息完整（产品名称、描述、功能单位）
2. 明确定义系统边界和包含/排除的过程
3. 使用认可的碳足迹计算方法
4. 上传数据质量评估报告
5. 进行不确定性分析
6. 寻求第三方验证

### Q: CBAM合规的关键要点？
A:
1. 正确分类CBAM适用商品
2. 准确计算产品碳含量
3. 清晰记录生产路径
4. 建立有效的监测报告系统
5. 满足第三方验证要求

### Q: 如何处理跨标准的通用问题？
A:
1. 优先解决影响多个标准的根本问题
2. 建立统一的数据收集和管理流程
3. 确保证据文件满足多个标准的要求
4. 定期进行综合性的合规检查

## 技术支持

如有技术问题或功能建议，请联系开发团队或在项目仓库中提交Issue。 