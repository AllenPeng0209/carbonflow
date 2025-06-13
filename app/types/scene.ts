export type SceneInfoType = {
  workflowId?: string; // 工作流ID
  verificationLevel?: string; // 预期核验级别
  standard?: string; // 满足标准 (PRD) / 核算标准 (Screenshot)
  productName?: string; // 核算产品

  // New fields from PRD/Screenshot
  taskName?: string; // 核算任务名称
  productSpecs?: string; // 产品规格 (for display)
  productDesc?: string; // 产品描述 (for display)

  dataCollectionStartDate?: string; // 数据收集开始时间 (Antd DatePicker will store as string or Moment object, handle accordingly)
  dataCollectionEndDate?: string; // 数据收集结束时间

  totalOutputValue?: number; // 产品总产量 - 数值
  totalOutputUnit?: string; // 产品总产量 - 单位

  benchmarkValue?: number; // 核算基准 - 数值
  benchmarkUnit?: string; // 核算基准 - 单位

  conversionFactor?: number; // 总产量单位转换系数 (Screenshot: next to 核算基准)

  functionalUnit?: string; // 功能单位

  scope?: string; // 核算范围
  industry?: string; // 行业
  systemBoundary?: string; // 系统边界
  // 更新生命周期类型以支持自定义选项
  lifecycleType?: 'half' | 'full' | 'custom'; // 生命周期边界选择
  calculationBoundaryHalfLifecycle?: string[]; // 半生命周期阶段
  calculationBoundaryFullLifecycle?: string[]; // 全生命周期阶段
  calculationBoundarySelectedStages?: string[]; // 自定义选择的阶段

  // 新增表单中使用的字段
  reportType?: string; // 报告类型
  uncertaintyAssessment?: string; // 不确定性评估方法
  dataQualityAssessment?: string; // 数据质量评估
};
