import React from 'react';
import { Card, Button, Row, Col, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { SceneInfoType } from '~/types/scene';

interface SceneInfoCardProps {
  sceneInfo: SceneInfoType;
  onOpenSettings: () => void;
}

export const SceneInfoCard: React.FC<SceneInfoCardProps> = ({ sceneInfo, onOpenSettings }) => {
  return (
    <Card
      title="目标与范围"
      size="small"
      extra={
        <Button type="link" icon={<SettingOutlined />} onClick={onOpenSettings}>
          设置
        </Button>
      }
      className="flex-shrink-0 bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor"
      bodyStyle={{ overflow: 'auto', padding: '16px' }}
    >
      <Row gutter={24} className="w-full">
        <Col span={5} className="border-r border-bolt-elements-borderColor pr-4">
          <div className="text-sm font-semibold text-bolt-elements-textSecondary mb-1">核算产品:</div>
          <Tooltip title={sceneInfo?.productName || '未设置'}>
            <div className="text-sm text-bolt-elements-textPrimary truncate">{sceneInfo?.productName || '未设置'}</div>
          </Tooltip>
        </Col>
        <Col span={9} className="border-r border-bolt-elements-borderColor pr-4 pl-4">
          <Tooltip
            title={
              sceneInfo?.dataCollectionStartDate && sceneInfo?.dataCollectionEndDate
                ? `${new Date(sceneInfo.dataCollectionStartDate).toLocaleDateString()} - ${new Date(sceneInfo.dataCollectionEndDate).toLocaleDateString()}`
                : '未设置'
            }
          >
            <div className="text-sm text-bolt-elements-textPrimary mb-2 truncate">
              数据收集时间范围:
              {sceneInfo?.dataCollectionStartDate && sceneInfo?.dataCollectionEndDate
                ? `${new Date(sceneInfo.dataCollectionStartDate).toLocaleDateString()} - ${new Date(sceneInfo.dataCollectionEndDate).toLocaleDateString()}`
                : '未设置'}
            </div>
          </Tooltip>
          <Tooltip
            title={
              sceneInfo?.totalOutputValue && sceneInfo?.totalOutputUnit
                ? `${sceneInfo.totalOutputValue} ${sceneInfo.totalOutputUnit}`
                : '未设置'
            }
          >
            <div className="text-sm text-bolt-elements-textPrimary mb-2 truncate">
              总产量:
              {sceneInfo?.totalOutputValue && sceneInfo?.totalOutputUnit
                ? `${sceneInfo.totalOutputValue} ${sceneInfo.totalOutputUnit}`
                : '未设置'}
            </div>
          </Tooltip>
          <Tooltip
            title={
              sceneInfo?.benchmarkValue && sceneInfo?.benchmarkUnit
                ? `${sceneInfo.benchmarkValue} ${sceneInfo.benchmarkUnit}`
                : '未设置'
            }
          >
            <div className="text-sm text-bolt-elements-textPrimary truncate">
              核算基准:
              {sceneInfo?.benchmarkValue && sceneInfo?.benchmarkUnit
                ? `${sceneInfo.benchmarkValue} ${sceneInfo.benchmarkUnit}`
                : '未设置'}
            </div>
          </Tooltip>
        </Col>
        <Col span={10} className="pl-4">
          <Tooltip title={sceneInfo?.verificationLevel || '未设置'}>
            <div className="text-sm text-bolt-elements-textPrimary mb-2 truncate">
              预期核验级别: {sceneInfo?.verificationLevel || '未设置'}
            </div>
          </Tooltip>
          <Tooltip title={sceneInfo?.standard || '未设置'}>
            <div className="text-sm text-bolt-elements-textPrimary mb-2 truncate">
              满足标准: {sceneInfo?.standard || '未设置'}
            </div>
          </Tooltip>
          <Tooltip
            title={
              sceneInfo?.lifecycleType === 'full'
                ? '全生命周期 (摇篮到坟墓)'
                : sceneInfo?.lifecycleType === 'half'
                  ? '半生命周期 (摇篮到大门)'
                  : sceneInfo?.lifecycleType === 'custom'
                    ? '自定义生命周期'
                    : '未设置'
            }
          >
            <div className="text-sm text-bolt-elements-textPrimary truncate">
              生命周期范围:
              {sceneInfo?.lifecycleType === 'full'
                ? '全生命周期 (摇篮到坟墓)'
                : sceneInfo?.lifecycleType === 'half'
                  ? '半生命周期 (摇篮到大门)'
                  : sceneInfo?.lifecycleType === 'custom'
                    ? '自定义生命周期'
                    : '未设置'}
            </div>
          </Tooltip>
        </Col>
      </Row>
    </Card>
  );
};

export default SceneInfoCard;
