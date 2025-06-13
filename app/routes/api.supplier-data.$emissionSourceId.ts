import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';

// 模拟数据库数据
const mockSupplierData = [
  {
    id: '1',
    dataType: '供应商因子',
    vendorName: '钢铁供应商A',
    deadline: '2025-05-10 00:00:00',
    email: 'supplier-a@example.com',
    emissionSourceName: '钢材',
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
    emissionSourceId: 'emission-1',
  },
  {
    id: '2',
    dataType: '供应商因子',
    vendorName: '塑料供应商B',
    deadline: '2025-05-15 00:00:00',
    email: 'supplier-b@example.com',
    emissionSourceName: '塑料原料',
    dataSubmissionUrl: '/supplier_data_form.html?token=def456',
    status: '待回复',
    remarks: 'AI自动发送邮件，等待回复',
    createdAt: '2025-01-12 10:30:00',
    createdBy: 'AI助手',
    emissionSourceId: 'emission-2',
  },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const { emissionSourceId } = params;

  if (!emissionSourceId) {
    return json({ error: '缺少排放源ID' }, { status: 400 });
  }

  try {
    /*
     * 这里应该从数据库获取数据
     * const supplierData = await getSupplierDataFromDB(emissionSourceId);
     */

    // 模拟数据过滤
    const filteredData = mockSupplierData.filter((item) => item.emissionSourceId === emissionSourceId);

    return json({
      success: true,
      supplierData: filteredData,
    });
  } catch (error) {
    console.error('获取供应商数据失败:', error);
    return json({ error: '获取供应商数据失败' }, { status: 500 });
  }
}
