/**
 * 多级供应商数据结构示例
 *
 * 这个文件展示了如何构建多级供应商的层级关系
 * 例如：产品A由产品B、C组成，产品B又由产品D、E组成
 */

import type { NodeData } from '~/types/nodes';

// 示例：智能手机的多级供应商结构
export const hierarchicalSupplierExample = {
  // 顶级产品：智能手机
  smartphone: {
    id: 'smartphone-001',
    data: {
      label: '智能手机',
      nodeType: 'product',
      level: 0,
      isComposite: true,
      childNodeIds: ['screen-001', 'battery-001', 'processor-001'],
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '1',
      activityUnit: '台',
      carbonFactor: '50.5',
      carbonFactorUnit: 'kgCO2e/台',
      supplierInfo: {
        name: '手机制造商A',
        tier: 1,
        isDirectSupplier: true,
      },
    } as NodeData,
  },

  // 第二级组件：屏幕
  screen: {
    id: 'screen-001',
    data: {
      label: 'OLED显示屏',
      nodeType: 'product',
      level: 1,
      parentNodeId: 'smartphone-001',
      compositionRatio: 0.3, // 占整机成本30%
      isComposite: true,
      childNodeIds: ['glass-001', 'oled-panel-001'],
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '1',
      activityUnit: '块',
      carbonFactor: '15.2',
      carbonFactorUnit: 'kgCO2e/块',
      supplierInfo: {
        name: '显示屏供应商B',
        tier: 2,
        isDirectSupplier: false,
        parentSupplierId: 'smartphone-001',
      },
    } as NodeData,
  },

  // 第二级组件：电池
  battery: {
    id: 'battery-001',
    data: {
      label: '锂离子电池',
      nodeType: 'product',
      level: 1,
      parentNodeId: 'smartphone-001',
      compositionRatio: 0.25, // 占整机成本25%
      isComposite: true,
      childNodeIds: ['lithium-001', 'cobalt-001'],
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '1',
      activityUnit: '块',
      carbonFactor: '12.8',
      carbonFactorUnit: 'kgCO2e/块',
      supplierInfo: {
        name: '电池供应商C',
        tier: 2,
        isDirectSupplier: false,
        parentSupplierId: 'smartphone-001',
      },
    } as NodeData,
  },

  // 第二级组件：处理器
  processor: {
    id: 'processor-001',
    data: {
      label: '芯片处理器',
      nodeType: 'product',
      level: 1,
      parentNodeId: 'smartphone-001',
      compositionRatio: 0.2, // 占整机成本20%
      isComposite: true,
      childNodeIds: ['silicon-001', 'rare-earth-001'],
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '1',
      activityUnit: '块',
      carbonFactor: '8.5',
      carbonFactorUnit: 'kgCO2e/块',
      supplierInfo: {
        name: '芯片供应商D',
        tier: 2,
        isDirectSupplier: false,
        parentSupplierId: 'smartphone-001',
      },
    } as NodeData,
  },

  // 第三级原材料：玻璃
  glass: {
    id: 'glass-001',
    data: {
      label: '强化玻璃',
      nodeType: 'product',
      level: 2,
      parentNodeId: 'screen-001',
      compositionRatio: 0.4, // 占屏幕成本40%
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '0.05',
      activityUnit: 'kg',
      carbonFactor: '1.2',
      carbonFactorUnit: 'kgCO2e/kg',
      supplierInfo: {
        name: '玻璃供应商E',
        tier: 3,
        isDirectSupplier: false,
        parentSupplierId: 'screen-001',
      },
    } as NodeData,
  },

  // 第三级原材料：OLED面板
  oledPanel: {
    id: 'oled-panel-001',
    data: {
      label: 'OLED发光面板',
      nodeType: 'product',
      level: 2,
      parentNodeId: 'screen-001',
      compositionRatio: 0.6, // 占屏幕成本60%
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '1',
      activityUnit: '块',
      carbonFactor: '9.1',
      carbonFactorUnit: 'kgCO2e/块',
      supplierInfo: {
        name: 'OLED面板供应商F',
        tier: 3,
        isDirectSupplier: false,
        parentSupplierId: 'screen-001',
      },
    } as NodeData,
  },

  // 第三级原材料：锂
  lithium: {
    id: 'lithium-001',
    data: {
      label: '锂金属',
      nodeType: 'product',
      level: 2,
      parentNodeId: 'battery-001',
      compositionRatio: 0.3, // 占电池成本30%
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '0.02',
      activityUnit: 'kg',
      carbonFactor: '5.5',
      carbonFactorUnit: 'kgCO2e/kg',
      supplierInfo: {
        name: '锂矿供应商G',
        tier: 3,
        isDirectSupplier: false,
        parentSupplierId: 'battery-001',
      },
    } as NodeData,
  },

  // 第三级原材料：钴
  cobalt: {
    id: 'cobalt-001',
    data: {
      label: '钴金属',
      nodeType: 'product',
      level: 2,
      parentNodeId: 'battery-001',
      compositionRatio: 0.25, // 占电池成本25%
      lifecycleStage: '原材料获取阶段',
      emissionType: '原材料',
      quantity: '0.015',
      activityUnit: 'kg',
      carbonFactor: '8.2',
      carbonFactorUnit: 'kgCO2e/kg',
      supplierInfo: {
        name: '钴矿供应商H',
        tier: 3,
        isDirectSupplier: false,
        parentSupplierId: 'battery-001',
      },
    } as NodeData,
  },
};

// 将示例数据转换为节点数组
export const getHierarchicalSupplierNodes = () => {
  return Object.values(hierarchicalSupplierExample).map((item, index) => ({
    id: item.id,
    type: item.data.nodeType,
    position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
    data: item.data,
  }));
};

/*
 *使用示例：
 *const exampleNodes = getHierarchicalSupplierNodes();
 *这些节点可以直接用于EmissionSourceTable组件
 */
