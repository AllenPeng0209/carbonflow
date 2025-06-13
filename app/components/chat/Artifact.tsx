import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { WORK_DIR } from '~/utils/constants';

interface ArtifactProps {
  messageId: string;
}

type BundleStatus = 'running' | 'complete' | 'failed';

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);
  const [bundleStatus, setBundleStatus] = useState<BundleStatus>('running');

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  // 如果artifact不存在，直接返回null
  if (!artifact) {
    return null;
  }

  const actions = useStore(
    computed(artifact.runner.actions, (actions: Record<string, ActionState>) => {
      // Filter out Supabase actions except for migrations
      return Object.entries(actions).filter(([, action]) => {
        // Exclude actions with type 'supabase' or actions that contain 'supabase' in their content
        return action.type !== 'supabase' && !(action.type === 'shell' && action.content?.includes('supabase'));
      });
    }),
  );

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  // 只有当actions真正有变化且用户没有手动切换时才自动显示
  useEffect(() => {
    if (actions.length > 0 && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }
  }, [actions.length, showActions]); // 保持showActions依赖以确保正确检查

  useEffect(() => {
    if (actions.length !== 0 && artifact.type === 'bundled') {
      let newStatus: BundleStatus = 'complete';

      if (actions.some(([, a]) => a.status === 'failed' || a.status === 'aborted')) {
        newStatus = 'failed';
      } else if (actions.some(([, a]) => a.status === 'pending' || (a.status === 'running' && a.type !== 'start'))) {
        newStatus = 'running';
      }

      if (bundleStatus !== newStatus) {
        setBundleStatus(newStatus);
      }
    }
  }, [actions, artifact.type, bundleStatus]);

  // Determine the dynamic title based on state for bundled artifacts
  const dynamicTitle =
    artifact?.type === 'bundled'
      ? bundleStatus === 'failed'
        ? 'Project Setup Failed'
        : bundleStatus === 'complete'
          ? artifact.id === 'restored-project-setup'
            ? 'Project Restored'
            : 'Project Created'
          : artifact.id === 'restored-project-setup'
            ? 'Restoring Project...'
            : 'Creating Project...'
      : artifact?.title; // Fallback to original title for non-bundled or if artifact is missing

  return (
    <>
      <div className="artifact border border-bolt-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150">
        <div className="flex">
          <button
            className="flex items-stretch bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover w-full overflow-hidden"
            onClick={() => {
              const showWorkbench = workbenchStore.showWorkbench.get();
              workbenchStore.showWorkbench.set(!showWorkbench);
            }}
          >
            <div className="px-5 p-3.5 w-full text-left">
              <div className="w-full text-bolt-elements-textPrimary font-medium leading-5 text-sm">
                {/* Use the dynamic title here */}
                {dynamicTitle}
              </div>
              <div className="w-full w-full text-bolt-elements-textSecondary text-xs mt-0.5">
                Click to open Workbench
              </div>
            </div>
          </button>
          {artifact.type !== 'bundled' && <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />}
          <AnimatePresence>
            {actions.length && artifact.type !== 'bundled' && (
              <motion.button
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                exit={{ width: 0 }}
                transition={{ duration: 0.15, ease: cubicEasingFn }}
                className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
                onClick={toggleActions}
              >
                <div className="p-4">
                  <div className={showActions ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {artifact.type === 'bundled' && (
          <div className="flex items-center gap-1.5 p-5 bg-bolt-elements-actions-background border-t border-bolt-elements-artifacts-borderColor">
            <div
              className={classNames(
                'text-lg',
                getIconColor(
                  bundleStatus === 'failed' ? 'failed' : bundleStatus === 'complete' ? 'complete' : 'running',
                ),
              )}
            >
              {bundleStatus === 'complete' ? (
                <div className="i-ph:check"></div>
              ) : bundleStatus === 'failed' ? (
                <div className="i-ph:x"></div>
              ) : (
                <div className="i-svg-spinners:90-ring-with-bg"></div>
              )}
            </div>
            <div className="text-bolt-elements-textPrimary font-medium leading-5 text-sm">
              {/* This status text remains the same */}
              {bundleStatus === 'complete'
                ? artifact.id === 'restored-project-setup'
                  ? 'Restore files from snapshot'
                  : 'Initial files created'
                : bundleStatus === 'failed'
                  ? 'An error occurred during setup'
                  : 'Creating initial files'}
            </div>
          </div>
        )}
        <AnimatePresence>
          {artifact.type !== 'bundled' && showActions && actions.length > 0 && (
            <motion.div
              className="actions"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: '0px' }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-bolt-elements-artifacts-borderColor h-[1px]" />

              <div className="p-5 text-left bg-bolt-elements-actions-background">
                <ActionList actions={actions} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  // 只有messageId变化时才重新渲染
  return prevProps.messageId === nextProps.messageId;
});

interface ShellCodeBlockProps {
  classsName?: string;
  code: string;
}

function ShellCodeBlock({ classsName, code }: ShellCodeBlockProps) {
  const [highlighter, setHighlighter] = useState<HighlighterGeneric<BundledLanguage, BundledTheme> | null>(null);

  useEffect(() => {
    let isMounted = true;
    createHighlighter({
      langs: ['shell'],
      themes: ['light-plus', 'dark-plus'],
    }).then((hl) => {
      if (isMounted) {
        setHighlighter(hl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!highlighter) {
    // Render plain code while highlighter is loading
    return <pre className={classNames('text-xs', classsName)}>{code}</pre>;
  }

  return (
    <div
      className={classNames('text-xs', classsName)}
      dangerouslySetInnerHTML={{
        __html: highlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

interface ActionListProps {
  actions: [string, ActionState][];
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function openArtifactInWorkbench(filePath: any) {
  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

const ActionList = memo(({ actions }: ActionListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-2.5">
        {actions.map(([id, action], index) => {
          const { status, type, content } = action;
          const isLast = index === actions.length - 1;
          const visualStatus = status === 'running' && type === 'carbonflow' ? 'complete' : status;

          return (
            <motion.li
              key={id}
              variants={actionVariants}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.2,
                ease: cubicEasingFn,
              }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <div className={classNames('text-lg', getIconColor(visualStatus))}>
                  {visualStatus === 'running' ? (
                    <>
                      {type !== 'start' ? (
                        <div className="i-svg-spinners:90-ring-with-bg"></div>
                      ) : (
                        <div className="i-ph:terminal-window-duotone"></div>
                      )}
                    </>
                  ) : visualStatus === 'pending' ? (
                    <div className="i-ph:circle-duotone"></div>
                  ) : visualStatus === 'complete' ? (
                    <div className="i-ph:check"></div>
                  ) : visualStatus === 'failed' || visualStatus === 'aborted' ? (
                    <div className="i-ph:x"></div>
                  ) : null}
                </div>
                {type === 'file' ? (
                  <div>
                    Create{' '}
                    <code
                      className="bg-bolt-elements-artifacts-inlineCode-background text-bolt-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-bolt-elements-item-contentAccent hover:underline cursor-pointer"
                      onClick={() => openArtifactInWorkbench(action.filePath)}
                    >
                      {action.filePath}
                    </code>
                  </div>
                ) : type === 'shell' ? (
                  <div className="flex items-center w-full min-h-[28px]">
                    <span className="flex-1">Run command</span>
                  </div>
                ) : type === 'start' ? (
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      workbenchStore.currentView.set('preview');
                    }}
                    className="flex items-center w-full min-h-[28px]"
                  >
                    <span className="flex-1">Start Application</span>
                  </a>
                ) : type === 'carbonflow' ? (
                  <div className="flex items-center w-full min-h-[28px]">
                    <span className="flex-1">{getCarbonFlowActionText((action as any).operation)}</span>
                  </div>
                ) : null}
              </div>
              {(type === 'shell' || type === 'start') && (
                <ShellCodeBlock
                  classsName={classNames('mt-1', {
                    'mb-3.5': !isLast,
                  })}
                  code={content}
                />
              )}
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
});

function getCarbonFlowActionText(operation: string) {
  switch (operation) {
    case 'plan':
      return '全局任务规划';
    case 'scene':
      return '项目场景配置';
    case 'create':
      return '创建物料节点';
    case 'update':
      return '更新节点数据';
    case 'delete':
      return '删除节点';
    case 'connect':
      return '连接节点';
    case 'layout':
      return '调整布局';
    case 'calculate':
      return '计算碳足迹';

    case 'generate_supplier_task':
      return '生成供应商数据收集任务';
    case 'carbon_factor_match':
      return '优化碳因子匹配';
    case 'generate_data_validation_task':
      return '生成数据验证任务';
    case 'report':
      return '生成碳足迹报告';
    default:
      return '执行CarbonFlow操作';
  }
}

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-bolt-elements-textTertiary';
    }
    case 'running': {
      return 'text-bolt-elements-loader-progress';
    }
    case 'complete': {
      return 'text-bolt-elements-icon-success';
    }
    case 'aborted': {
      return 'text-bolt-elements-textSecondary';
    }
    case 'failed': {
      return 'text-bolt-elements-icon-error';
    }
    default: {
      return undefined;
    }
  }
}
