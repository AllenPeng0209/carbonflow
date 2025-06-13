export type ContextAnnotation =
  | {
      type: 'codeContext';
      files: string[];
    }
  | {
      type: 'chatSummary';
      summary: string;
      chatId: string;
    }
  | {
      type: 'tool-execution';
      toolName: string;
      status: 'started' | 'completed' | 'failed';
      query?: string;
      result?: any;
      duration?: number;
      timestamp: string;
    }
  | {
      type: 'knowledge-query';
      query: string;
      result: {
        成功: boolean;
        内容?: string;
        错误?: string;
        查询: string;
        时间: string;
        上下文?: string;
        执行时长?: string;
      };
      duration?: number;
      timestamp: string;
    };

export type ProgressAnnotation = {
  type: 'progress';
  label: string;
  status: 'in-progress' | 'complete';
  order: number;
  message: string;
};
