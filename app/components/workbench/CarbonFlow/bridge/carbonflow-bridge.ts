/*
 * carbonflow-bridge.ts
 * 用于连接大模型输出的CarbonFlow操作与CarbonFlow组件
 */

import type { CarbonFlowAction } from '~/types/actions';
import type { ActionCallbackData } from '~/lib/runtime/message-parser';
import { ActionRunner } from '~/lib/runtime/action-runner';

/**
 * CarbonFlow桥接器
 *
 * 负责：
 * 1. 初始化事件监听
 * 2. 将AI生成的CarbonFlow操作发送到CarbonFlow组件
 * 3. 处理操作响应
 */
export class CarbonFlowBridge {
  private static _instance: CarbonFlowBridge;
  private _initialized: boolean = false;
  private static _extendedActionRunnerPrototype = false; // 防止重复修改原型

  /**
   * 获取单例实例
   */
  static getInstance(): CarbonFlowBridge {
    if (!CarbonFlowBridge._instance) {
      CarbonFlowBridge._instance = new CarbonFlowBridge();
    }

    return CarbonFlowBridge._instance;
  }

  /**
   * 初始化桥接器
   */
  initialize(): void {
    // 不再需要 actionRunnerInstance 参数
    console.log('[CarbonFlowBridge.initialize] Attempting to initialize...');

    if (this._initialized) {
      console.warn('CarbonFlow桥接器实例已经初始化，跳过。');
      return;
    }

    this._extendActionRunnerPrototype(); // 修改原型
    this._setupEventListeners(); // 设置事件监听器

    this._initialized = true;
    console.log(
      '[CarbonFlowBridge.initialize] Initialization complete, ActionRunner.prototype extended, event listeners set up.',
    );
  }

  /**
   * 扩展ActionRunner.prototype，添加对CarbonFlow操作的处理
   */
  private _extendActionRunnerPrototype(): void {
    if (CarbonFlowBridge._extendedActionRunnerPrototype) {
      console.log('[CarbonFlowBridge.extendActionRunnerPrototype] ActionRunner.prototype 已经扩展过，跳过。');
      return;
    }

    console.log('[CarbonFlowBridge.extendActionRunnerPrototype] Extending ActionRunner.prototype...');

    const originalRunAction = ActionRunner.prototype.runAction;

    ActionRunner.prototype.runAction = async function (
      this: ActionRunner, // 确保 this 指向 ActionRunner 实例
      data: ActionCallbackData, // 修改参数类型
      isStreaming = false,
    ) {
      /*
       * 尝试从 data.action 获取，如果不存在，则从 ActionRunner 的内部存储中获取
       * this.actions 是 ActionRunner 实例的属性
       */
      const actionToProcess = data.action ?? this.actions.get()[data.actionId];
      const actionId = data.actionId;

      console.log(
        `[CarbonFlowBridge - Patched runAction] 处理 Action ID: ${actionId}, Type: ${actionToProcess?.type}, Streaming: ${isStreaming}`,
        actionToProcess,
      );

      if (!actionToProcess) {
        console.error(
          `[CarbonFlowBridge - Patched runAction] Action not found in data or store for actionId: ${actionId}. Calling original ActionRunner.runAction.`,
        );
        return originalRunAction.call(this, data, isStreaming);
      }

      if (actionToProcess.type === 'carbonflow') {
        console.log('[CarbonFlowBridge - Patched runAction] 检测到 CarbonFlow action:', actionToProcess);

        // 调用 CarbonFlowBridge 实例的方法来分发事件
        CarbonFlowBridge.getInstance().dispatchCarbonFlowAction(actionToProcess as CarbonFlowAction);

        // 已经通过事件分发，不再调用原始 runAction 以避免重复处理
        return;
      }

      /*
       * 对于非 carbonflow 类型的操作，调用原始的 runAction 逻辑
       * 这里的 this 已经是 ActionRunner 实例
       */
      return originalRunAction.call(this, data, isStreaming);
    };

    CarbonFlowBridge._extendedActionRunnerPrototype = true;
    console.log('[CarbonFlowBridge.extendActionRunnerPrototype] ActionRunner.prototype.runAction 已被覆盖');
  }

