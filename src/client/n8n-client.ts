/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP N8N Client
 * 
 * Specialized client for N8N integration with the ClickUp MCP Server.
 * Provides webhook handling, workflow triggers, and N8N-specific features.
 */

import express from 'express';
import { ClickUpMCPHTTPClient } from './http-client.js';
import { ClickUpMCPSSEClient } from './sse-client.js';
import { 
  ClickUpMCPConfig, 
  ClickUpMCPOperationResult,
  N8NIntegrationConfig,
  ClickUpMCPEvent
} from './types.js';
import { info, error, debug } from '../logger.js';

export class ClickUpMCPN8NClient {
  private config: ClickUpMCPConfig;
  private n8nConfig: N8NIntegrationConfig;
  private httpClient: ClickUpMCPHTTPClient;
  private sseClient: ClickUpMCPSSEClient;
  private webhookServer: express.Application | null = null;
  private webhookPort: number = 3001;
  private webhookHandlers: Map<string, Function[]> = new Map();
  private workflowTriggers: Map<string, Function> = new Map();

  constructor(config: ClickUpMCPConfig = {}, n8nConfig: N8NIntegrationConfig = {}) {
    this.config = config;
    this.n8nConfig = n8nConfig;
    
    this.httpClient = new ClickUpMCPHTTPClient(config);
    this.sseClient = new ClickUpMCPSSEClient(config);
  }

