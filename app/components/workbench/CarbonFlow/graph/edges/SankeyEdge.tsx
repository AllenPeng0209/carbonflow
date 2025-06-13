import React from 'react';
import type { EdgeProps } from 'reactflow';

interface SankeyEdgeData {
  sankeyPath?: string;
  sourceNode?: any;
  targetNode?: any;
  flowValue?: number;
}

/**
 * 生成动态桑基图路径
 */
const generateDynamicSankeyPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  strokeWidth: number,
): string => {
  const halfWidth = strokeWidth / 2;
  const controlPointOffset = Math.abs(targetX - sourceX) * 0.4;

  // 计算路径点
  const sourceTop = sourceY - halfWidth;
  const sourceBottom = sourceY + halfWidth;
  const targetTop = targetY - halfWidth;
  const targetBottom = targetY + halfWidth;

  const sourceControlX = sourceX + controlPointOffset;
  const targetControlX = targetX - controlPointOffset;

  // 创建桑基图流带路径
  return `
    M ${sourceX} ${sourceTop}
    C ${sourceControlX} ${sourceTop}, ${targetControlX} ${targetTop}, ${targetX} ${targetTop}
    L ${targetX} ${targetBottom}
    C ${targetControlX} ${targetBottom}, ${sourceControlX} ${sourceBottom}, ${sourceX} ${sourceBottom}
    Z
  `.trim();
};

/**
 * 桑基图自定义边组件
 */
export const SankeyEdge: React.FC<EdgeProps<SankeyEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition: _sourcePosition,
  targetPosition: _targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  // 获取连线宽度，优先使用style中的strokeWidth
  const strokeWidth = (style?.strokeWidth as number) || 10;
  const flowValue = data?.flowValue || 0;

  // 根据流量值确定颜色
  const getFlowColor = (value: number): string => {
    if (value > 50) {
      return '#ef4444'; // 红色 - 高碳足迹
    }

    if (value > 10) {
      return '#f59e0b'; // 橙色 - 中等碳足迹
    }

    if (value > 0) {
      return '#10b981'; // 绿色 - 低碳足迹
    }

    return '#6b7280'; // 灰色 - 无数据
  };

  // 动态生成桑基图路径
  const sankeyPath = generateDynamicSankeyPath(sourceX, sourceY, targetX, targetY, strokeWidth);
  const flowColor = getFlowColor(flowValue);

  return (
    <g>
      {/* 桑基图渐变定义 */}
      <defs>
        <linearGradient id={`sankeyGradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={flowColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={flowColor} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* 桑基图路径 - 使用动态计算的路径 */}
      <path
        id={id}
        d={sankeyPath}
        fill={`url(#sankeyGradient-${id})`}
        stroke={flowColor}
        strokeWidth={strokeWidth > 5 ? 1 : 0}
        className="react-flow__edge-path"
        markerEnd={markerEnd}
        style={{
          ...style,
          opacity: 0.8,
        }}
      />

      {/* 流量标签 */}
      {flowValue > 0 && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          className="react-flow__edge-text"
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            fill: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}
        >
          {flowValue.toFixed(1)} kgCO₂e
        </text>
      )}

      {/* 添加一个透明的交互层，方便点击 */}
      <path
        d={sankeyPath}
        fill="transparent"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth, 10)}
        style={{ cursor: 'pointer' }}
      />
    </g>
  );
};