  /**
   * 分发CarbonFlow操作到组件
   */
  dispatchCarbonFlowAction(action: CarbonFlowAction): void {
    if (!this._initialized) {
      console.error('CarbonFlow桥接器未初始化');
      return;
    }

    console.log(`[CarbonFlowBridge] 分发操作: ${action.operation}`, action);

    // 添加跟踪ID
    const enrichedAction = {
      ...action,
      traceId: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    /*
     * 创建自定义事件并分发到 window，或者特定组件
     * 如果你的 CarbonFlow 组件直接监听 window 事件，则 window.dispatchEvent(event) 是可以的
     * 如果 CarbonFlow 组件是 DOM 中的一个特定元素，并且你想更精确地定位事件，可以考虑：
     * const component = document.querySelector('carbon-flow-component'); // 假设这是你的组件的选择器
     * if (component) { component.dispatchEvent(event); } else { console.error('CarbonFlow component not found for event dispatch'); }
     */
    const event = new CustomEvent('carbonflow-action', {
      detail: { action: enrichedAction },
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event); // 继续使用 window dispatch，假设组件能监听到
  }

  /**
   * 设置全局事件监听
   */
  private _setupEventListeners(): void {
    // 监听carbonflow-action事件的结果回调
    window.addEventListener('carbonflow-action-result', (event: Event) => {
      const customEvent = event as CustomEvent;
      const result = customEvent.detail;

      console.log('[CarbonFlowBridge] 操作结果:', result);
    });

    // 为了方便调试，添加全局监听器
    window.addEventListener('carbonflow-action', (event) => {
      const customEvent = event as CustomEvent;
      console.log('[CarbonFlowBridge] ===== 收到carbonflow-action事件 =====');
      console.log('[CarbonFlowBridge] 事件时间:', new Date().toISOString());
      console.log('[CarbonFlowBridge] 原始事件详情:', JSON.stringify(customEvent.detail, null, 2));

      // 正确访问事件结构：{ action: actualAction }
      if (customEvent.detail && typeof customEvent.detail === 'object' && 'action' in customEvent.detail) {
        const action = customEvent.detail.action as CarbonFlowAction;
        console.log(`[CarbonFlowBridge] 接收到操作: ${action?.operation}`, {
          type: action?.type,
          operation: action?.operation,
          fileName: (action as any)?.fileName,
          dataLength: action?.data?.length,
        });
      } else {
        console.error('[CarbonFlowBridge] ❌ 事件详情格式错误，缺少action属性');
        console.error('[CarbonFlowBridge] 收到的详情:', customEvent.detail);
      }

      console.log('[CarbonFlowBridge] ===== carbonflow-action事件处理完成 =====');
    });
  }
}

/**
 * 用于从其他组件访问桥接器的辅助函数
 */
export const getCarbonFlowBridge = (): CarbonFlowBridge => {
  return CarbonFlowBridge.getInstance();
};

export const testPlanAction = (): void => {
  const bridge = getCarbonFlowBridge();

  const planActionTest: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'plan',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      补充目标与范围内容: '已完成',
      排放源清单整理: '进行中',
      活动数据收集: '未开始',
      活动数据证明材料提供: '未开始',
      '背景（因子）数据配置': '未开始',
      可信打分及优化提升: '未开始',
      数据风险评测: '未开始',
    }),
    description: 'Test plan action to update task statuses',
  };

  bridge.dispatchCarbonFlowAction(planActionTest);
  console.log('Dispatched test plan action via testPlanAction().');
};

// 全套 CarbonFlow Action 測試函數

export const testSceneAction = (): void => {
  const bridge = getCarbonFlowBridge();

  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'scene',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      workflowId: 'test_workflow',
      verificationLevel: 'high',
      standard: 'ISO 14067',
      productName: '测试产品',
      taskName: '测试核算任务',
      productSpecs: '测试产品规格',
      productDesc: '测试产品描述',
      dataCollectionStartDate: '2023-01-01',
      dataCollectionEndDate: '2023-12-31',
      totalOutputValue: 1000,
      totalOutputUnit: 'kg',
      benchmarkValue: 500,
      benchmarkUnit: 'kg',
      conversionFactor: 2,
      functionalUnit: 'kg',
      lifecycleType: 'full',
      calculationBoundaryHalfLifecycle: [],
      calculationBoundaryFullLifecycle: [],
    }),
    description: '测试场景规划 scene 操作',
  };
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test scene action.');
};

export const testCreateNodeAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'create',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      label: '测试产品节点',
      nodeId: 'test_product',
      nodeType: 'product',
      position: JSON.stringify({ x: 150, y: 150 }),
      lifecycleStage: '原材料获取阶段',
      emissionType: '上游间接排放',
      carbonFactor: 2.5,
      activitydataSource: '测试数据',
      activityScore: 8.0,
      carbonFootprint: 250,
      material: '测试材料',
      weight: '1kg',
    }),
    description: '测试新增节点 create 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test create_node action.');
};

