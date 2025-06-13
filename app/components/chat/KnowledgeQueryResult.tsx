import { memo } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import type { ContextAnnotation } from '~/types/context';

interface KnowledgeQueryResultProps {
  annotation: Extract<ContextAnnotation, { type: 'knowledge-query' }>;
}

export const KnowledgeQueryResult = memo(({ annotation }: KnowledgeQueryResultProps) => {
  const { query, result, duration, timestamp } = annotation;
  const { 成功, 内容, 错误, 时间, 上下文, 执行时长 } = result;

  const copyToClipboard = () => {
    const textToCopy = `查询：${query}\n结果：${内容 || 错误}\n时间：${时间}${执行时长 ? `\n执行时长：${执行时长}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
  };

  const saveResult = () => {
    // 这里可以实现保存到笔记或其他地方的功能
    console.log('保存查询结果:', annotation);
  };

  return (
    <div className="mb-4 border border-bolt-elements-borderColor rounded-lg overflow-hidden bg-bolt-elements-surface-secondary">
      {/* 头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-green-500/10 border-b border-bolt-elements-borderColor">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-bolt-elements-textPrimary">
              🔍 专业知识库查询
            </span>
            {duration && (
              <span className="text-xs text-bolt-elements-textSecondary bg-bolt-elements-surface-tertiary px-2 py-1 rounded">
                {duration}ms
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <IconButton 
              onClick={copyToClipboard}
              title="复制结果"
              className="!p-1"
            >
              <div className="i-ph:copy w-4 h-4" />
            </IconButton>
            <IconButton 
              onClick={saveResult}
              title="保存结果"
              className="!p-1"
            >
              <div className="i-ph:bookmark w-4 h-4" />
            </IconButton>
          </div>
        </div>
        
        {/* 查询内容 */}
        <div className="mt-2">
          <div className="text-xs text-bolt-elements-textSecondary mb-1">查询问题：</div>
          <div className="text-sm text-bolt-elements-textPrimary bg-bolt-elements-surface-primary px-3 py-2 rounded border border-bolt-elements-borderColor">
            {query}
          </div>
        </div>
      </div>

      {/* 结果内容 */}
      <div className="p-4">
        {成功 ? (
          <div className="space-y-3">
            {/* 成功状态指示 */}
            <div className="flex items-center gap-2 text-green-600">
              <div className="i-ph:check-circle w-4 h-4" />
              <span className="text-sm font-medium">查询成功</span>
            </div>
            
            {/* 结果内容 */}
            <div className="bg-bolt-elements-surface-primary border border-bolt-elements-borderColor rounded-lg p-4">
              <div className="text-sm text-bolt-elements-textPrimary whitespace-pre-wrap leading-relaxed">
                {内容}
              </div>
            </div>
            
            {/* 元信息 */}
            <div className="flex items-center justify-between text-xs text-bolt-elements-textSecondary">
              <div className="flex items-center gap-4">
                <span>查询时间：{时间}</span>
                {执行时长 && <span>执行时长：{执行时长}</span>}
                {上下文 && <span>上下文：{上下文}</span>}
              </div>
              <div className="flex items-center gap-1">
                <div className="i-ph:database w-3 h-3" />
                <span>专业知识库</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 错误状态指示 */}
            <div className="flex items-center gap-2 text-red-600">
              <div className="i-ph:x-circle w-4 h-4" />
              <span className="text-sm font-medium">查询失败</span>
            </div>
            
            {/* 错误信息 */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-700">
                {错误 || '未知错误'}
              </div>
            </div>
            
            {/* 时间信息 */}
            <div className="text-xs text-bolt-elements-textSecondary">
              <div className="flex items-center gap-4">
                <span>查询时间：{时间}</span>
                {执行时长 && <span>执行时长：{执行时长}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

KnowledgeQueryResult.displayName = 'KnowledgeQueryResult'; 