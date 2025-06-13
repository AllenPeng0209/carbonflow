/**
 * 阿里云 SDK 最小化测试脚本
 * 目的: 验证 AccessKey 是否有效，以及能否成功初始化文档智能客户端。
 */

async function runAliyunSDKTest() {
  console.log('[TestScript] 🚀 开始阿里云 SDK 最小化测试...');

  // 强调：请确保环境变量 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET 已设置为最新的有效值
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const region = process.env.ALIYUN_REGION || 'cn-hangzhou';

  if (!accessKeyId || !accessKeySecret) {
    console.error('[TestScript] ❌ 错误: AccessKey ID 或 Secret 未在环境变量中提供。请设置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET。');
    return;
  }

  console.log(`[TestScript] 🔑 使用 AccessKeyId: ${accessKeyId.substring(0, 10)}...`);

  try {
    console.log('[TestScript] 动态导入阿里云 SDK 模块...');
    const credentialModule = await import('@alicloud/credentials');
    const docMindClientModule = await import('@alicloud/docmind-api20220711');

    const Credential = credentialModule.default || credentialModule;
    const DocMindClient = docMindClientModule.default || docMindClientModule;

    console.log('[TestScript] ✅ SDK 模块加载成功。');

    console.log('[TestScript] ⚙️  创建凭证配置...');
    const credConfig = new Credential.Config({
      type: 'access_key',
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
    });
    console.log('[TestScript] ✅ 凭证配置创建成功。');

    console.log('[TestScript] 🔑 创建凭证实例...');
    const credential = new Credential.default(credConfig);
    console.log('[TestScript] ✅ 凭证实例创建成功。');

    console.log('[TestScript] ☁️  初始化文档智能客户端...');
    const client = new DocMindClient.default({
      endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
      credential: credential,
      regionId: region,
    });
    console.log('[TestScript] ✅ 文档智能客户端初始化成功!');
    console.log('[TestScript] 🎉 SDK 基本功能测试通过！如果这里没有报错，说明 AccessKey 和 SDK 初始化是正常的。');
    console.log('[TestScript] 注意：这只测试了客户端初始化，并未实际调用API。');

  } catch (error) {
    console.error('[TestScript] ❌ 测试过程中发生错误:');
    if (error instanceof Error) {
      console.error(`[TestScript]   错误名称: ${error.name}`);
      console.error(`[TestScript]   错误信息: ${error.message}`);
      if (error['code']) { // 安全访问 code 属性
        console.error(`[TestScript]   错误代码: ${error['code']}`);
      }
      // 安全访问嵌套属性 data 和 RequestId
      if (error['data'] && typeof error['data'] === 'object' && error['data']['RequestId']) {
         console.error(`[TestScript]   RequestId: ${error['data']['RequestId']}`);
      } else if (error['requestId']) { // 有些错误对象可能直接有 requestId
         console.error(`[TestScript]   RequestId: ${error['requestId']}`);
      }
      console.error('[TestScript]   错误堆栈:', error.stack);
    } else {
      console.error('[TestScript]   未知错误对象:', error);
    }
    // 修正 console.error 中的字符串换行
    console.error('\n[TestScript] 👉 请仔细检查以下几点:'); 
    console.error('  1. AccessKey ID 和 Secret 是否完全正确无误 (包括大小写，无多余空格)？');
    console.error('  2. AccessKey 是否在阿里云控制台处于 "已启用" 状态？');
    console.error('  3. 如果是 RAM 子账号的 AccessKey，是否已授予调用文档智能 (docmind) 服务的权限？');
    console.error('  4. Region (区域) 设置是否正确？');
    console.error('  5. 网络访问策略是否允许当前IP或公网访问？(可能需要几分钟生效)');
  }
}

runAliyunSDKTest(); 