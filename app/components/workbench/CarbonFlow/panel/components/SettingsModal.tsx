import React, { useEffect, useState } from 'react';
import { Modal, Form, Row, Col, Input, Select, DatePicker, InputNumber } from 'antd';
import type { FormInstance } from 'antd/es/form';
import dayjs from 'dayjs';
import type { SceneInfoType } from '~/types/scene';
import { ProductService } from '~/lib/services/productService';
import type { Product } from '~/types/supabase';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface SettingsModalProps {
  visible: boolean;
  form: FormInstance;
  initialValues?: SceneInfoType;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  form,
  initialValues,
  confirmLoading = false,
  onCancel,
  onSubmit,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (visible) {
      const fetchProducts = async () => {
        setLoadingProducts(true);
        
        try {
          const productList = await ProductService.getAllProducts();
          setProducts(productList || []);
        } catch (error) {
          console.error('获取产品列表失败:', error);
        } finally {
          setLoadingProducts(false);
        }
      };
      
      fetchProducts();
    }
  }, [visible]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 处理日期范围
      if (values.dataCollectionPeriod) {
        values.dataCollectionStartDate = values.dataCollectionPeriod[0]?.toISOString();
        values.dataCollectionEndDate = values.dataCollectionPeriod[1]?.toISOString();
        delete values.dataCollectionPeriod;
      }

      await onSubmit(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <Modal
      title="场景设置"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={confirmLoading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialValues,
          dataCollectionPeriod:
            initialValues?.dataCollectionStartDate && initialValues?.dataCollectionEndDate
              ? [dayjs(initialValues.dataCollectionStartDate), dayjs(initialValues.dataCollectionEndDate)]
              : undefined,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="核算产品" name="productName" rules={[{ required: true, message: '请选择核算产品' }]}>
              <Select placeholder="请选择核算产品" loading={loadingProducts} showSearch optionFilterProp="children">
                {products.map((product) => (
                  <Option key={product.id} value={product.name}>
                    {product.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="预期核验级别"
              name="verificationLevel"
              rules={[{ required: true, message: '请选择预期核验级别' }]}
            >
              <Select placeholder="请选择预期核验级别">
                <Option value="准核验级别">准核验级别</Option>
                <Option value="披露级别">披露级别</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="满足标准" name="standard" rules={[{ required: true, message: '请选择满足的标准' }]}>
              <Select placeholder="请选择满足的标准" showSearch optionFilterProp="children">
                <Option value="ISO 14067">ISO 14067 - 产品碳足迹</Option>
                <Option value="ISO 14064">ISO 14064 - 温室气体核算</Option>
                <Option value="ISO 14040/14044">ISO 14040/14044 - LCA标准</Option>
                <Option value="PAS 2050">PAS 2050 - 碳足迹规范</Option>
                <Option value="GHG Protocol">GHG Protocol - 温室气体协议</Option>
                <Option value="EU 2023/1542">EU 2023/1542 - 欧盟电池法</Option>
                <Option value="GB/T 32150">GB/T 32150 - 工业企业温室气体排放核算</Option>
                <Option value="GB/T 32151">GB/T 32151 - 中国产品碳足迹</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="生命周期范围"
              name="lifecycleType"
              rules={[{ required: true, message: '请选择生命周期范围' }]}
            >
              <Select placeholder="请选择生命周期范围">
                <Option value="full">全生命周期 (摇篮到坟墓)</Option>
                <Option value="half">半生命周期 (摇篮到大门)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="数据收集时间范围"
          name="dataCollectionPeriod"
          rules={[{ required: true, message: '请选择数据收集时间范围' }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="总产量数值"
              name="totalOutputValue"
              rules={[{ required: true, message: '请输入总产量数值' }]}
            >
              <InputNumber placeholder="请输入总产量数值" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="单位" name="totalOutputUnit" rules={[{ required: true, message: '请输入单位' }]}>
              <Input placeholder="如：kg" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="核算基准数值"
              name="benchmarkValue"
              rules={[{ required: true, message: '请输入核算基准数值' }]}
            >
              <InputNumber placeholder="请输入核算基准数值" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="单位" name="benchmarkUnit" rules={[{ required: true, message: '请输入单位' }]}>
              <Input placeholder="如：kg" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
