import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import { useSankeyMode } from '~/components/workbench/CarbonFlow/graph/CarbonFlowGraph';

export const FinalProductNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  // 使用Context获取桑基图模式
  const isSankeyMode = useSankeyMode();

  /*
   * 根据模式决定Handle位置
   * 桑基图模式：流向从左到右，所以输入在左侧，输出在右侧
   * 层次布局模式：传统的上到下流向
   */
  const targetPosition = isSankeyMode ? Position.Left : Position.Top;
  const sourcePosition = isSankeyMode ? Position.Right : Position.Bottom;

  return (
    <div className="node final-product-node">
      <Handle type="target" position={targetPosition} />
      <div className="node-content">
        <div className="node-header">
          <div className="node-title">{data.label}</div>
          <div className="node-type">最終產品</div>
        </div>
        <div className="node-body">
          <div className="node-info">
            <div className="info-item">
              <span className="label">產品名稱:</span>
              <span className="value">{data.nodeId}</span>
            </div>
            <div className="info-item">
              <span className="label">生命週期階段:</span>
              <span className="value">{data.lifecycleStage}</span>
            </div>
            <div className="info-item">
              <span className="label">碳排放量:</span>
              <span className="value">{data.carbonFootprint} kgCO2e</span>
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={sourcePosition} />
    </div>
  );
};
