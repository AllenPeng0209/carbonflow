import { Handle, Position } from 'reactflow';
import { useSankeyMode } from '~/components/workbench/CarbonFlow/graph/CarbonFlowGraph';

interface ProductNodeProps {
  data: {
    label: string;
    nodeId: string;
    quantity: number;
    lifecycleStage: string;
    emissionType: string;
    carbonFactor: number;
    activitydataSource: string;
    activityScore: number;
    carbonFootprint: number;
    activityScorelevel?: '高' | '中' | '低' | '空';
  };
}

export const ProductNode = ({ data }: ProductNodeProps) => {
  // 使用Context获取桑基图模式
  const isSankeyMode = useSankeyMode();

  console.log('[ProductNode] 桑基图模式:', {
    nodeId: data.nodeId,
    isSankeyMode,
  });

  const getActivityScore = (level?: string) => {
    switch (level) {
      case '高':
        return 'high';
      case '中':
        return 'medium';
      case '低':
        return 'low';
      case '空':
        return 'very-low';
      default:
        return 'very-low';
    }
  };

  /*
   * 根据模式决定Handle位置
   * 桑基图模式：流向从左到右，所以输入在左侧，输出在右侧
   * 层次布局模式：传统的上到下流向
   */
  const targetPosition = isSankeyMode ? Position.Left : Position.Top;
  const sourcePosition = isSankeyMode ? Position.Right : Position.Bottom;

  return (
    <div className="node product-node" data-activity-score={getActivityScore(data.activityScorelevel)}>
      <Handle type="target" position={targetPosition} />

      <div className="node-content">
        <div className="node-header">
          <div className="node-title">{data.label}</div>
          <div className="node-type">原材料节点</div>
        </div>
        <div className="node-info">
          <div className="info-item">
            <span className="label">原材料名称:</span>
            <span className="value">{data.nodeId}</span>
          </div>
          <div className="info-item">
            <span className="label">生命週期阶段:</span>
            <span className="value">{data.lifecycleStage}</span>
          </div>
          <div className="info-item">
            <span className="label">排放类型:</span>
            <span className="value">{data.emissionType}</span>
          </div>
          <div className="info-item">
            <span className="label">数量:</span>
            <span className="value">{data.quantity}</span>
          </div>
          <div className="info-item">
            <span className="label">碳排放因子:</span>
            <span className="value">{data.carbonFactor}</span>
          </div>

          <div className="info-item">
            <span className="label">碳排放量:</span>
            <span className="value">{data.carbonFootprint}</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={sourcePosition} />
    </div>
  );
};
