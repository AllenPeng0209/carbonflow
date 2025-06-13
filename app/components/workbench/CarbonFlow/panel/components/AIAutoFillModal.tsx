import React, { useState, useMemo } from 'react';
import {
  Modal,
  Button,
  Table,
  Row,
  Col,
  Typography,
  Radio,
  Input,
  Space,
  message,
  Badge,
  Tag,
  Card,
  Progress,
  Statistic,
  List,
  Avatar,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd/es/table';
import type { CarbonFlowAction } from '~/types/actions';

const lifecycleStages = ['原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];

const emissionCategories = ['原材料', '包装材料', '能耗', '运输', '废弃物'];

interface AIAutoFillModalProps {
  visible: boolean;
  onClose: () => void;
  nodes: any[];
  onAIAutofillCarbonFactorMatch: () => void;
  aiAutoFillSelectedRowKeys?: React.Key[];
  onAiAutoFillSelectedRowKeysChange?: (keys: React.Key[]) => void;
  aiAutoFillResult?: {
    success: string[];
    failed: { id: string; reason: string }[];
  } | null;
}

export const AIAutoFillModal: React.FC<AIAutoFillModalProps> = ({
  visible,
  onClose,
  nodes,
  onAIAutofillCarbonFactorMatch,
  aiAutoFillSelectedRowKeys: externalSelectedRowKeys,
  onAiAutoFillSelectedRowKeysChange,
  aiAutoFillResult: externalAiAutoFillResult,
}) => {
  // 筛选状态
  const [aiFilterStage, setAiFilterStage] = useState<string | undefined>(undefined);
  const [aiFilterName, setAiFilterName] = useState<string>('');
  const [aiFilterCategory, setAiFilterCategory] = useState<string | undefined>(undefined);
  const [aiFilterMissingActivity, setAiFilterMissingActivity] = useState<boolean>(false);
  const [aiFilterMissingConversion, setAiFilterMissingConversion] = useState<boolean>(false);
  const [aiFilterShowType, setAiFilterShowType] = useState<string>('all');

  // 选中的行 - 使用外部状态或内部状态
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<React.Key[]>([]);
  const aiAutoFillSelectedRowKeys = externalSelectedRowKeys ?? internalSelectedRowKeys;
  const setAiAutoFillSelectedRowKeys = onAiAutoFillSelectedRowKeysChange ?? setInternalSelectedRowKeys;

  // 确认弹窗状态
  const [aiAutoFillConfirmType, setAiAutoFillConfirmType] = useState<'conversion' | 'transport' | null>(null);

  // 补全结果状态 - 使用外部状态或内部状态
  const [internalAiAutoFillResult, setInternalAiAutoFillResult] = useState<{
    success: string[];
    failed: { id: string; reason: string }[];
  } | null>(null);
  const aiAutoFillResult = externalAiAutoFillResult ?? internalAiAutoFillResult;

  // 生命周期阶段到节点类型的映射
  const lifecycleStageToNodeTypeMap: Record<string, string> = {
    原材料获取阶段: 'product',
    生产制造阶段: 'manufacturing',
    分销运输阶段: 'distribution',
    使用阶段: 'usage',
    寿命终止阶段: 'disposal',
  };

  const nodeTypeToLifecycleStageMap: Record<string, string> = Object.fromEntries(
    Object.entries(lifecycleStageToNodeTypeMap).map(([key, value]) => [value, key]),
  );

  // 过滤节点数据 - 恢复完整过滤逻辑
  const filteredNodesForAIModal = useMemo(() => {
    return nodes.filter((node) => {
      const data = node.data as any;

      // 生命周期阶段筛选
      if (aiFilterStage && (nodeTypeToLifecycleStageMap[node.type || ''] || '未知') !== aiFilterStage) {
        return false;
      }

      // 排放源名称筛选
      if (aiFilterName && !(data?.label || '').includes(aiFilterName)) {
        return false;
      }

      // 排放源类别筛选
      const category = node.type === 'distribution' ? '运输' : data?.emissionType || '未分类';

      if (aiFilterCategory && category !== aiFilterCategory) {
        return false;
      }

      // 缺失活动数据筛选
      if (aiFilterMissingActivity) {
        const hasActivity = data?.quantity && data?.activityUnit;

        if (hasActivity) {
          return false; // 如果数据存在，则过滤掉
        }
      }

      // 缺失单位转换系数筛选
      if (aiFilterMissingConversion) {
        const hasConversion =
          data?.unitConversion !== undefined && data?.unitConversion !== null && data?.unitConversion !== '';

        if (hasConversion) {
          return false; // 如果数据存在，则过滤掉
        }
      }

      // AI数据筛选 - 使用AI生成标识字段
      if (aiFilterShowType === 'ai') {
        const hasAIData =
          data?.quantity_aiGenerated || data?.activityUnit_aiGenerated || data?.unitConversion_aiGenerated;

        if (!hasAIData) {
          return false;
        }
      } else if (aiFilterShowType === 'manual') {
        const hasAIData =
          data?.quantity_aiGenerated || data?.activityUnit_aiGenerated || data?.unitConversion_aiGenerated;

        if (hasAIData) {
          return false;
        }
      }

      return true;
    });
  }, [
    nodes,
    aiFilterStage,
    aiFilterName,
    aiFilterCategory,
    aiFilterMissingActivity,
    aiFilterMissingConversion,
    aiFilterShowType,
  ]);

  // 表格列定义 - 恢复完整配置
  const columnsAIAutoFill: TableProps<any>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (_: any, _record: any, index: number) => (
        <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
      ),
    },
    {
      title: <div style={{ fontWeight: 600, color: '#1890ff' }}>基本信息</div>,
      children: [
        {
          title: '生命周期阶段',
          key: 'lifecycleStage',
          width: 110,
          align: 'center',
          render: (_: any, record: any) => (
            <Tag color="blue">{nodeTypeToLifecycleStageMap[record.type || ''] || '未知'}</Tag>
          ),
        },
        {
          title: '排放源名称',
          dataIndex: ['data', 'label'],
          key: 'name',
          width: 120,
          align: 'center',
          render: (text: string) => <span style={{ fontWeight: 500, color: '#262626' }}>{text || '-'}</span>,
        },
        {
          title: '排放源类别',
          dataIndex: ['data', 'emissionType'],
          key: 'category',
          width: 100,
          align: 'center',
          render: (text: any, record: any) => {
            const category = record.type === 'distribution' ? '运输' : text || '未分类';
            const color = category === '运输' ? 'orange' : 'green';

            return <Tag color={color}>{category}</Tag>;
          },
        },
        {
          title: '补充信息',
          dataIndex: ['data', 'supplementaryInfo'],
          key: 'supplementaryInfo',
          width: 120,
          align: 'center',
          render: (text: any) => text || '-',
        },
      ],
    },
    {
      title: <div style={{ fontWeight: 600, color: '#52c41a' }}>活动水平数据</div>,
      children: [
        {
          title: '数值',
          dataIndex: ['data', 'quantity'],
          key: 'activityData',
          width: 90,
          align: 'center',
          render: (v: any, r: any) =>
            v ? (
              <span style={{ fontWeight: 500 }}>
                {v}
                {(r.data as any)?.activityData_aiGenerated && (
                  <Tag color="blue" style={{ marginLeft: 4, fontSize: '12px' }}>
                    <RobotOutlined /> AI
                  </Tag>
                )}
              </span>
            ) : (
              <span style={{ color: '#bfbfbf' }}>-</span>
            ),
        },
        {
          title: '单位',
          dataIndex: ['data', 'activityUnit'],
          key: 'activityUnit',
          width: 80,
          align: 'center',
          render: (v: any, r: any) =>
            v ? (
              <span style={{ fontWeight: 500 }}>
                {v}
                {(r.data as any)?.activityUnit_aiGenerated && (
                  <Tag color="blue" style={{ marginLeft: 4, fontSize: '12px' }}>
                    <RobotOutlined /> AI
                  </Tag>
                )}
              </span>
            ) : (
              <span style={{ color: '#bfbfbf' }}>-</span>
            ),
        },
        {
          title: '运输-起点',
          dataIndex: ['data', 'startPoint'],
          key: 'startPoint',
          width: 120,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '运输-终点',
          dataIndex: ['data', 'endPoint'],
          key: 'endPoint',
          width: 120,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '运输方式',
          dataIndex: ['data', 'transportationMode'],
          key: 'transportationMode',
          width: 90,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '运输距离',
          dataIndex: ['data', 'transportationDistance'],
          key: 'transportationDistance',
          width: 90,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '运输距离单位',
          dataIndex: ['data', 'transportationDistanceUnit'],
          key: 'transportationDistanceUnit',
          width: 90,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '运输备注',
          dataIndex: ['data', 'notes'],
          key: 'notes',
          width: 120,
          align: 'center',
          render: (text: any) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '证据文件',
          key: 'evidenceFiles',
          width: 90,
          align: 'center',
          render: (_: any, r: any) => {
            const hasFiles = (r.data as any)?.hasEvidenceFiles;
            return <Tag color={hasFiles ? 'green' : 'default'}>{hasFiles ? '有' : '无'}</Tag>;
          },
        },
      ],
    },
    {
      title: <div style={{ fontWeight: 600, color: '#722ed1' }}>背景数据</div>,
      children: [
        {
          title: '名称',
          dataIndex: ['data', 'carbonFactorName'],
          key: 'carbonFactorName',
          width: 120,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '数值(kgCO2e)',
          dataIndex: ['data', 'carbonFactor'],
          key: 'carbonFactor',
          width: 110,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '单位',
          dataIndex: ['data', 'carbonFactorUnit'],
          key: 'carbonFactorUnit',
          width: 80,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '地理代表性',
          dataIndex: ['data', 'emissionFactorGeographicalRepresentativeness'],
          key: 'emissionFactorGeographicalRepresentativeness',
          width: 100,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '时间代表性',
          dataIndex: ['data', 'emissionFactorTemporalRepresentativeness'],
          key: 'emissionFactorTemporalRepresentativeness',
          width: 90,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: '数据库名称',
          dataIndex: ['data', 'carbonFactordataSource'],
          key: 'carbonFactordataSource',
          width: 110,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
        {
          title: 'UUID',
          dataIndex: ['data', 'activityUUID'],
          key: 'activityUUID',
          width: 120,
          align: 'center',
          render: (v: any) => v || <span style={{ color: '#bfbfbf' }}>-</span>,
        },
      ],
    },
    {
      title: <div style={{ fontWeight: 600, color: '#fa8c16' }}>单位转换</div>,
      children: [
        {
          title: '系数',
          dataIndex: ['data', 'unitConversion'],
          key: 'unitConversion',
          width: 80,
          align: 'center',
          render: (v: any, r: any) =>
            v ? (
              <span style={{ fontWeight: 500 }}>
                {v}
                {(r.data as any)?.unitConversion_aiGenerated && (
                  <Tag color="blue" style={{ marginLeft: 4, fontSize: '12px' }}>
                    <RobotOutlined /> AI
                  </Tag>
                )}
              </span>
            ) : (
              <span style={{ color: '#bfbfbf' }}>-</span>
            ),
        },
      ],
    },
    {
      title: <div style={{ fontWeight: 600, color: '#f5222d' }}>排放结果</div>,
      children: [
        {
          title: '排放量(kgCO2e)',
          key: 'emissionResult',
          width: 120,
          align: 'center',
          render: () => <span style={{ color: '#bfbfbf' }}>-</span>,
        },
      ],
    },
  ];

  // 处理确认补全
  const handleConfirmAutofill = async () => {
    if (aiAutoFillConfirmType === 'transport') {
      const selected = filteredNodesForAIModal.filter((item) => aiAutoFillSelectedRowKeys.includes(item.id));
      const transportNodes = selected.filter(
        (item) => (item.data.emissionType && item.data.emissionType.includes('运输')) || item.type === 'distribution',
      );

      if (transportNodes.length === 0) {
        message.warning('请选择运输类型的排放源');
        setAiAutoFillConfirmType(null);

        return;
      }

      const nodeIds = transportNodes.map((item) => item.id).join(',');
      const action: CarbonFlowAction = {
        type: 'carbonflow',
        operation: 'ai_autofill_transport_data',
        nodeId: nodeIds,
        content: 'AI一键补全运输数据',
      };

      window.dispatchEvent(
        new CustomEvent('carbonflow-action', {
          detail: { action },
        }),
      );
      setAiAutoFillConfirmType(null);
    } else if (aiAutoFillConfirmType === 'conversion') {
      if (!aiAutoFillSelectedRowKeys || aiAutoFillSelectedRowKeys.length === 0) {
        message.warning('请选择至少一个排放源进行单位转换系数补全');
        setAiAutoFillConfirmType(null);

        return;
      }

      const nodeIds = aiAutoFillSelectedRowKeys.map((id) => String(id)).join(',');
      const action: CarbonFlowAction = {
        type: 'carbonflow',
        operation: 'ai_autofill_conversion_data',
        nodeId: nodeIds,
        content: 'AI一键补全单位转换系数',
      };

      window.dispatchEvent(
        new CustomEvent('carbonflow-action', {
          detail: { action },
        }),
      );
      setAiAutoFillConfirmType(null);
    }
  };

  const getConfirmMessage = () => {
    const selected = filteredNodesForAIModal.filter((item) => aiAutoFillSelectedRowKeys.includes(item.id));

    if (aiAutoFillConfirmType === 'conversion') {
      const hasFilled = selected.some(
        (item) =>
          item.data.unitConversion !== undefined &&
          item.data.unitConversion !== null &&
          String(item.data.unitConversion).trim() !== '',
      );
      return hasFilled
        ? '检测到已填写单位转换系数数据，AI补全将覆盖原有数据，是否继续？'
        : '是否对所选排放源进行AI补全单位转换系数？';
    } else if (aiAutoFillConfirmType === 'transport') {
      const hasFilled = selected.some(
        (item) =>
          item.data.quantity !== undefined && item.data.quantity !== null && String(item.data.quantity).trim() !== '',
      );
      return hasFilled
        ? '检测到已填写活动数据数值的数据，AI补全将覆盖原有数据，是否继续？'
        : '是否对所选排放源进行AI补全运输数据？';
    }

    return null;
  };

  // 处理关闭
  const handleClose = () => {
    setAiFilterStage(undefined);
    setAiFilterName('');
    setAiFilterCategory(undefined);
    setAiFilterMissingActivity(false);
    setAiFilterMissingConversion(false);
    setAiFilterShowType('all');
    setAiAutoFillSelectedRowKeys([]);
    setAiAutoFillConfirmType(null);

    if (!externalAiAutoFillResult) {
      setInternalAiAutoFillResult(null);
    }

    onClose();
  };

  // 处理结果弹窗关闭
  const handleCloseResult = () => {
    if (externalAiAutoFillResult) {
      /*
       * 如果使用外部状态，需要通过父组件来清除
       * 这里我们可以通过onClose来通知父组件
       */
      onClose();
    } else {
      setInternalAiAutoFillResult(null);
    }
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>AI一键补全数据</span>
            <Badge count={filteredNodesForAIModal.length} style={{ backgroundColor: '#52c41a' }} />
          </div>
        }
        open={visible}
        onCancel={handleClose}
        footer={null}
        width={1400}
        className="ai-autofill-modal"
        style={{ top: 20 }}
      >
        {/* 筛选面板 */}
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 4 }}>
          <Row gutter={[12, 8]}>
            {/* 生命周期阶段 */}
            <Col span={24}>
              <Row align="middle" gutter={[8, 0]}>
                <Col flex="0 0 140px">
                  <Typography.Text strong>生命周期阶段:</Typography.Text>
                </Col>
                <Col flex="auto">
                  <Radio.Group
                    value={aiFilterStage}
                    onChange={(e) => setAiFilterStage(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    style={{ flexWrap: 'nowrap' }}
                  >
                    <Radio value={undefined}>全部</Radio>
                    {lifecycleStages.map((stage) => (
                      <Radio key={stage} value={stage}>
                        {stage}
                      </Radio>
                    ))}
                  </Radio.Group>
                </Col>
              </Row>
            </Col>

            {/* 排放源名称 */}
            <Col span={24}>
              <Row align="middle" gutter={[8, 0]}>
                <Col flex="0 0 140px">
                  <Typography.Text strong>排放源名称:</Typography.Text>
                </Col>
                <Col flex="auto">
                  <Input
                    placeholder="请输入排放源名称"
                    style={{ maxWidth: 300 }}
                    allowClear
                    value={aiFilterName}
                    onChange={(e) => setAiFilterName(e.target.value)}
                  />
                </Col>
              </Row>
            </Col>

            {/* 排放源类别 */}
            <Col span={24}>
              <Row align="middle" gutter={[8, 0]}>
                <Col flex="0 0 140px">
                  <Typography.Text strong>排放源类别:</Typography.Text>
                </Col>
                <Col flex="auto">
                  <Radio.Group
                    value={aiFilterCategory}
                    onChange={(e) => setAiFilterCategory(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    style={{ flexWrap: 'nowrap' }}
                  >
                    <Radio value={undefined}>全部</Radio>
                    {emissionCategories.map((cat) => (
                      <Radio key={cat} value={cat}>
                        {cat}
                      </Radio>
                    ))}
                  </Radio.Group>
                </Col>
              </Row>
            </Col>

            {/* 缺失数据 */}
            <Col span={24}>
              <Row align="middle" gutter={[8, 0]}>
                <Col flex="0 0 140px">
                  <Typography.Text strong>缺失数据:</Typography.Text>
                </Col>
                <Col flex="auto">
                  <Space wrap>
                    <Button
                      type={aiFilterMissingActivity ? 'primary' : 'default'}
                      onClick={() => setAiFilterMissingActivity((v) => !v)}
                    >
                      活动数据数值及单位
                    </Button>
                    <Button
                      type={aiFilterMissingConversion ? 'primary' : 'default'}
                      onClick={() => setAiFilterMissingConversion((v) => !v)}
                    >
                      单位转换系数
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Col>

            {/* 是否含AI数据 */}
            <Col span={24}>
              <Row align="middle" gutter={[8, 0]}>
                <Col flex="0 0 140px">
                  <Typography.Text strong>是否含AI数据:</Typography.Text>
                </Col>
                <Col flex="auto">
                  <Radio.Group
                    options={[
                      { label: '全部', value: 'all' },
                      { label: '含AI生成数据', value: 'ai' },
                      { label: '不含AI生成数据', value: 'manual' },
                    ]}
                    onChange={(e) => setAiFilterShowType(e.target.value)}
                    value={aiFilterShowType}
                    optionType="button"
                    buttonStyle="solid"
                    style={{ flexWrap: 'nowrap' }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {/* 数据表格 */}
        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: aiAutoFillSelectedRowKeys,
            onChange: setAiAutoFillSelectedRowKeys,
            getCheckboxProps: (_record) => ({
              style: { transform: 'scale(1.1)' },
            }),
          }}
          bordered
          dataSource={filteredNodesForAIModal.map((node, idx) => ({
            ...node,
            key: node.id,
            index: idx + 1,
          }))}
          pagination={false}
          scroll={{ x: 'max-content', y: 550 }}
          size="small"
          columns={columnsAIAutoFill}
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        />

        {/* 底部操作按钮 */}
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            disabled={aiAutoFillSelectedRowKeys.length === 0}
            style={{ marginRight: 12 }}
            onClick={() => setAiAutoFillConfirmType('conversion')}
          >
            一键补全单位转换系数
          </Button>
          <Button
            type="primary"
            disabled={aiAutoFillSelectedRowKeys.length === 0}
            onClick={() => setAiAutoFillConfirmType('transport')}
          >
            一键补全运输数据
          </Button>
          <Button
            type="primary"
            disabled={aiAutoFillSelectedRowKeys.length === 0}
            style={{ marginLeft: 12 }}
            onClick={onAIAutofillCarbonFactorMatch}
          >
            一键补全碳因子匹配
          </Button>
        </div>
      </Modal>

      {/* 二次确认弹窗 */}
      <Modal
        open={!!aiAutoFillConfirmType}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              {aiAutoFillConfirmType === 'conversion' ? '确认补全单位转换系数' : '确认补全运输数据'}
            </span>
          </div>
        }
        onCancel={() => setAiAutoFillConfirmType(null)}
        onOk={handleConfirmAutofill}
        okText="确认补全"
        cancelText="取消"
        width={600}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #40a9ff 0%, #1890ff 100%)',
            border: 'none',
            borderRadius: 6,
            boxShadow: '0 2px 4px rgba(24,144,255,0.3)',
          },
        }}
        cancelButtonProps={{
          style: {
            borderRadius: 6,
          },
        }}
      >
        <div
          style={{
            padding: '16px 0',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#595959',
          }}
        >
          {getConfirmMessage()}
        </div>
      </Modal>

      {/* AI补全结果弹窗 - 深蓝企业级主题 */}
      <Modal
        open={!!aiAutoFillResult}
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
              margin: '-24px -24px 20px',
              padding: '20px 24px',
              borderBottom: '1px solid #2980b9',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2980b9 0%, #1f4e79 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(41, 128, 185, 0.4)',
              }}
            >
              <RobotOutlined style={{ color: '#fff', fontSize: '20px' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>AI碳因子匹配完成</div>
              <div style={{ fontSize: '12px', color: '#7fb3d3', marginTop: '2px' }}>智能匹配结果总览</div>
            </div>
          </div>
        }
        onCancel={handleCloseResult}
        footer={null}
        width={900}
        style={{ top: 50 }}
        className="ai-result-modal"
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
          content: {
            backgroundColor: '#1a2332',
            border: '1px solid #2980b9',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          },
        }}
      >
        <div style={{ padding: '0 4px', background: '#1a2332' }}>
          {/* 统计概览卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
                  border: '1px solid #27ae60',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(39, 174, 96, 0.2)',
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ color: '#27ae60', fontWeight: 500 }}>
                      <CheckCircleOutlined style={{ marginRight: 6 }} />
                      匹配成功
                    </div>
                  }
                  value={aiAutoFillResult?.success.length || 0}
                  suffix="项"
                  valueStyle={{
                    color: '#27ae60',
                    fontSize: '24px',
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
                  border: '1px solid #e74c3c',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(231, 76, 60, 0.2)',
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ color: '#e74c3c', fontWeight: 500 }}>
                      <CloseCircleOutlined style={{ marginRight: 6 }} />
                      匹配失败
                    </div>
                  }
                  value={aiAutoFillResult?.failed.length || 0}
                  suffix="项"
                  valueStyle={{
                    color: '#e74c3c',
                    fontSize: '24px',
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
                  border: '1px solid #2980b9',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(41, 128, 185, 0.2)',
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <Statistic
                  title={
                    <div style={{ color: '#2980b9', fontWeight: 500 }}>
                      <TrophyOutlined style={{ marginRight: 6 }} />
                      成功率
                    </div>
                  }
                  value={
                    ((aiAutoFillResult?.success.length || 0) /
                      ((aiAutoFillResult?.success.length || 0) + (aiAutoFillResult?.failed.length || 0))) *
                      100 || 0
                  }
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color: '#2980b9',
                    fontSize: '24px',
                    fontWeight: 600,
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* 进度条 */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 500, color: '#ffffff' }}>整体匹配进度</span>
              <span style={{ fontSize: '12px', color: '#7fb3d3' }}>
                {aiAutoFillResult?.success.length || 0} /{' '}
                {(aiAutoFillResult?.success.length || 0) + (aiAutoFillResult?.failed.length || 0)}
              </span>
            </div>
            <Progress
              percent={
                ((aiAutoFillResult?.success.length || 0) /
                  ((aiAutoFillResult?.success.length || 0) + (aiAutoFillResult?.failed.length || 0))) *
                  100 || 0
              }
              strokeColor={{
                '0%': '#27ae60',
                '100%': '#2980b9',
              }}
              trailColor="#0f1419"
              strokeWidth={8}
              style={{ marginBottom: 4 }}
            />
          </div>

          <Row gutter={24}>
            {/* 成功列表 */}
            <Col span={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#27ae60', fontSize: '16px' }} />
                    <span style={{ color: '#27ae60', fontWeight: 600 }}>匹配成功项目</span>
                    <Badge count={aiAutoFillResult?.success.length || 0} style={{ backgroundColor: '#27ae60' }} />
                  </div>
                }
                style={{
                  borderRadius: 8,
                  border: '1px solid #27ae60',
                  boxShadow: '0 2px 8px rgba(39, 174, 96, 0.2)',
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
                }}
                bodyStyle={{ padding: '16px', background: 'transparent' }}
              >
                {(aiAutoFillResult?.success.length || 0) > 0 ? (
                  <List
                    size="small"
                    dataSource={aiAutoFillResult?.success}
                    renderItem={(id, index) => {
                      const node = nodes.find((n) => n.id === id);
                      return (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #2c3e50' }}>
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size="small"
                                style={{
                                  backgroundColor: '#27ae60',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            }
                            title={
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                                {node?.data?.label || id}
                              </div>
                            }
                            description={
                              <div style={{ fontSize: '12px', color: '#7fb3d3' }}>
                                {nodeTypeToLifecycleStageMap[node?.type || ''] || '未知阶段'}
                              </div>
                            }
                          />
                        </List.Item>
                      );
                    }}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#7fb3d3',
                    }}
                  >
                    <InfoCircleOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                    <div>暂无成功项目</div>
                  </div>
                )}
              </Card>
            </Col>

            {/* 失败列表 */}
            <Col span={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CloseCircleOutlined style={{ color: '#e74c3c', fontSize: '16px' }} />
                    <span style={{ color: '#e74c3c', fontWeight: 600 }}>匹配失败项目</span>
                    <Badge count={aiAutoFillResult?.failed.length || 0} style={{ backgroundColor: '#e74c3c' }} />
                  </div>
                }
                style={{
                  borderRadius: 8,
                  border: '1px solid #e74c3c',
                  boxShadow: '0 2px 8px rgba(231, 76, 60, 0.2)',
                  background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
                }}
                bodyStyle={{ padding: '16px', background: 'transparent' }}
              >
                {(aiAutoFillResult?.failed.length || 0) > 0 ? (
                  <List
                    size="small"
                    dataSource={aiAutoFillResult?.failed}
                    renderItem={({ id, reason }, index) => {
                      const node = nodes.find((n) => n.id === id);
                      return (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #2c3e50' }}>
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size="small"
                                style={{
                                  backgroundColor: '#e74c3c',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            }
                            title={
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                                {node?.data?.label || id}
                              </div>
                            }
                            description={
                              <div>
                                <div style={{ fontSize: '12px', color: '#7fb3d3', marginBottom: '4px' }}>
                                  {nodeTypeToLifecycleStageMap[node?.type || ''] || '未知阶段'}
                                </div>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: '#e74c3c',
                                    background: 'rgba(231, 76, 60, 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                    border: '1px solid rgba(231, 76, 60, 0.4)',
                                  }}
                                >
                                  <WarningOutlined style={{ marginRight: '4px' }} />
                                  {reason}
                                </div>
                              </div>
                            }
                          />
                        </List.Item>
                      );
                    }}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                  />
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#7fb3d3',
                    }}
                  >
                    <CheckCircleOutlined style={{ fontSize: '24px', marginBottom: '8px', color: '#27ae60' }} />
                    <div>太棒了！没有失败项目</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* 底部操作按钮 */}
          <div
            style={{
              marginTop: 24,
              textAlign: 'center',
              paddingTop: 20,
              borderTop: '1px solid #2c3e50',
            }}
          >
            <Button
              type="primary"
              size="large"
              onClick={handleCloseResult}
              style={{
                background: 'linear-gradient(135deg, #2980b9 0%, #1f4e79 100%)',
                border: 'none',
                borderRadius: 6,
                boxShadow: '0 2px 8px rgba(41, 128, 185, 0.4)',
                height: '44px',
                paddingLeft: '32px',
                paddingRight: '32px',
                fontWeight: 500,
                color: '#ffffff',
              }}
            >
              完成查看
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AIAutoFillModal;
