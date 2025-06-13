import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Row, Col, Typography, Space, Card, Button, Alert, Divider } from 'antd';
import type { SceneInfoType } from '~/types/scene'; // Adjust path as needed
import moment from 'moment';
import type { FormInstance } from 'antd';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { 
  validateComplianceStandards, 
  getRecommendedStandardCombinations 
} from '~/components/workbench/CarbonFlow/workflow/sceneInfoHandler';

const { Option } = Select;

interface SceneInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => Promise<void>;
  initialSceneInfo: Partial<SceneInfoType>;
  form: FormInstance; // Receive form instance from parent
}

// These might be better defined globally or passed as props if they vary
const allLifecycleStagesForCheckboxes = [
  { label: '原材料获取', value: '原材料获取' },
  { label: '生产', value: '生产' },
  { label: '分销与运输', value: '分销与运输' },
  { label: '使用', value: '使用' },
  { label: '寿命终止', value: '寿命终止' },
];

export const SceneInfoModal: React.FC<SceneInfoModalProps> = ({ visible, onClose, onSave, initialSceneInfo, form }) => {
  const sceneInfoFromStore = useCarbonFlowStore((state) => state.sceneInfo);
  const [complianceValidation, setComplianceValidation] = useState<{
    isValid: boolean;
    detectedStandards: string[];
    warnings: string[];
  } | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  /*
   * Determine the scene data to display and use for form population.
   * Prioritize store data. Fall back to initialSceneInfo if store is null/empty.
   * Default to an empty object if neither is available to prevent errors.
   */
  const currentSceneInfo: Partial<SceneInfoType> =
    (sceneInfoFromStore && Object.keys(sceneInfoFromStore).length > 0 ? sceneInfoFromStore : initialSceneInfo) || {};

  useEffect(() => {
    console.log('[SceneInfoModal] useEffect triggered. Visible:', visible);
    console.log('[SceneInfoModal] Data from store (sceneInfoFromStore):', JSON.stringify(sceneInfoFromStore, null, 2));
    console.log('[SceneInfoModal] Data from prop (initialSceneInfo):', JSON.stringify(initialSceneInfo, null, 2));
    console.log(
      '[SceneInfoModal] Using currentSceneInfo for form population:',
      JSON.stringify(currentSceneInfo, null, 2),
    );

    if (visible && currentSceneInfo && Object.keys(currentSceneInfo).length > 0) {
      form.setFieldsValue({
        ...currentSceneInfo,
        dataCollectionStartDate: currentSceneInfo.dataCollectionStartDate
          ? moment(currentSceneInfo.dataCollectionStartDate)
          : null,
        dataCollectionEndDate: currentSceneInfo.dataCollectionEndDate
          ? moment(currentSceneInfo.dataCollectionEndDate)
          : null,
        calculationBoundarySelectedStages:
          currentSceneInfo.lifecycleType === 'custom' ? currentSceneInfo.calculationBoundarySelectedStages || [] : [],
      });

      // 验证合规标准
      validateAndUpdateCompliance(currentSceneInfo);
    }

    // If visible and currentSceneInfo is empty, `destroyOnClose` ensures a fresh form.
  }, [visible, currentSceneInfo, form]);

  // 验证合规标准并更新推荐
  const validateAndUpdateCompliance = (sceneInfo: Partial<SceneInfoType>) => {
    if (sceneInfo.standard || sceneInfo.reportType) {
      const validation = validateComplianceStandards(sceneInfo as SceneInfoType);
      setComplianceValidation(validation);

      const recs = getRecommendedStandardCombinations(sceneInfo as SceneInfoType);
      setRecommendations(recs);
    } else {
      setComplianceValidation(null);
      setRecommendations([]);
    }
  };

  // 监听表单字段变化
  const handleFieldsChange = (changedFields: any[], allFields: any[]) => {
    const standardField = allFields.find(field => field.name?.[0] === 'standard');
    const reportTypeField = allFields.find(field => field.name?.[0] === 'reportType');
    const productNameField = allFields.find(field => field.name?.[0] === 'productName');
    const functionalUnitField = allFields.find(field => field.name?.[0] === 'functionalUnit');

    if (standardField || reportTypeField || productNameField || functionalUnitField) {
      const currentValues = {
        standard: standardField?.value,
        reportType: reportTypeField?.value,
        productName: productNameField?.value,
        functionalUnit: functionalUnitField?.value,
      };
      validateAndUpdateCompliance(currentValues);
    }
  };

  const handleFormFinish = async (values: any) => {
    console.log('🔄 保存场景信息，将自动生成合规报告:', values);
    
    // 显示合规验证结果
    if (complianceValidation) {
      console.log('✅ 检测到的合规标准:', complianceValidation.detectedStandards);
      if (complianceValidation.warnings.length > 0) {
        console.log('⚠️ 合规警告:', complianceValidation.warnings);
      }
    }

    await onSave(values);
  };

  return (
    <Modal
      title="目标与范围"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          保存并生成合规报告
        </Button>,
      ]}
      width={900}
      style={{ top: 50 }}
      centered={false}
      destroyOnClose // Add this to reset form state when modal is closed and reopened
    >
      <Form form={form} layout="vertical" onFinish={handleFormFinish} onFieldsChange={handleFieldsChange}>
        <Typography.Title level={5} style={{ marginBottom: '16px' }}>
          基本信息
        </Typography.Title>
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item name="taskName" label="核算任务名称" rules={[{ required: true, message: '请输入核算任务名称' }]}>
              <Input placeholder="请填写" />
            </Form.Item>
            <Form.Item name="productName" label="核算产品">
              <Select placeholder="选择产品" allowClear>
                <Select.Option value="电冰箱">电冰箱</Select.Option>
                <Select.Option value="洗衣机">洗衣机</Select.Option>
                <Select.Option value="空调">空调</Select.Option>
                <Select.Option value="电视机">电视机</Select.Option>
                <Select.Option value="电池">电池</Select.Option>
                <Select.Option value="锂电池">锂电池</Select.Option>
                {/* Add other product options as needed */}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Card size="small" title="产品信息">
              <p>
                <strong>产品规格:</strong> {currentSceneInfo.productSpecs || 'N/A'}
              </p>
              <p>
                <strong>产品描述:</strong> {currentSceneInfo.productDesc || 'N/A'}
              </p>
            </Card>
          </Col>
        </Row>

        {/* 合规标准验证提示 */}
        {complianceValidation && (
          <>
            <Divider />
            <Typography.Title level={5} style={{ marginBottom: '16px' }}>
              合规标准检测
            </Typography.Title>
            {complianceValidation.isValid ? (
              <Alert
                type="success"
                message="检测到合规标准"
                description={
                  <div>
                    <p><strong>将自动生成以下标准的合规报告：</strong></p>
                    <ul>
                      {complianceValidation.detectedStandards.map((std, index) => (
                        <li key={index}>{std}</li>
                      ))}
                    </ul>
                  </div>
                }
                style={{ marginBottom: '16px' }}
              />
            ) : (
              <Alert
                type="warning"
                message="未检测到合规标准"
                description="请在下方选择核算标准或报告类型以启用自动合规检查"
                style={{ marginBottom: '16px' }}
              />
            )}
            {complianceValidation.warnings.length > 0 && (
              <Alert
                type="warning"
                message="合规配置警告"
                description={
                  <ul>
                    {complianceValidation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                }
                style={{ marginBottom: '16px' }}
              />
            )}
          </>
        )}

        {/* 推荐标准组合 */}
        {recommendations.length > 0 && (
          <Card size="small" title="推荐标准组合" style={{ marginBottom: '16px' }}>
            {recommendations.map((rec, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <strong>{rec.combination}:</strong> {rec.standards.join(', ')}
                <br />
                <small style={{ color: '#666' }}>{rec.description}</small>
              </div>
            ))}
          </Card>
        )}

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          核算目标范围
        </Typography.Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="数据收集时间范围">
              <Space>
                <Form.Item name="dataCollectionStartDate" noStyle>
                  <DatePicker placeholder="开始时间" style={{ width: '100%' }} />
                </Form.Item>
                <span>-</span>
                <Form.Item name="dataCollectionEndDate" noStyle>
                  <DatePicker placeholder="结束时间" style={{ width: '100%' }} />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="产品总产量" required>
              <Space>
                <Form.Item name="totalOutputValue" noStyle rules={[{ required: true, message: '请输入总产量数值' }]}>
                  <Input type="number" placeholder="数值" />
                </Form.Item>
                <Form.Item name="totalOutputUnit" noStyle rules={[{ required: true, message: '请输入总产量单位' }]}>
                  <Input placeholder="单位" />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="核算基准" required>
              <Space>
                <Form.Item name="benchmarkValue" noStyle rules={[{ required: true, message: '请输入核算基准数值' }]}>
                  <Input type="number" placeholder="数值" />
                </Form.Item>
                <Form.Item name="benchmarkUnit" noStyle rules={[{ required: true, message: '请输入核算基准单位' }]}>
                  <Input placeholder="单位" />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="conversionFactor"
              label="总产量单位转换系数"
              rules={[{ required: true, message: '请输入转换系数值' }]}
            >
              <Input type="number" placeholder="数值" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="functionalUnit" label="功能单位" tooltip="描述产品的功能单位，例如：1台、1公斤等">
              <Input placeholder="例如：1台电冰箱" />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          生命周期阶段选择
        </Typography.Title>
        <Form.Item name="lifecycleType" label="生命周期类型">
          <Select placeholder="选择生命周期类型">
            <Option value="half">摇篮到大门</Option>
            <Option value="full">摇篮到坟墓</Option>
            <Option value="custom">自定义</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.lifecycleType !== currentValues.lifecycleType}
        >
          {({ getFieldValue }) =>
            getFieldValue('lifecycleType') === 'custom' ? (
              <Form.Item name="calculationBoundarySelectedStages" label="选择自定义阶段">
                <Checkbox.Group options={allLifecycleStagesForCheckboxes} />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          核算标准与报告
        </Typography.Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="standard" label="核算标准" tooltip="选择适用的核算标准，系统将自动生成对应的合规检查报告">
              <Select placeholder="例如 ISO 14067" allowClear showSearch>
                <Option value="ISO 14067">ISO 14067 - 产品碳足迹</Option>
                <Option value="ISO 14064">ISO 14064 - 温室气体核算</Option>
                <Option value="ISO 14040/14044">ISO 14040/14044 - 生命周期评估</Option>
                <Option value="PAS 2050">PAS 2050 - 产品碳足迹规范</Option>
                <Option value="GHG Protocol">GHG Protocol - 温室气体议定书</Option>
                <Option value="EU 2023/1542">EU 2023/1542 - 欧盟电池法</Option>
                <Option value="GB/T 32150">GB/T 32150 - 中国温室气体核算</Option>
                <Option value="GB/T 32151">GB/T 32151 - 中国产品碳足迹</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="reportType" label="报告类型">
              <Select placeholder="选择报告类型" allowClear>
                <Option value="ghg_protocol">GHG Protocol</Option>
                <Option value="iso_14064">ISO 14064</Option>
                <Option value="pas_2050">PAS 2050</Option>
                <Option value="pcr">产品种类规则 (PCR)</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          其他设置
        </Typography.Title>
        <Form.Item name="verificationLevel" label="验证/保证级别">
          <Select placeholder="选择级别" allowClear>
            <Option value="limited_assurance">有限保证</Option>
            <Option value="reasonable_assurance">合理保证</Option>
            <Option value="no_assurance">无保证 (自我声明)</Option>
          </Select>
        </Form.Item>
        <Form.Item name="uncertaintyAssessment" label="不确定性评估方法">
          <Input.TextArea rows={2} placeholder="描述不确定性评估方法" />
        </Form.Item>
        <Form.Item name="dataQualityAssessment" label="数据质量评估">
          <Input.TextArea rows={2} placeholder="描述数据质量评估方法和结果" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
