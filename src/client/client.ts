/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Client
 * 
 * Main client class that provides a unified interface for all transport types.
 * Automatically selects the best transport based on configuration and requirements.
 */

import { ClickUpMCPHTTPClient } from './http-client.js';
import { ClickUpMCPSSEClient } from './sse-client.js';
import { ClickUpMCPN8NClient } from './n8n-client.js';
import { 
  ClickUpMCPConfig, 
  ClickUpMCPOperationResult,
  ClickUpMCPTransport,
  ClickUpMCPConnectionState,
  ClickUpMCPMetrics,
  N8NIntegrationConfig
} from './types.js';
import { info, error, debug } from '../logger.js';

export class ClickUpMCPClient {
  private config: ClickUpMCPConfig;
  private n8nConfig?: N8NIntegrationConfig;
  private httpClient: ClickUpMCPHTTPClient;
  private sseClient: ClickUpMCPSSEClient;
  private n8nClient: ClickUpMCPN8NClient;
  private activeClient: ClickUpMCPHTTPClient | ClickUpMCPSSEClient | ClickUpMCPN8NClient;
  private transport: ClickUpMCPTransport;

  constructor(config: ClickUpMCPConfig = {}, n8nConfig?: N8NIntegrationConfig) {
    this.config = {
      serverUrl: 'http://localhost:3000',
      transport: 'http',
      timeout: 30000,
      retries: 3,
      enableLogging: true,
      ...config
    };

    this.n8nConfig = n8nConfig;
    this.transport = this.config.transport || 'http';

    // Initialize all clients
    this.httpClient = new ClickUpMCPHTTPClient(this.config);
    this.sseClient = new ClickUpMCPSSEClient(this.config);
    this.n8nClient = new ClickUpMCPN8NClient(this.config, this.n8nConfig);

    // Set active client based on transport
    this.activeClient = this.getActiveClient();
  }

  private getActiveClient(): ClickUpMCPHTTPClient | ClickUpMCPSSEClient | ClickUpMCPN8NClient {
    switch (this.transport) {
      case 'sse':
        return this.sseClient;
      case 'n8n':
      case 'webhook':
        return this.n8nClient;
      case 'http':
      default:
        return this.httpClient;
    }
  }

  async connect(): Promise<void> {
    try {
      info(`Connecting to ClickUp MCP Server using ${this.transport} transport`);
      
      if (this.transport === 'n8n' || this.transport === 'webhook') {
        await this.n8nClient.connect();
      } else if (this.transport === 'sse') {
        await this.sseClient.connect();
      } else {
        await this.httpClient.connect();
      }

      info('ClickUp MCP Client connected successfully');
    } catch (err) {
      error('Failed to connect ClickUp MCP Client', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.transport === 'n8n' || this.transport === 'webhook') {
        await this.n8nClient.disconnect();
      } else if (this.transport === 'sse') {
        await this.sseClient.disconnect();
      } else {
        await this.httpClient.disconnect();
      }

      info('ClickUp MCP Client disconnected');
    } catch (err) {
      error('Error disconnecting ClickUp MCP Client', err);
    }
  }

  // Transport switching methods
  async switchTransport(transport: ClickUpMCPTransport): Promise<void> {
    if (this.transport === transport) {
      return; // Already using this transport
    }

    // Disconnect current transport
    await this.disconnect();

    // Switch to new transport
    this.transport = transport;
    this.activeClient = this.getActiveClient();

    // Connect to new transport
    await this.connect();
  }

  // Task operations
  async getTasks(listId?: string, listName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getTasks(listId, listName, options);
  }

  async getTask(taskId?: string, taskName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getTask(taskId, taskName, options);
  }

  async createTask(name: string, listId: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.createTask(name, listId, options);
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.updateTask(taskId, updates);
  }

  async deleteTask(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.deleteTask(taskId);
  }

  async searchTasks(query: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.searchTasks(query, options);
  }

  async bulkUpdateTasks(taskIds: string[], updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.bulkUpdateTasks(taskIds, updates);
  }

  async moveTask(taskId: string, targetListId: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.moveTask(taskId, targetListId);
  }

  async duplicateTask(taskId: string, targetListId?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.duplicateTask(taskId, targetListId);
  }

  // List and folder operations
  async getLists(spaceId?: string, folderId?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getLists(spaceId, folderId);
  }

  async getFolders(spaceId?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getFolders(spaceId);
  }

