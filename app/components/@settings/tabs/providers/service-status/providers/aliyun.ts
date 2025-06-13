import { BaseProviderChecker } from '~/components/@settings/tabs/providers/service-status/base-provider';
import type { StatusCheckResult } from '~/components/@settings/tabs/providers/service-status/types';

export class AliyunStatusChecker extends BaseProviderChecker {
  async checkStatus(): Promise<StatusCheckResult> {
    try {
      // 检查阿里云通义千问API状态 - 使用OpenAI兼容模式端点
      const apiEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/models';
      const apiStatus = await this.checkApiEndpoint(apiEndpoint, this.config.headers, this.config.testModel);

      // 检查Agent模式API端点状态
      const agentEndpoint = 'https://dashscope.aliyuncs.com/api/v1';
      const agentStatus = await this.checkApiEndpoint(agentEndpoint, this.config.headers);

      // 检查阿里云服务状态页面
      const statusPageResponse = await fetch('https://status.aliyun.com/');
      const text = await statusPageResponse.text();

      // 解析服务状态
      const services = {
        dashscope: {
          operational: text.includes('通义千问 ? 正常'),
          degraded: text.includes('通义千问 ? 性能下降'),
          outage: text.includes('通义千问 ? 服务中断') || text.includes('通义千问 ? 部分中断'),
        },
      };

      // 提取最近事件
      const incidents: string[] = [];
      const incidentMatches = text.match(/最近事件(.*?)(?=\w+ \d+, \d{4})/s);

      if (incidentMatches) {
        const recentIncidents = incidentMatches[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && line.includes('202'));

        incidents.push(...recentIncidents.slice(0, 5));
      }

      // 确定整体状态
      let status: StatusCheckResult['status'] = 'operational';
      const messages: string[] = [];

      if (services.dashscope.outage) {
        status = 'down';
        messages.push('通义千问: 服务中断');
      } else if (services.dashscope.degraded) {
        status = 'degraded';
        messages.push('通义千问: 性能下降');
      } else if (services.dashscope.operational) {
        messages.push('通义千问: 正常运行');
      }

      // 添加API端点状态信息
      if (apiStatus.ok) {
        messages.push('标准API: 正常');
      } else {
        messages.push('标准API: 异常');

        if (status === 'operational') {
          status = 'degraded';
        }
      }

      if (agentStatus.ok) {
        messages.push('Agent API: 正常');
      } else {
        messages.push('Agent API: 异常');

        if (status === 'operational') {
          status = 'degraded';
        }
      }

      // 如果状态页面检查失败，回退到端点检查
      if (!statusPageResponse.ok) {
        const overallStatus = apiStatus.ok && agentStatus.ok ? 'operational' : 'degraded';
        return {
          status: overallStatus,
          message: `API状态: 标准API ${apiStatus.ok ? '正常' : '异常'}, Agent API ${agentStatus.ok ? '正常' : '异常'}`,
          incidents: ['注意: 由于CORS限制，状态信息有限'],
        };
      }

      return {
        status,
        message: messages.join(', ') || '状态未知',
        incidents,
      };
    } catch (error) {
      console.error('检查阿里云状态时出错:', error);

      // 回退到基本端点检查
      const apiEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/models';
      const apiStatus = await this.checkApiEndpoint(apiEndpoint, this.config.headers, this.config.testModel);

      const agentEndpoint = 'https://dashscope.aliyuncs.com/api/v1';
      const agentStatus = await this.checkApiEndpoint(agentEndpoint, this.config.headers);

      const overallStatus = apiStatus.ok && agentStatus.ok ? 'operational' : 'degraded';

      return {
        status: overallStatus,
        message: `API状态: 标准API ${apiStatus.ok ? '正常' : '异常'}, Agent API ${agentStatus.ok ? '正常' : '异常'}`,
        incidents: ['注意: 由于CORS限制，状态信息有限'],
      };
    }
  }
}