export const testUpdateNodeAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'update',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      nodeId: 'node_1',
      label: '更新后的节点',
      data: { desc: '已更新节点属性' },
    }),
    description: '测试更新节点 update 操作',
  };
  const bridge = getCarbonFlowBridge();

  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test update_node action.');
};

export const testDeleteNodeAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'delete',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      nodeId: 'node_1',
    }),
    description: '测试删除节点 delete 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test delete_node action.');
};

export const testConnectNodesAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'connect',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      source: 'node_1',
      target: 'node_2',
      label: '物料流',
    }),
    description: '测试连接节点 connect 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test connect_nodes action.');
};

export const testLayoutAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'layout',
    workflowid: 'test_workflow',
    content: JSON.stringify({ type: 'vertical' }),
    description: '测试布局调整 layout 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test layout action.');
};

export const testCalculateAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'calculate',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      scope: 'all',
      nodes: ['node_1', 'node_2'],
    }),
    description: '测试计算碳足迹 calculate 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test calculate action.');
};

export const testFileParserAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'file_parser',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      fileType: 'excel',
      fileName: 'carbon_data.xlsx',
      sheet: 'Sheet1',
    }),
    description: '测试文件解析 file_parser 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test file_parser action.');
};

export const testGenerateSupplierTaskAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'generate_supplier_task',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      supplier: '供应商A',
      task: '数据收集',
      deadline: '2025-06-01',
    }),
    description: '测试生成供应商数据收集任务 generate_supplier_task 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test generate_supplier_task action.');
};

export const testCarbonFactorMatchAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'carbon_factor_match',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      nodeId: 'node_1',
      factorType: '电力',
      factorValue: 0.58,
    }),
    description: '测试碳因子匹配 carbon_factor_match 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test carbon_factor_match action.');
};

export const testCarbonFactorMatchWithAIAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'carbon_factor_match_with_ai',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      // nodeId is not provided, so it will process all nodes that lack a carbon factor.
    }),
    description: '测试碳因子AI匹配 (所有节点)',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test carbon_factor_match_with_ai action (all nodes).');
};

export const testAIAutofillAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'ai_autofill',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      nodeId: 'node_1',
      autofillType: 'activity_data',
      suggestion: 'AI自动补全的活动数据',
    }),
    description: '测试AI数据补全 ai_autofill 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test ai_autofill action.');
};

export const testGenerateDataValidationTaskAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'generate_data_validation_task',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      nodeId: 'node_1',
      validationType: '数据一致性',
      deadline: '2025-06-10',
    }),
    description: '测试生成数据验证任务 generate_data_validation_task 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test generate_data_validation_task action.');
};

export const testReportAction = (): void => {
  const action: CarbonFlowAction = {
    type: 'carbonflow',
    operation: 'report',
    workflowid: 'test_workflow',
    content: JSON.stringify({
      reportType: '碳足迹报告',
      format: 'pdf',
      includeDetails: true,
    }),
    description: '测试生成报告 report 操作',
  };
  const bridge = getCarbonFlowBridge();
  bridge.dispatchCarbonFlowAction(action);
  console.log('Dispatched test report action.');
};

// 全部暴露到 window
if (typeof window !== 'undefined') {
  (window as any).testPlanAction = testPlanAction;
  (window as any).testSceneAction = testSceneAction;
  (window as any).testCreateNodeAction = testCreateNodeAction;
  (window as any).testUpdateNodeAction = testUpdateNodeAction;
  (window as any).testDeleteNodeAction = testDeleteNodeAction;
  (window as any).testConnectNodesAction = testConnectNodesAction;
  (window as any).testLayoutAction = testLayoutAction;
  (window as any).testCalculateAction = testCalculateAction;
  (window as any).testFileParserAction = testFileParserAction;
  (window as any).testGenerateSupplierTaskAction = testGenerateSupplierTaskAction;
  (window as any).testCarbonFactorMatchAction = testCarbonFactorMatchAction;
  (window as any).testCarbonFactorMatchWithAIAction = testCarbonFactorMatchWithAIAction;
  (window as any).testAIAutofillAction = testAIAutofillAction;
  (window as any).testGenerateDataValidationTaskAction = testGenerateDataValidationTaskAction;
  (window as any).testReportAction = testReportAction;
}
