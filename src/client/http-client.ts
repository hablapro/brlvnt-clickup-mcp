/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP HTTP Client
 * 
 * Provides HTTP-based communication with the ClickUp MCP Server.
 * Suitable for N8N integration and other HTTP-based workflows.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  ClickUpMCPConfig, 
  ClickUpMCPRequest, 
  ClickUpMCPResponse, 
  ClickUpMCPOperationResult,
  ClickUpMCPConnectionState,
  ClickUpMCPMetrics
} from './types.js';
import { info, error, debug } from '../logger.js';

export class ClickUpMCPHTTPClient {
  private config: ClickUpMCPConfig;
  private httpClient: AxiosInstance;
  private connectionState: ClickUpMCPConnectionState;
  private metrics: ClickUpMCPMetrics;
  private requestIdCounter: number = 0;

  constructor(config: ClickUpMCPConfig = {}) {
    this.config = {
      serverUrl: 'http://localhost:3000',
      timeout: 30000,
      retries: 3,
      enableLogging: true,
      ...config
    };

    this.connectionState = {
      connected: false,
      transport: 'http',
      serverUrl: this.config.serverUrl,
      errorCount: 0,
      reconnectAttempts: 0
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: 0
    };

    this.httpClient = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClickUp-MCP-Client/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.config.enableLogging) {
          debug('HTTP Request', {
            method: config.method,
            url: config.url,
            data: config.data
          });
        }
        return config;
      },
      (error) => {
        error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        const startTime = (response.config as any).metadata?.startTime || Date.now();
        this.updateMetrics(true, Date.now() - startTime);
        if (this.config.enableLogging) {
          debug('HTTP Response', {
            status: response.status,
            data: response.data
          });
        }
        return response;
      },
      (error) => {
        this.updateMetrics(false, 0);
        this.connectionState.errorCount++;
        error('HTTP Response Error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.lastRequestTime = Date.now();
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  async connect(): Promise<void> {
    try {
      const response = await this.httpClient.get('/health');
      if (response.status === 200) {
        this.connectionState.connected = true;
        this.connectionState.lastHeartbeat = Date.now();
        this.connectionState.errorCount = 0;
        this.connectionState.reconnectAttempts = 0;
        info('Connected to ClickUp MCP Server via HTTP');
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (err) {
      this.connectionState.connected = false;
      error('Failed to connect to ClickUp MCP Server', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.connectionState.connected = false;
    info('Disconnected from ClickUp MCP Server');
  }

  async sendRequest(method: string, params?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    const request: ClickUpMCPRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    try {
      const response = await this.httpClient.post('/mcp', request, {
        metadata: { startTime }
      } as any);

      const result: ClickUpMCPOperationResult = {
        success: true,
        data: response.data.result,
        metadata: {
          operation: method,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          correlationId: requestId
        }
      };

      return result;
    } catch (err: any) {
      const result: ClickUpMCPOperationResult = {
        success: false,
        error: err.message || 'Unknown error',
        metadata: {
          operation: method,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          correlationId: requestId
        }
      };

      return result;
    }
  }

  async getTasks(listId?: string, listName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = { ...options };
    if (listId) params.listId = listId;
    if (listName) params.listName = listName;
    
    return this.sendRequest('get_tasks', params);
  }

  async getTask(taskId?: string, taskName?: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = { ...options };
    if (taskId) params.taskId = taskId;
    if (taskName) params.taskName = taskName;
    
    return this.sendRequest('get_task', params);
  }

  async createTask(name: string, listId: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params = {
      name,
      listId,
      ...options
    };
    
    return this.sendRequest('create_task', params);
  }

  async updateTask(taskId: string, updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskId,
      ...updates
    };
    
    return this.sendRequest('update_task', params);
  }

  async deleteTask(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.sendRequest('delete_task', { taskId });
  }

  async getLists(spaceId?: string, folderId?: string): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = {};
    if (spaceId) params.spaceId = spaceId;
    if (folderId) params.folderId = folderId;
    
    return this.sendRequest('get_lists', params);
  }

  async getFolders(spaceId?: string): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = {};
    if (spaceId) params.spaceId = spaceId;
    
    return this.sendRequest('get_folders', params);
  }

  async getSpaces(): Promise<ClickUpMCPOperationResult> {
    return this.sendRequest('get_spaces');
  }

  async getTags(): Promise<ClickUpMCPOperationResult> {
    return this.sendRequest('get_tags');
  }

  async addTimeEntry(taskId: string, duration: number, description?: string): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskId,
      duration,
      description
    };
    
    return this.sendRequest('add_time_entry', params);
  }

  async getTimeEntries(taskId?: string, startDate?: string, endDate?: string): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = {};
    if (taskId) params.taskId = taskId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.sendRequest('get_time_entries', params);
  }

  async uploadAttachment(taskId: string, filePath: string, fileName?: string): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskId,
      filePath,
      fileName
    };
    
    return this.sendRequest('upload_attachment', params);
  }

  async addComment(taskId: string, commentText: string): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskId,
      commentText
    };
    
    return this.sendRequest('add_comment', params);
  }

  async getComments(taskId: string): Promise<ClickUpMCPOperationResult> {
    return this.sendRequest('get_comments', { taskId });
  }

  async searchTasks(query: string, options?: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params = {
      query,
      ...options
    };
    
    return this.sendRequest('search_tasks', params);
  }

  async bulkUpdateTasks(taskIds: string[], updates: Record<string, any>): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskIds,
      updates
    };
    
    return this.sendRequest('bulk_update_tasks', params);
  }

  async moveTask(taskId: string, targetListId: string): Promise<ClickUpMCPOperationResult> {
    const params = {
      taskId,
      targetListId
    };
    
    return this.sendRequest('move_task', params);
  }

  async duplicateTask(taskId: string, targetListId?: string): Promise<ClickUpMCPOperationResult> {
    const params: Record<string, any> = { taskId };
    if (targetListId) params.targetListId = targetListId;
    
    return this.sendRequest('duplicate_task', params);
  }

  getConnectionState(): ClickUpMCPConnectionState {
    return { ...this.connectionState };
  }

  getMetrics(): ClickUpMCPMetrics {
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.connectionState.connected;
  }
} 