  async connect(): Promise<void> {
    try {
      // Connect both HTTP and SSE clients
      await Promise.all([
        this.httpClient.connect(),
        this.sseClient.connect()
      ]);

      // Setup webhook server if configured
      if (this.n8nConfig.webhookUrl || this.n8nConfig.triggerType === 'webhook') {
        await this.setupWebhookServer();
      }

      // Setup SSE event listeners for real-time triggers
      this.setupSSEEventListeners();

      info('ClickUp MCP N8N Client connected successfully');
    } catch (err) {
      error('Failed to connect ClickUp MCP N8N Client', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.httpClient.disconnect(),
        this.sseClient.disconnect()
      ]);

      if (this.webhookServer) {
        // Close webhook server
        this.webhookServer = null;
      }

      info('ClickUp MCP N8N Client disconnected');
    } catch (err) {
      error('Error disconnecting ClickUp MCP N8N Client', err);
    }
  }

  private async setupWebhookServer(): Promise<void> {
    this.webhookServer = express();
    this.webhookServer.use(express.json());

    // Health check endpoint
    this.webhookServer.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Webhook endpoint for N8N
    this.webhookServer.post('/webhook', (req, res) => {
      try {
        const event = req.body;
        this.handleWebhookEvent(event);
        res.json({ status: 'received' });
      } catch (err) {
        error('Error handling webhook event', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // N8N trigger endpoint
    this.webhookServer.post('/trigger/:triggerId', (req, res) => {
      try {
        const { triggerId } = req.params;
        const data = req.body;
        this.triggerWorkflow(triggerId, data);
        res.json({ status: 'triggered' });
      } catch (err) {
        error('Error triggering workflow', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Start webhook server
    return new Promise((resolve, reject) => {
      const server = this.webhookServer!.listen(this.webhookPort, () => {
        info(`N8N webhook server started on port ${this.webhookPort}`);
        resolve();
      });

      server.on('error', (err) => {
        error('Webhook server error', err);
        reject(err);
      });
    });
  }

  private setupSSEEventListeners(): void {
    // Listen for task updates
    this.sseClient.on('notification', (data) => {
      if (data.type === 'task_updated' || data.type === 'task_created') {
        this.triggerWorkflow('task_update', data);
      }
    });

    // Listen for time tracking events
    this.sseClient.on('notification', (data) => {
      if (data.type === 'time_entry_added' || data.type === 'time_entry_updated') {
        this.triggerWorkflow('time_tracking', data);
      }
    });

    // Listen for comment events
    this.sseClient.on('notification', (data) => {
      if (data.type === 'comment_added') {
        this.triggerWorkflow('comment_added', data);
      }
    });

    // Listen for attachment events
    this.sseClient.on('notification', (data) => {
      if (data.type === 'attachment_uploaded') {
        this.triggerWorkflow('attachment_uploaded', data);
      }
    });

    // Listen for status changes
    this.sseClient.on('notification', (data) => {
      if (data.type === 'status_changed') {
        this.triggerWorkflow('status_changed', data);
      }
    });
  }

  private handleWebhookEvent(event: any): void {
    const eventType = event.type || 'unknown';
    const handlers = this.webhookHandlers.get(eventType) || [];
    
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        error(`Error in webhook handler for ${eventType}`, err);
      }
    });

    // Also trigger any registered workflows
    this.triggerWorkflow(eventType, event);
  }

  private triggerWorkflow(triggerId: string, data: any): void {
    const handler = this.workflowTriggers.get(triggerId);
    if (handler) {
      try {
        handler(data);
      } catch (err) {
        error(`Error in workflow trigger ${triggerId}`, err);
      }
    } else {
      debug(`No workflow trigger registered for ${triggerId}`);
    }
  }

  // N8N-specific methods
  registerWebhookHandler(eventType: string, handler: Function): void {
    if (!this.webhookHandlers.has(eventType)) {
      this.webhookHandlers.set(eventType, []);
    }
    this.webhookHandlers.get(eventType)!.push(handler);
  }

  registerWorkflowTrigger(triggerId: string, handler: Function): void {
    this.workflowTriggers.set(triggerId, handler);
  }

  unregisterWorkflowTrigger(triggerId: string): void {
    this.workflowTriggers.delete(triggerId);
  }

  // N8N workflow helper methods
  async createTaskFromN8N(name: string, listId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    const options = {
      description: n8nData.description,
      assignees: n8nData.assignees,
      due_date: n8nData.due_date,
      priority: n8nData.priority,
      tags: n8nData.tags,
      custom_fields: n8nData.custom_fields,
      // Add N8N metadata
      metadata: {
        source: 'n8n',
        workflow_id: n8nData.workflow_id,
        execution_id: n8nData.execution_id,
        timestamp: new Date().toISOString()
      }
    };

    return this.httpClient.createTask(name, listId, options);
  }

  async updateTaskFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    const updates: Record<string, any> = {};
    
    if (n8nData.name) updates.name = n8nData.name;
    if (n8nData.description) updates.description = n8nData.description;
    if (n8nData.status) updates.status = n8nData.status;
    if (n8nData.assignees) updates.assignees = n8nData.assignees;
    if (n8nData.due_date) updates.due_date = n8nData.due_date;
    if (n8nData.priority) updates.priority = n8nData.priority;
    if (n8nData.tags) updates.tags = n8nData.tags;
    if (n8nData.custom_fields) updates.custom_fields = n8nData.custom_fields;

    // Add N8N metadata
    updates.metadata = {
      source: 'n8n',
      workflow_id: n8nData.workflow_id,
      execution_id: n8nData.execution_id,
      timestamp: new Date().toISOString()
    };

    return this.httpClient.updateTask(taskId, updates);
  }

  async addTimeEntryFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    const duration = n8nData.duration || 0;
    const description = n8nData.description || 'Time entry from N8N workflow';

    return this.httpClient.addTimeEntry(taskId, duration, description);
  }

  async addCommentFromN8N(taskId: string, n8nData: any): Promise<ClickUpMCPOperationResult> {
    const commentText = n8nData.comment || n8nData.message || 'Comment from N8N workflow';
    return this.httpClient.addComment(taskId, commentText);
  }

  // Bulk operations for N8N
  async bulkCreateTasksFromN8N(tasks: Array<{ name: string; listId: string; data: any }>): Promise<ClickUpMCPOperationResult[]> {
    const results: ClickUpMCPOperationResult[] = [];
    
    for (const task of tasks) {
      const result = await this.createTaskFromN8N(task.name, task.listId, task.data);
      results.push(result);
    }

    return results;
  }

  async bulkUpdateTasksFromN8N(updates: Array<{ taskId: string; data: any }>): Promise<ClickUpMCPOperationResult[]> {
    const results: ClickUpMCPOperationResult[] = [];
    
    for (const update of updates) {
      const result = await this.updateTaskFromN8N(update.taskId, update.data);
      results.push(result);
    }

    return results;
  }

  // N8N polling methods
  async pollForTaskUpdates(listId?: string, lastPollTime?: string): Promise<ClickUpMCPOperationResult> {
    const options: Record<string, any> = {};
    if (listId) options.listId = listId;
    if (lastPollTime) options.updated_after = lastPollTime;

    return this.httpClient.getTasks(undefined, undefined, options);
  }

  async pollForNewTasks(listId?: string, lastPollTime?: string): Promise<ClickUpMCPOperationResult> {
    const options: Record<string, any> = { include_closed: false };
    if (listId) options.listId = listId;
    if (lastPollTime) options.created_after = lastPollTime;

    return this.httpClient.getTasks(undefined, undefined, options);
  }

  // N8N webhook URL getters
  getWebhookUrl(): string {
    return `http://localhost:${this.webhookPort}/webhook`;
  }

  getTriggerUrl(triggerId: string): string {
    return `http://localhost:${this.webhookPort}/trigger/${triggerId}`;
  }

  getHealthUrl(): string {
    return `http://localhost:${this.webhookPort}/health`;
  }

  // Delegate to underlying clients for other operations
  async getTasks(listId?: string, listName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getTasks(listId, listName, options);
  }

  async getTask(taskId?: string, taskName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getTask(taskId, taskName, options);
  }

  async createTask(name: string, listId: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.createTask(name, listId, options);
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.updateTask(taskId, updates);
  }

  async deleteTask(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.deleteTask(taskId);
  }

  async getLists(spaceId?: string, folderId?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getLists(spaceId, folderId);
  }

  async getFolders(spaceId?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getFolders(spaceId);
  }

  async getSpaces(): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getSpaces();
  }

  async getTags(): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getTags();
  }

  async addTimeEntry(taskId: string, duration: number, description?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.addTimeEntry(taskId, duration, description);
  }

  async getTimeEntries(taskId?: string, startDate?: string, endDate?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getTimeEntries(taskId, startDate, endDate);
  }

  async uploadAttachment(taskId: string, filePath: string, fileName?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.uploadAttachment(taskId, filePath, fileName);
  }

  async addComment(taskId: string, commentText: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.addComment(taskId, commentText);
  }

  async getComments(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.getComments(taskId);
  }

  async searchTasks(query: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.searchTasks(query, options);
  }

  async bulkUpdateTasks(taskIds: string[], updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.bulkUpdateTasks(taskIds, updates);
  }

  async moveTask(taskId: string, targetListId: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.moveTask(taskId, targetListId);
  }

  async duplicateTask(taskId: string, targetListId?: string): Promise<ClickUpMCPOperationResult> {
    return this.httpClient.duplicateTask(taskId, targetListId);
  }

  // Get connection state and metrics from both clients
  getConnectionState() {
    return {
      http: this.httpClient.getConnectionState(),
      sse: this.sseClient.getConnectionState(),
      webhook: {
        port: this.webhookPort,
        active: !!this.webhookServer
      }
    };
  }

  getMetrics() {
    return {
      http: this.httpClient.getMetrics(),
      sse: this.sseClient.getMetrics(),
      webhook: {
        handlers: this.webhookHandlers.size,
        triggers: this.workflowTriggers.size
      }
    };
  }

  isConnected(): boolean {
    return this.httpClient.isConnected() && this.sseClient.isConnected();
  }
} 