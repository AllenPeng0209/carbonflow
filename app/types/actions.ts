import type { Change } from 'diff';
// import type { NodeType, NodeData } from './nodes'; // Import NodeType and NodeData

// import type { NodeData } from './nodes'; // Removed unused import

export type ActionType =
  | 'file'
  | 'shell'
  | 'start'
  | 'supabase'
  | 'carbonflow'
  | 'llm'
  | 'datasheet'
  | 'settings'
  | 'build';

export interface BaseAction {
  type: ActionType;
  content: string;
  description?: string;
  traceId?: string;
}

export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
}

export interface StartAction extends BaseAction {
  type: 'start';
}

export interface BuildAction extends BaseAction {
  type: 'build';
}

export interface SupabaseAction extends BaseAction {
  type: 'supabase';
  operation: 'migration' | 'query';
  filePath?: string;
  projectId?: string;
}

export interface CarbonFlowAction extends BaseAction {
  nodeType?: string; // For create operations - using string instead of NodeType
  position?: string; // JSON string for {x, y} coordinates, for create operations
  source?: string; // Source node ID for connect operations
  target?: string; // Target node ID for connect operations
  type: 'carbonflow';
  nodeId?: string; // Optional nodeId
  data?: any; // Optional data, consider a more specific type later
  fileName?: string; // Optional fileName
  fileId?: string; // Optional fileId for file parsing operations
  operation:
    | 'plan'
    | 'ai_autofill_transport_data' // Added new operation type
    | 'ai_autofill_conversion_data' // Added new operation type
    | 'scene'
    | 'create'
    | 'update'
    | 'delete'
    | 'query'
    | 'connect'
    | 'layout'
    | 'calculate'
    | 'file_parser'
    | 'carbon_factor_match'
    | 'carbon_factor_match_with_ai'
    | 'generate_supplier_task'
    | 'ai_autofill'
    | 'generate_data_validation_task'
    | 'report';
  workflowid?: string;
  filePath?: string;

  // fileName is already defined above
}

export type BoltAction = FileAction | ShellAction | StartAction | BuildAction | SupabaseAction | CarbonFlowAction;

export type BoltActionData = BoltAction | BaseAction;

export interface ActionAlert {
  type: string;
  title: string;
  description: string;
  content: string;
  source?: 'terminal' | 'preview';
}

export interface SupabaseAlert {
  type: string;
  title: string;
  description: string;
  content: string;
  source?: 'supabase';
}

export interface FileHistory {
  originalContent: string;
  lastModified: number;
  changes: Change[];
  versions: {
    timestamp: number;
    content: string;
  }[];
  changeSource?: 'user' | 'auto-save' | 'external';
}
