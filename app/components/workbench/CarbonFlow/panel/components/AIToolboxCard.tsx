import React, { useState } from 'react';
import { Card, Button, Space, message } from 'antd';
import { ExperimentOutlined, FunctionOutlined, CloudDownloadOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { AIRiskAssessmentModal } from './AIRiskAssessmentModal';
import type { NodeData } from '~/types/nodes';

interface AIToolboxCardProps {
  onOpenAIFileParseModal: () => void;
  onOpenAIAutoFillModal: () => void;
  onOpenSupplierDataCollection?: () => void;
  nodes?: NodeData[];
  workflowId?: string;
}

export const AiToolboxCard: React.FC<AIToolboxCardProps> = ({
  onOpenAIFileParseModal,
  onOpenAIAutoFillModal,
  onOpenSupplierDataCollection,
  nodes = [],
  workflowId = '',
}) => {
  const [riskAssessmentVisible, setRiskAssessmentVisible] = useState(false);

  const handleOpenRiskAssessment = () => {
    if (nodes.length === 0) {
      message.warning('请先添加排放源节点后再进行风险评测');
      return;
    }

    setRiskAssessmentVisible(true);
  };

  return (
    <>
      <Card
        title="AI工具箱"
        size="small"
        className="flex-grow min-h-0 bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor flex flex-col"
        bodyStyle={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '16px',
        }}
      >
        <Space size="large" wrap>
          <Button icon={<ExperimentOutlined />} onClick={onOpenAIFileParseModal} type="default">
            AI文件解析
          </Button>
          <Button icon={<FunctionOutlined />} onClick={onOpenAIAutoFillModal} type="default">
            AI数据补全
          </Button>
          <Button
            icon={<CloudDownloadOutlined />}
            onClick={onOpenSupplierDataCollection || (() => message.info('AI数据收集功能待实现'))}
            type="default"
          >
            AI数据收集
          </Button>
          <Button icon={<SecurityScanOutlined />} onClick={handleOpenRiskAssessment} type="default">
            AI风险评测
          </Button>
        </Space>
      </Card>

      <AIRiskAssessmentModal
        visible={riskAssessmentVisible}
        onClose={() => setRiskAssessmentVisible(false)}
        nodes={nodes}
        workflowId={workflowId}
      />
    </>
  );
};
