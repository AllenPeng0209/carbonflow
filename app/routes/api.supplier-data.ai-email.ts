import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';

// 模拟AI邮件发送服务
async function sendAIEmailToSupplier(emailData: any) {
  /*
   * 这里应该集成真实的AI邮件服务
   * 比如调用OpenAI API生成邮件内容，然后通过邮件服务发送
   */

  console.log('AI邮件发送请求:', emailData);

  // 模拟AI生成邮件内容
  const emailContent = `
尊敬的${emailData.vendorName}，

您好！

为响应国家及行业对可持续发展和碳减排的要求，我们正在开展碳足迹相关数据的收集工作。

我们需要您提供关于"${emailData.emissionSourceName}"的${emailData.dataType}数据。

请在${emailData.deadline}之前，通过以下链接填报相关数据：
${emailData.dataSubmissionUrl}

如有任何问题，请随时联系我们。

感谢您的配合！

此致
敬礼！

Climate Seal 团队
  `;

  // 模拟发送邮件
  console.log('发送邮件内容:', emailContent);

  /*
   * 这里应该调用真实的邮件服务
   * await emailService.send({
   *   to: emailData.email,
   *   subject: `碳足迹数据收集请求 - ${emailData.emissionSourceName}`,
   *   content: emailContent
   * });
   */

  return {
    success: true,
    emailContent,
    sentAt: new Date().toISOString(),
  };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: '方法不允许' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as {
      emissionSourceId: string;
      emissionSourceName: string;
      dataType: string;
      vendorName: string;
      email: string;
      deadline: string;
      remarks?: string;
    };
    const { emissionSourceId, emissionSourceName, dataType, vendorName, email, deadline, remarks } = body;

    // 验证必填字段
    if (!emissionSourceId || !emissionSourceName || !dataType || !vendorName || !email || !deadline) {
      return json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 生成唯一token
    const token = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataSubmissionUrl = `/supplier_data_form.html?token=${token}`;

    // 准备邮件数据
    const emailData = {
      emissionSourceId,
      emissionSourceName,
      dataType,
      vendorName,
      email,
      deadline,
      dataSubmissionUrl,
      remarks,
    };

    // 发送AI邮件
    const emailResult = await sendAIEmailToSupplier(emailData);

    if (!emailResult.success) {
      return json({ error: 'AI邮件发送失败' }, { status: 500 });
    }

    // 创建供应商数据记录
    const supplierData = {
      id: Date.now().toString(),
      dataType,
      vendorName,
      deadline,
      email,
      emissionSourceName,
      dataSubmissionUrl,
      status: '待回复',
      remarks: remarks || 'AI自动发送邮件，等待回复',
      createdAt: new Date().toISOString(),
      createdBy: 'AI助手',
      emissionSourceId,
      token,
    };

    /*
     * 这里应该保存到数据库
     * await saveSupplierDataToDB(supplierData);
     */

    console.log('创建的供应商数据记录:', supplierData);

    return json({
      success: true,
      supplierData,
      emailResult,
    });
  } catch (error) {
    console.error('AI邮件发送失败:', error);
    return json({ error: 'AI邮件发送失败' }, { status: 500 });
  }
}