  async getSpaces(): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getSpaces();
  }

  async getTags(): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getTags();
  }

  // Time tracking operations
  async addTimeEntry(taskId: string, duration: number, description?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.addTimeEntry(taskId, duration, description);
  }

  async getTimeEntries(taskId?: string, startDate?: string, endDate?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getTimeEntries(taskId, startDate, endDate);
  }

  // Attachment operations
  async uploadAttachment(taskId: string, filePath: string, fileName?: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.uploadAttachment(taskId, filePath, fileName);
  }

  // Comment operations
  async addComment(taskId: string, commentText: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.addComment(taskId, commentText);
  }

  async getComments(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.activeClient.getComments(taskId);
  }

  // N8N-specific methods (only available when using N8N client)
  async createTaskFromN8N(name: string, listId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.createTaskFromN8N(name, listId, n8nData);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async updateTaskFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.updateTaskFromN8N(taskId, n8nData);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async addTimeEntryFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.addTimeEntryFromN8N(taskId, n8nData);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async addCommentFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.addCommentFromN8N(taskId, n8nData);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async bulkCreateTasksFromN8N(tasks: Array<{ name: string; listId: string; data: any }>): Promise<ClickUpMCPOperationResult[]> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.bulkCreateTasksFromN8N(tasks);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async bulkUpdateTasksFromN8N(updates: Array<{ taskId: string; data: any }>): Promise<ClickUpMCPOperationResult[]> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.bulkUpdateTasksFromN8N(updates);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async pollForTaskUpdates(listId?: string, lastPollTime?: string): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.pollForTaskUpdates(listId, lastPollTime);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  async pollForNewTasks(listId?: string, lastPollTime?: string): Promise<ClickUpMCPOperationResult> {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.pollForNewTasks(listId, lastPollTime);
    }
    throw new Error('N8N methods are only available when using N8N transport');
  }

  // N8N webhook and trigger methods
  registerWebhookHandler(eventType: string, handler: Function): void {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      this.activeClient.registerWebhookHandler(eventType, handler);
    } else {
      throw new Error('Webhook handlers are only available when using N8N transport');
    }
  }

  registerWorkflowTrigger(triggerId: string, handler: Function): void {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      this.activeClient.registerWorkflowTrigger(triggerId, handler);
    } else {
      throw new Error('Workflow triggers are only available when using N8N transport');
    }
  }

  unregisterWorkflowTrigger(triggerId: string): void {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      this.activeClient.unregisterWorkflowTrigger(triggerId);
    } else {
      throw new Error('Workflow triggers are only available when using N8N transport');
    }
  }

  // SSE event methods (only available when using SSE client)
  on(event: string, listener: Function): void {
    if (this.activeClient instanceof ClickUpMCPSSEClient) {
      this.activeClient.on(event, listener);
    } else {
      throw new Error('Event listeners are only available when using SSE transport');
    }
  }

  off(event: string, listener: Function): void {
    if (this.activeClient instanceof ClickUpMCPSSEClient) {
      this.activeClient.off(event, listener);
    } else {
      throw new Error('Event listeners are only available when using SSE transport');
    }
  }

  // N8N URL getters
  getWebhookUrl(): string {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.getWebhookUrl();
    }
    throw new Error('Webhook URLs are only available when using N8N transport');
  }

  getTriggerUrl(triggerId: string): string {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.getTriggerUrl(triggerId);
    }
    throw new Error('Trigger URLs are only available when using N8N transport');
  }

  getHealthUrl(): string {
    if (this.activeClient instanceof ClickUpMCPN8NClient) {
      return this.activeClient.getHealthUrl();
    }
    throw new Error('Health URLs are only available when using N8N transport');
  }

  // Status and metrics
  getConnectionState(): ClickUpMCPConnectionState | any {
    return this.activeClient.getConnectionState();
  }

  getMetrics(): ClickUpMCPMetrics | any {
    return this.activeClient.getMetrics();
  }

  isConnected(): boolean {
    return this.activeClient.isConnected();
  }

  getTransport(): ClickUpMCPTransport {
    return this.transport;
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      const state = this.getConnectionState();
      return state.connected || (state.http?.connected && state.sse?.connected);
    } catch (err) {
      return false;
    }
  }

  async ping(): Promise<number> {
    const startTime = Date.now();
    try {
      await this.getSpaces(); // Light operation to test connectivity
      return Date.now() - startTime;
    } catch (err) {
      throw new Error(`Ping failed: ${err}`);
    }
  }
} 