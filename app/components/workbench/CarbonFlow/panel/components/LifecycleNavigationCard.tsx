import React from 'react';
import { Card, Button, Space } from 'antd';

const lifecycleStages = ['全部', '原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];

interface LifecycleNavigationCardProps {
  selectedStage: string;
  onStageSelect: (stage: string) => void;
  className?: string;
}

export const LifecycleNavigationCard: React.FC<LifecycleNavigationCardProps> = ({
  selectedStage,
  onStageSelect,
  className,
}) => {
  return (
    <Card
      title="生命周期阶段"
      size="small"
      className={`flex-grow flex flex-col min-h-0 bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor ${className || ''}`}
    >
      <div className="flex-grow overflow-y-auto">
        <Space direction="vertical" className="w-full lifecycle-nav-bar">
          {lifecycleStages.map((stage) => (
            <Button
              key={stage}
              type={selectedStage === stage ? 'primary' : 'text'}
              onClick={() => onStageSelect(stage)}
              block
              className={`text-left ${stage === '全部' ? 'lifecycle-all-button' : ''}`}
            >
              {stage}
            </Button>
          ))}
        </Space>
      </div>
    </Card>
  );
};

export default LifecycleNavigationCard;
