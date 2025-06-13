// 供应商数据服务
export interface SupplierDataItem {
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
  emissionSourceId: string;
}

export interface AIEmailRequest {
  emissionSourceId: string;
  emissionSourceName: string;
  dataType: string;
  vendorName: string;
  email: string;
  deadline: string;
  remarks?: string;
}

export interface SupplierDataRequest {
  emissionSourceId: string;
  dataType: string;
  vendorName: string;
  email: string;
  deadline: string;
  value?: number;
  unit?: string;
  evidenceFile?: string;
  status?: string;
  respondent?: string;
  responseTime?: string;
  remarks?: string;
}

// 获取排放源的供应商数据
export async function getSupplierDataByEmissionSource(emissionSourceId: string): Promise<SupplierDataItem[]> {
  try {
    const response = await fetch(`/api/supplier-data/${emissionSourceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.supplierData || [];
  } catch (error) {
    console.error('获取供应商数据失败:', error);
    throw error;
  }
}

// AI自动发送邮件
export async function sendAIEmailToSupplier(request: AIEmailRequest): Promise<SupplierDataItem> {
  try {
    const response = await fetch('/api/supplier-data/ai-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.supplierData;
  } catch (error) {
    console.error('AI邮件发送失败:', error);
    throw error;
  }
}

// 手动添加供应商数据
export async function addSupplierData(request: SupplierDataRequest): Promise<SupplierDataItem> {
  try {
    const response = await fetch('/api/supplier-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.supplierData;
  } catch (error) {
    console.error('添加供应商数据失败:', error);
    throw error;
  }
}

// 更新供应商数据
export async function updateSupplierData(id: string, request: Partial<SupplierDataRequest>): Promise<SupplierDataItem> {
  try {
    const response = await fetch(`/api/supplier-data/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.supplierData;
  } catch (error) {
    console.error('更新供应商数据失败:', error);
    throw error;
  }
}

// 删除供应商数据
export async function deleteSupplierData(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/supplier-data/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('删除供应商数据失败:', error);
    throw error;
  }
}

// 重新发送邮件
export async function resendEmailToSupplier(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/supplier-data/${id}/resend-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('重新发送邮件失败:', error);
    throw error;
  }
}

// 生成供应商数据填报链接
export function generateSupplierDataSubmissionUrl(token: string): string {
  return `/supplier_data_form.html?token=${token}`;
}

// 生成唯一token
export function generateUniqueToken(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
