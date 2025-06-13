import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  DatePicker,
  Select,
  Space,
  message,
  Tabs,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  EyeOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd/es/table';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

// 供应商数据类型定义
interface SupplierDataItem {
  id: string;
  dataType: string;
  vendorName: string;
  deadline: string;
  email: string;
  emissionSourceName: string;
  value?: number;
  unit?: string;
  evidenceFile?: string;
  dataSubmissionUrl: string;
  status: '待回复' | '已回复' | '已关闭';
  respondent?: string;
  responseTime?: string;
  remarks?: string;
  createdAt: string;
  createdBy: string;
}

interface SupplierDataModalProps {
  visible: boolean;
  onClose: () => void;
  emissionSourceId?: string;
  emissionSourceName?: string;
}

export const SupplierDataModal: React.FC<SupplierDataModalProps> = ({
  visible,
  onClose,
  emissionSourceId,
  emissionSourceName,
}) => {
  const [activeTab, setActiveTab] = useState<string>('list');
  const [supplierDataList, setSupplierDataList] = useState<SupplierDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isAIEmailModalVisible, setIsAIEmailModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierDataItem | null>(null);
  const [form] = Form.useForm();
  const [aiEmailForm] = Form.useForm();

  // 模拟数据
  const mockSupplierData: SupplierDataItem[] = [
    {
      id: '1',
      dataType: '供应商因子',
      vendorName: '钢铁供应商A',
      deadline: '2025-05-10 00:00:00',
      email: 'supplier-a@example.com',
      emissionSourceName: emissionSourceName || '钢材',
      value: 2.1,
      unit: 'kgCO2e/kg',
      evidenceFile: '钢材碳足迹报告.pdf',
      dataSubmissionUrl: '/supplier_data_form.html?token=abc123',
      status: '已回复',
      respondent: '张三',
      responseTime: '2025-01-15 14:30:00',
      remarks: '已提供详细的碳足迹数据',
      createdAt: '2025-01-10 09:00:00',
      createdBy: '系统管理员',
    },
    {
      id: '2',
      dataType: '供应商因子',
      vendorName: '塑料供应商B',
      deadline: '2025-05-15 00:00:00',
      email: 'supplier-b@example.com',
      emissionSourceName: emissionSourceName || '塑料原料',
      dataSubmissionUrl: '/supplier_data_form.html?token=def456',
      status: '待回复',
      remarks: 'AI自动发送邮件，等待回复',
      createdAt: '2025-01-12 10:30:00',
      createdBy: 'AI助手',
    },
  ];

  useEffect(() => {
    if (visible) {
      loadSupplierData();
    }
  }, [visible, emissionSourceId]);

  const loadSupplierData = async () => {
    setLoading(true);

    try {
      // 调用真实API获取数据
      const response = await fetch(`/api/supplier-data/${emissionSourceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { supplierData: SupplierDataItem[] };
      setSupplierDataList(data.supplierData || []);
      setLoading(false);
    } catch (error) {
      console.error('加载供应商数据失败:', error);
      message.error('加载供应商数据失败');

      // 如果API调用失败，使用模拟数据作为后备
      setSupplierDataList(mockSupplierData);
      setLoading(false);
    }
  };

  // AI自动发送邮件
  const handleAIEmailSend = async (values: any) => {
    setLoading(true);

    try {
      // 调用真实的AI邮件发送API
      const response = await fetch('/api/supplier-data/ai-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emissionSourceId,
          emissionSourceName,
          dataType: values.dataType,
          vendorName: values.vendorName,
          email: values.email,
          deadline: values.deadline.format('YYYY-MM-DD HH:mm:ss'),
          remarks: values.remarks,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { success: boolean; supplierData: SupplierDataItem; error?: string };

      if (data.success) {
        // 添加新创建的供应商数据到列表
        setSupplierDataList((prev) => [data.supplierData, ...prev]);
        setIsAIEmailModalVisible(false);
        aiEmailForm.resetFields();
        message.success('AI邮件发送成功！');
      } else {
        throw new Error(data.error || 'AI邮件发送失败');
      }

      setLoading(false);
    } catch (error) {
      console.error('AI邮件发送失败:', error);
      message.error('AI邮件发送失败');
      setLoading(false);
    }
  };

  // 手动添加供应商数据
  const handleManualAdd = async (values: any) => {
    setLoading(true);

    try {
      /*
       * 这里应该调用API添加数据
       * const response = await addSupplierData({
       *   emissionSourceId,
       *   ...values
       * });
       */

      // 模拟API调用
      setTimeout(() => {
        const newItem: SupplierDataItem = {
          id: Date.now().toString(),
          dataType: values.dataType,
          vendorName: values.vendorName,
          deadline: values.deadline.format('YYYY-MM-DD HH:mm:ss'),
          email: values.email,
          emissionSourceName: emissionSourceName || '',
          value: values.value,
          unit: values.unit,
          evidenceFile: values.evidenceFile,
          dataSubmissionUrl: `/supplier_data_form.html?token=${Date.now()}`,
          status: values.status || '待回复',
          respondent: values.respondent,
          responseTime: values.responseTime?.format('YYYY-MM-DD HH:mm:ss'),
          remarks: values.remarks,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: '手动添加',
        };

        if (editingItem) {
          setSupplierDataList((prev) =>
            prev.map((item) => (item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item)),
          );
          message.success('供应商数据更新成功！');
        } else {
          setSupplierDataList((prev) => [newItem, ...prev]);
          message.success('供应商数据添加成功！');
        }

        setIsAddModalVisible(false);
        setEditingItem(null);
        form.resetFields();
        setLoading(false);
      }, 500);
    } catch {
      message.error(editingItem ? '更新失败' : '添加失败');
      setLoading(false);
    }
  };

  // 删除供应商数据
  const handleDelete = async (id: string) => {
    try {
      /*
       * 这里应该调用API删除数据
       * await deleteSupplierData(id);
       */

      setSupplierDataList((prev) => prev.filter((item) => item.id !== id));
      message.success('删除成功！');
    } catch {
      message.error('删除失败');
    }
  };

  // 编辑供应商数据
  const handleEdit = (item: SupplierDataItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      deadline: item.deadline ? dayjs(item.deadline) : undefined,
      responseTime: item.responseTime ? dayjs(item.responseTime) : undefined,
    });
    setIsAddModalVisible(true);
  };

  // 查看数据填报链接
  const handleViewSubmissionLink = (url: string) => {
    window.open(url, '_blank');
  };

  // 重新发送邮件
  const handleResendEmail = async (_item: SupplierDataItem) => {
    try {
      /*
       * 这里应该调用重新发送邮件API
       * await resendEmailToSupplier(item.id);
       */

      message.success('邮件重新发送成功！');
    } catch {
      message.error('邮件发送失败');
    }
  };

  const columns: TableProps<SupplierDataItem>['columns'] = [
    {
      title: '序号',
      key: 'index',
      render: (_text, _record, index) => index + 1,
      width: 60,
    },
    {
      title: '供应商名称',
      dataIndex: 'vendorName',
      key: 'vendorName',
      width: 120,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 150,
    },
    {
      title: '截止时间',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 130,
      render: (text: string) => (text ? dayjs(text).format('MM-DD HH:mm') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colorMap = {
          待回复: 'orange',
          已回复: 'green',
          已关闭: 'gray',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{status}</Tag>;
      },
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      width: 80,
      render: (value: number) => (value ? `${value}` : '-'),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (unit: string) => unit || '-',
    },
    {
      title: '回复人',
      dataIndex: 'respondent',
      key: 'respondent',
      width: 80,
      render: (respondent: string) => respondent || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看填报链接">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewSubmissionLink(record.dataSubmissionUrl)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          {record.status === '待回复' && (
            <Tooltip title="重新发送邮件">
              <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleResendEmail(record)} />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={`供应商数据管理 - ${emissionSourceName || '未知排放源'}`}
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={null}
        destroyOnClose
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '数据列表',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button type="primary" icon={<RobotOutlined />} onClick={() => setIsAIEmailModalVisible(true)}>
                        AI自动发送邮件
                      </Button>
                      <Button
                        icon={<UserOutlined />}
                        onClick={() => {
                          setEditingItem(null);
                          form.resetFields();
                          setIsAddModalVisible(true);
                        }}
                      >
                        手动添加数据
                      </Button>
                      <Button icon={<PlusOutlined />} onClick={loadSupplierData}>
                        刷新数据
                      </Button>
                    </Space>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={supplierDataList}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: false,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`,
                    }}
                    scroll={{ x: 1000 }}
                  />
                </div>
              ),
            },
            {
              key: 'statistics',
              label: '数据统计',
              children: (
                <Row gutter={16}>
                  <Col span={8}>
                    <Card title="状态统计" size="small">
                      <div>待回复: {supplierDataList.filter((item) => item.status === '待回复').length}</div>
                      <div>已回复: {supplierDataList.filter((item) => item.status === '已回复').length}</div>
                      <div>已关闭: {supplierDataList.filter((item) => item.status === '已关闭').length}</div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="数据完整性" size="small">
                      <div>有数值: {supplierDataList.filter((item) => item.value).length}</div>
                      <div>有证明材料: {supplierDataList.filter((item) => item.evidenceFile).length}</div>
                      <div>总计: {supplierDataList.length}</div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="创建方式" size="small">
                      <div>AI创建: {supplierDataList.filter((item) => item.createdBy === 'AI助手').length}</div>
                      <div>手动创建: {supplierDataList.filter((item) => item.createdBy === '手动添加').length}</div>
                      <div>系统创建: {supplierDataList.filter((item) => item.createdBy === '系统管理员').length}</div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Modal>

      {/* AI自动发送邮件Modal */}
      <Modal
        title="AI自动发送邮件"
        open={isAIEmailModalVisible}
        onCancel={() => {
          setIsAIEmailModalVisible(false);
          aiEmailForm.resetFields();
        }}
        onOk={() => aiEmailForm.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form form={aiEmailForm} layout="vertical" onFinish={handleAIEmailSend}>
          <Form.Item label="数据类型" name="dataType" rules={[{ required: true, message: '请选择数据类型' }]}>
            <Select placeholder="请选择数据类型">
              <Option value="供应商因子">供应商因子</Option>
              <Option value="活动水平数据">活动水平数据</Option>
              <Option value="证明材料">证明材料</Option>
            </Select>
          </Form.Item>

          <Form.Item label="供应商名称" name="vendorName" rules={[{ required: true, message: '请输入供应商名称' }]}>
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            label="供应商邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input placeholder="请输入供应商邮箱" />
          </Form.Item>

          <Form.Item label="截止时间" name="deadline" rules={[{ required: true, message: '请选择截止时间' }]}>
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="请选择截止时间"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <TextArea rows={3} placeholder="请输入备注信息（可选）" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 手动添加/编辑供应商数据Modal */}
      <Modal
        title={editingItem ? '编辑供应商数据' : '手动添加供应商数据'}
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          setEditingItem(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleManualAdd}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="数据类型" name="dataType" rules={[{ required: true, message: '请选择数据类型' }]}>
                <Select placeholder="请选择数据类型">
                  <Option value="供应商因子">供应商因子</Option>
                  <Option value="活动水平数据">活动水平数据</Option>
                  <Option value="证明材料">证明材料</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="供应商名称" name="vendorName" rules={[{ required: true, message: '请输入供应商名称' }]}>
                <Input placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="供应商邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入正确的邮箱格式' },
                ]}
              >
                <Input placeholder="请输入供应商邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="截止时间" name="deadline" rules={[{ required: true, message: '请选择截止时间' }]}>
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="请选择截止时间"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="数值" name="value">
                <Input type="number" placeholder="请输入数值" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="单位" name="unit">
                <Input placeholder="请输入单位" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="状态" name="status">
                <Select placeholder="请选择状态">
                  <Option value="待回复">待回复</Option>
                  <Option value="已回复">已回复</Option>
                  <Option value="已关闭">已关闭</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="回复人" name="respondent">
                <Input placeholder="请输入回复人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="回复时间" name="responseTime">
                <DatePicker showTime style={{ width: '100%' }} placeholder="请选择回复时间" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="证明材料" name="evidenceFile">
            <Input placeholder="请输入证明材料文件名" />
          </Form.Item>

          <Form.Item label="备注" name="remarks">
            <TextArea rows={3} placeholder="请输入备注信息" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SupplierDataModal;
