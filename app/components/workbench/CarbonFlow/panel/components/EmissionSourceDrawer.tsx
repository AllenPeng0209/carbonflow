import React, { useState } from 'react';
import {
  Drawer,
  Form,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Select,
  Input,
  Upload,
  Tabs,
  message,
  Card,
  Divider,
} from 'antd';
import { UploadOutlined, RobotOutlined, CheckOutlined, CopyOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import type { UploadProps, UploadChangeParam, UploadFile } from 'antd/es/upload';
import FactorSelectModal from './FactorSelectModal';

const lifecycleStages = ['原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];
const emissionCategories = ['原材料运输', '原材料获取', '生产制造', '分销运输', '产品使用', '废弃物处理'];

interface EmissionSourceDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  form: any;
  editingNodeId: string | null;
  backgroundDataActiveTabKey: string;
  onBackgroundDataTabChange: (key: string) => void;
  supplierData?: {
    carbonFactorName?: string;
    carbonFactor?: number;
    carbonFactorUnit?: string;
    geographicalRepresentativeness?: string;
    temporalRepresentativeness?: string;
    dataSource?: string;
    activityUUID?: string;
    collectedAt?: string;
    confidence?: number;
  };
}

export const EmissionSourceDrawer: React.FC<EmissionSourceDrawerProps> = ({
  visible,
  onClose,
  onSave,
  form,
  editingNodeId,
  backgroundDataActiveTabKey,
  onBackgroundDataTabChange,
  supplierData,
}) => {
  const [showSupplierData, setShowSupplierData] = useState(false);

  const beforeUpload = async (_file: RcFile): Promise<false> => {
    return false; // 阻止自动上传
  };

  const handleEvidenceUploadChange: UploadProps['onChange'] = (_info: UploadChangeParam<UploadFile>) => {
    // 处理文件上传变化
  };

  const [factorModalVisible, setFactorModalVisible] = React.useState(false);
  const [selectedFactor, setSelectedFactor] = React.useState<any>(null);

  // 选择排放因子后回填
  const handleFactorSelect = (factor: any) => {
    setSelectedFactor(factor);
    setFactorModalVisible(false);

    if (factor) {
      form.setFieldsValue({
        carbonFactorName: factor.name,
        carbonFactor: factor.value,
        carbonFactorUnit: factor.denominator_unit,
      });
    }
  };

  // 复制供应商数据到剪贴板
  const handleCopySupplierData = () => {
    if (supplierData) {
      const dataText = JSON.stringify(supplierData, null, 2);
      navigator.clipboard
        .writeText(dataText)
        .then(() => {
          message.success('供应商数据已复制到剪贴板');
        })
        .catch(() => {
          message.error('复制失败');
        });
    }
  };

  // 应用供应商数据到表单
  const handleApplySupplierData = () => {
    if (supplierData) {
      form.setFieldsValue({
        carbonFactorName: supplierData.carbonFactorName,
        carbonFactor: supplierData.carbonFactor,
        carbonFactorUnit: supplierData.carbonFactorUnit,
        emissionFactorGeographicalRepresentativeness: supplierData.geographicalRepresentativeness,
        emissionFactorTemporalRepresentativeness: supplierData.temporalRepresentativeness,
        carbonFactordataSource: supplierData.dataSource,
        activityUUID: supplierData.activityUUID,
      });

      // 切换到手动填写标签页
      onBackgroundDataTabChange('manual');
      message.success('供应商数据已应用到表单');
    }
  };

  return (
    <Drawer
      title={editingNodeId ? '编辑排放源' : '新增排放源'}
      placement="right"
      width={600}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editingNodeId ? '更新' : '保存'}
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Typography.Title level={5} style={{ marginBottom: '16px' }}>
          基本信息
        </Typography.Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="lifecycleStage"
              label="生命周期阶段"
              rules={[{ required: true, message: '请选择生命周期阶段' }]}
            >
              <Select placeholder="请选择生命周期阶段">
                {lifecycleStages.map((stage) => (
                  <Select.Option key={stage} value={stage}>
                    {stage}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="emissionType" label="排放源类别" rules={[{ required: true, message: '请选择排放源类别' }]}>
              <Select placeholder="请选择排放源类别">
                {emissionCategories.map((cat) => (
                  <Select.Option key={cat} value={cat}>
                    {cat}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="label" label="排放源名称" rules={[{ required: true, message: '请输入排放源名称' }]}>
              <Input placeholder="请输入排放源名称" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="supplementaryInfo" label="排放源补充信息">
          <Input.TextArea placeholder="请输入排放源补充信息" rows={3} />
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          活动水平数据
        </Typography.Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="quantity" label="活动数据数值">
              <Input type="number" step="any" placeholder="请输入活动数据数值" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="activityUnit" label="活动数据单位">
              <Input placeholder="请输入活动数据单位，例如：kg" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="finishedProductOutput" label="成品产量">
              <Input type="number" step="any" placeholder="请输入成品产量" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="产量单位">
              <Input placeholder="产量单位" value={form.getFieldValue(['referenceFlow', 'unit'])} disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="allocationRatio" label="分配比例 (%)">
              <Input type="number" step="any" placeholder="请输入分配比例" addonAfter="%" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="distributionStartPoint" label="运输-起点">
              <Input placeholder="请输入运输起点" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="distributionEndPoint" label="运输-终点">
              <Input placeholder="请输入运输终点" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="transportationMode" label="运输方式">
              <Input placeholder="请输入运输方式" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="关联证据文件">
          <Upload
            name="evidenceFiles"
            listType="text"
            maxCount={5}
            multiple
            beforeUpload={beforeUpload}
            onChange={handleEvidenceUploadChange}
          >
            <Button icon={<UploadOutlined />}>上传</Button>
          </Upload>
          <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>最多可上传5个证据文件</div>
        </Form.Item>

        <Typography.Title level={5} style={{ marginTop: '24px', marginBottom: '16px' }}>
          背景数据
        </Typography.Title>
        <Tabs activeKey={backgroundDataActiveTabKey} onChange={onBackgroundDataTabChange}>
          <Tabs.TabPane tab="数据库" key="database">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={24}>
                <Button type="primary" onClick={() => setFactorModalVisible(true)} block>
                  选择排放因子
                </Button>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="数据库名称">
                  <Input placeholder="从数据库选择" value={selectedFactor?.name} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="UUID">
                  <Input placeholder="从数据库选择" value={selectedFactor?.uuid} disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="因子活动名称">
                  <Input
                    placeholder="从数据库选择"
                    value={selectedFactor?.name ? selectedFactor.name + selectedFactor.name : ''}
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="因子产品名称">
                  <Input
                    placeholder="从数据库选择"
                    value={selectedFactor?.name ? selectedFactor.name + selectedFactor.name : ''}
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="因子数值 (kgCO2e)">
                  <Input placeholder="从数据库选择" value={selectedFactor?.value} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="因子分母单位">
                  <Input placeholder="从数据库选择" value={selectedFactor?.denominator_unit} disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="地理代表性">
                  <Input placeholder="从数据库选择" value={selectedFactor?.geo_representative} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="发布时间">
                  <Input placeholder="从数据库选择" value={selectedFactor?.time_representative} disabled />
                </Form.Item>
              </Col>
            </Row>
          </Tabs.TabPane>
          <Tabs.TabPane tab="手动填写" key="manual">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="carbonFactorDbName" label="数据库名称">
                  <Input placeholder="请输入数据库名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="carbonFactorUUID" label="UUID">
                  <Input placeholder="请输入UUID" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="carbonFactorActivityName" 
                  label="因子活动名称" 
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入因子活动名称' 
                    }
                  ]}
                > 
                  <Input placeholder="请输入因子活动名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="carbonFactorProductName" label="因子产品名称">
                  <Input placeholder="请输入因子产品名称" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="carbonFactor" 
                  label="因子数值 (kgCO2e)" 
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入因子数值' 
                    }
                  ]}
                > 
                  <Input type="number" step="any" placeholder="请输入因子数值" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="carbonFactorUnit" 
                  label="因子分母单位" 
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入因子分母单位' 
                    }
                  ]}
                > 
                  <Input placeholder="请输入分母单位" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="carbonFactorGeo" label="地理代表性">
                  <Input placeholder="请输入地理代表性" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="carbonFactorTime" label="发布时间">
                  <Input placeholder="请输入发布时间" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="emissionFactorGeographicalRepresentativeness"
                  label="地理代表性"
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入地理代表性',
                    },
                  ]}
                >
                  <Input placeholder="请输入地理代表性，例如：GLO" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="emissionFactorTemporalRepresentativeness"
                  label="发布时间"
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入发布时间',
                    },
                  ]}
                >
                  <Input placeholder="请输入发布时间，例如：2022" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="carbonFactordataSource"
                  label="数据库名称"
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入数据库名称',
                    },
                  ]}
                >
                  <Input placeholder="请输入数据库名称，例如：Ecoinvent" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="activityUUID"
                  label="因子UUID"
                  rules={[
                    {
                      required: backgroundDataActiveTabKey === 'manual',
                      message: '请输入因子UUID',
                    },
                  ]}
                >
                  <Input placeholder="请输入因子UUID" />
                </Form.Item>
              </Col>
            </Row>
          </Tabs.TabPane>
          <Tabs.TabPane tab="供应商数据" key="supplier">
            {/* AI收集的供应商数据展示区域 */}
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
              title={
                <Space>
                  <RobotOutlined style={{ color: '#52c41a' }} />
                  <span>AI收集的供应商数据</span>
                  {supplierData && (
                    <Button type="link" size="small" onClick={() => setShowSupplierData(!showSupplierData)}>
                      {showSupplierData ? '隐藏' : '查看'}详情
                    </Button>
                  )}
                </Space>
              }
              extra={
                supplierData && (
                  <Space>
                    <Button size="small" icon={<CopyOutlined />} onClick={handleCopySupplierData}>
                      复制数据
                    </Button>
                    <Button type="primary" size="small" icon={<CheckOutlined />} onClick={handleApplySupplierData}>
                      应用到表单
                    </Button>
                  </Space>
                )
              }
            >
              {!supplierData ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>
                  <RobotOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 8 }} />
                  <div>暂无AI收集的供应商数据</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>您可以通过AI数据收集功能获取供应商提供的排放因子数据</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <strong>排放因子：</strong>
                    {supplierData.carbonFactorName || '未提供'}
                    {supplierData.confidence && (
                      <span style={{ marginLeft: 8, color: '#52c41a', fontSize: 12 }}>
                        (置信度: {(supplierData.confidence * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                    收集时间: {supplierData.collectedAt ? new Date(supplierData.collectedAt).toLocaleString() : '未知'}
                  </div>

                  {showSupplierData && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <Row gutter={[8, 4]}>
                        <Col span={12}>
                          <div style={{ fontSize: 12 }}>
                            <strong>数值:</strong> {supplierData.carbonFactor || '未提供'}{' '}
                            {supplierData.carbonFactorUnit || ''}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12 }}>
                            <strong>地理代表性:</strong> {supplierData.geographicalRepresentativeness || '未提供'}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12 }}>
                            <strong>时间代表性:</strong> {supplierData.temporalRepresentativeness || '未提供'}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12 }}>
                            <strong>数据来源:</strong> {supplierData.dataSource || '未提供'}
                          </div>
                        </Col>
                      </Row>
                    </>
                  )}
                </>
              )}
            </Card>

            {/* 手动输入数据粘贴区域 */}
            <Card size="small" style={{ marginBottom: 16 }} title="或手动粘贴供应商数据">
              <Form.Item
                name="supplierDataInput"
                label="供应商提供的数据"
                help="请将供应商提供的排放因子相关数据粘贴到此处，系统将尝试自动解析并填充到手动填写表单中"
              >
                <Input.TextArea
                  placeholder="请粘贴供应商提供的排放因子数据，支持JSON格式或结构化文本..."
                  rows={4}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value.trim()) {
                      try {
                        const parsed = JSON.parse(value);

                        if (parsed.carbonFactorName || parsed.carbonFactor) {
                          message.info('检测到结构化数据，您可以点击"解析并填充"按钮应用到表单');
                        }
                      } catch {
                        // 不是JSON格式，忽略错误
                      }
                    }
                  }}
                />
              </Form.Item>
              <div style={{ textAlign: 'right', marginBottom: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    const inputValue = form.getFieldValue('supplierDataInput');

                    if (inputValue) {
                      try {
                        const parsed = JSON.parse(inputValue);
                        form.setFieldsValue({
                          carbonFactorName: parsed.carbonFactorName || parsed.name,
                          carbonFactor: parsed.carbonFactor || parsed.value,
                          carbonFactorUnit: parsed.carbonFactorUnit || parsed.unit,
                          emissionFactorGeographicalRepresentativeness:
                            parsed.geographicalRepresentativeness || parsed.geography,
                          emissionFactorTemporalRepresentativeness: parsed.temporalRepresentativeness || parsed.year,
                          carbonFactordataSource: parsed.dataSource || parsed.source,
                          activityUUID: parsed.activityUUID || parsed.uuid,
                        });
                        message.success('数据已解析并填充到表单');

                        // 解析后切换到手动填写标签页
                        onBackgroundDataTabChange('manual');
                      } catch {
                        message.warning('数据格式无法识别，请检查格式或手动填写');
                      }
                    }
                  }}
                >
                  解析并填充
                </Button>
              </div>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Form>
      <FactorSelectModal
        visible={factorModalVisible}
        onOk={handleFactorSelect}
        onCancel={() => setFactorModalVisible(false)}
      />
    </Drawer>
  );
};

export default EmissionSourceDrawer;
