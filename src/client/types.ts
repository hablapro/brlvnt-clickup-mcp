/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Client Types
 */

export interface ClickUpMCPConfig {
  serverUrl?: string;
  apiKey?: string;
  teamId?: string;
  transport?: 'http' | 'sse' | 'stdio';
  port?: number;
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
}

export interface ClickUpMCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface ClickUpMCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ClickUpMCPEvent {
  type: 'notification' | 'error' | 'log';
  data: any;
  timestamp: number;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: number;
  due_date?: string;
  assignees?: string[];
  tags?: string[];
  list_id?: string;
  space_id?: string;
  folder_id?: string;
  custom_fields?: Record<string, any>;
  attachments?: ClickUpAttachment[];
  comments?: ClickUpComment[];
  time_estimate?: number;
  time_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface ClickUpAttachment {
  id: string;
  title: string;
  type: string;
  url: string;
  size: number;
  created_at: string;
}

export interface ClickUpComment {
  id: string;
  comment_text: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count: number;
  space_id: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  task_count: number;
  space_id: string;
  lists: ClickUpList[];
  created_at: string;
  updated_at: string;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
  created_at: string;
  updated_at: string;
}

export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface ClickUpTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ClickUpTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  billable: boolean;
  start: string;
  end?: string;
  duration: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ClickUpDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface N8NIntegrationConfig {
  webhookUrl?: string;
  apiKey?: string;
  workflowId?: string;
  nodeId?: string;
  triggerType?: 'webhook' | 'polling' | 'manual';
  pollingInterval?: number;
}

export interface ClickUpMCPOperation {
  operation: string;
  params: Record<string, any>;
  metadata?: {
    source: string;
    timestamp: number;
    correlationId?: string;
  };
}

export interface ClickUpMCPOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    operation: string;
    timestamp: number;
    duration: number;
    correlationId?: string;
  };
}

export type ClickUpMCPTransport = 'http' | 'sse' | 'stdio' | 'n8n' | 'webhook';

export interface ClickUpMCPConnectionState {
  connected: boolean;
  transport: ClickUpMCPTransport;
  serverUrl?: string;
  lastHeartbeat?: number;
  errorCount: number;
  reconnectAttempts: number;
}

export interface ClickUpMCPMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: number;
  uptime: number;
} 