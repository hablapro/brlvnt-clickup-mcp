/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP SSE Client
 *
 * Provides Server-Sent Events (SSE) communication with the ClickUp MCP Server.
 * Ideal for real-time updates and N8N workflows requiring live data.
 */
import { EventSource } from 'eventsource';
import axios from 'axios';
import { info, error } from '../logger.js';
export class ClickUpMCPSSEClient {
    constructor(config = {}) {
        this.eventSource = null;
        this.requestIdCounter = 0;
        this.pendingRequests = new Map();
        this.eventListeners = new Map();
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.config = {
            serverUrl: 'http://localhost:3000',
            timeout: 30000,
            retries: 3,
            enableLogging: true,
            ...config
        };
        this.connectionState = {
            connected: false,
            transport: 'sse',
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
                'User-Agent': 'ClickUp-MCP-SSE-Client/1.0.0'
            }
        });
    }
    generateRequestId() {
        return `req_${Date.now()}_${++this.requestIdCounter}`;
    }
    setupEventSource() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        const eventsUrl = `${this.config.serverUrl}/events`;
        this.eventSource = new EventSource(eventsUrl);
        this.eventSource.onopen = () => {
            this.connectionState.connected = true;
            this.connectionState.lastHeartbeat = Date.now();
            this.connectionState.errorCount = 0;
            this.connectionState.reconnectAttempts = 0;
            info('SSE connection established');
            this.startHeartbeat();
        };
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleSSEMessage(data);
            }
            catch (err) {
                error('Failed to parse SSE message', err);
            }
        };
        this.eventSource.onerror = (event) => {
            this.connectionState.connected = false;
            this.connectionState.errorCount++;
            error('SSE connection error', event);
            this.scheduleReconnect();
        };
        this.eventSource.addEventListener('notification', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit('notification', data);
            }
            catch (err) {
                error('Failed to parse notification event', err);
            }
        });
        this.eventSource.addEventListener('error', (event) => {
            try {
                // ErrorEvent doesn't have data property, handle the error directly
                this.emit('error', { message: 'Connection error', event });
            }
            catch (err) {
                error('Failed to handle error event', err);
            }
        });
        this.eventSource.addEventListener('log', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit('log', data);
            }
            catch (err) {
                error('Failed to parse log event', err);
            }
        });
    }
    handleSSEMessage(data) {
        if (data.id && this.pendingRequests.has(data.id)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(data.id);
            clearTimeout(timeout);
            this.pendingRequests.delete(data.id);
            if (data.error) {
                reject(new Error(data.error.message));
            }
            else {
                resolve(data.result);
            }
        }
        else {
            // Handle unsolicited messages
            this.emit('message', data);
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.connectionState.reconnectAttempts < this.config.retries) {
            const delay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
            this.reconnectTimer = setTimeout(() => {
                this.connectionState.reconnectAttempts++;
                info(`Attempting to reconnect (${this.connectionState.reconnectAttempts}/${this.config.retries})`);
                this.setupEventSource();
            }, delay);
        }
        else {
            error('Max reconnection attempts reached');
        }
    }
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.heartbeatTimer = setInterval(() => {
            if (this.connectionState.connected) {
                this.connectionState.lastHeartbeat = Date.now();
                this.emit('heartbeat', { timestamp: Date.now() });
            }
        }, 30000); // 30 second heartbeat
    }
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    async connect() {
        try {
            // First check if server is available
            const response = await this.httpClient.get('/health');
            if (response.status !== 200) {
                throw new Error(`Health check failed with status: ${response.status}`);
            }
            // Setup SSE connection
            this.setupEventSource();
            // Wait for connection to be established
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('SSE connection timeout'));
                }, 10000);
                const checkConnection = () => {
                    if (this.connectionState.connected) {
                        clearTimeout(timeout);
                        resolve();
                    }
                    else {
                        setTimeout(checkConnection, 100);
                    }
                };
                checkConnection();
            });
        }
        catch (err) {
            error('Failed to connect to ClickUp MCP Server via SSE', err);
            throw err;
        }
    }
    async disconnect() {
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.connectionState.connected = false;
        info('Disconnected from ClickUp MCP Server');
    }
    async sendRequest(method, params) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        const request = {
            jsonrpc: '2.0',
            id: requestId,
            method,
            params
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Request timeout'));
            }, this.config.timeout);
            this.pendingRequests.set(requestId, {
                resolve: (result) => {
                    const operationResult = {
                        success: true,
                        data: result,
                        metadata: {
                            operation: method,
                            timestamp: Date.now(),
                            duration: Date.now() - startTime,
                            correlationId: requestId
                        }
                    };
                    this.updateMetrics(true, Date.now() - startTime);
                    resolve(operationResult);
                },
                reject: (err) => {
                    const operationResult = {
                        success: false,
                        error: err.message,
                        metadata: {
                            operation: method,
                            timestamp: Date.now(),
                            duration: Date.now() - startTime,
                            correlationId: requestId
                        }
                    };
                    this.updateMetrics(false, 0);
                    resolve(operationResult);
                },
                timeout
            });
            // Send request via HTTP POST
            this.httpClient.post('/request', request).catch((err) => {
                this.pendingRequests.delete(requestId);
                clearTimeout(timeout);
                const operationResult = {
                    success: false,
                    error: err.message,
                    metadata: {
                        operation: method,
                        timestamp: Date.now(),
                        duration: Date.now() - startTime,
                        correlationId: requestId
                    }
                };
                this.updateMetrics(false, 0);
                resolve(operationResult);
            });
        });
    }
    updateMetrics(success, responseTime) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        this.metrics.lastRequestTime = Date.now();
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
    }
    // Event handling methods
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    off(event, listener) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                }
                catch (err) {
                    error(`Error in event listener for ${event}`, err);
                }
            });
        }
    }
    // Task operations (same interface as HTTP client)
    async getTasks(listId, listName, options) {
        const params = { ...options };
        if (listId)
            params.listId = listId;
        if (listName)
            params.listName = listName;
        return this.sendRequest('get_tasks', params);
    }
    async getTask(taskId, taskName, options) {
        const params = { ...options };
        if (taskId)
            params.taskId = taskId;
        if (taskName)
            params.taskName = taskName;
        return this.sendRequest('get_task', params);
    }
    async createTask(name, listId, options) {
        const params = {
            name,
            listId,
            ...options
        };
        return this.sendRequest('create_task', params);
    }
    async updateTask(taskId, updates) {
        const params = {
            taskId,
            ...updates
        };
        return this.sendRequest('update_task', params);
    }
    async deleteTask(taskId) {
        return this.sendRequest('delete_task', { taskId });
    }
    async getLists(spaceId, folderId) {
        const params = {};
        if (spaceId)
            params.spaceId = spaceId;
        if (folderId)
            params.folderId = folderId;
        return this.sendRequest('get_lists', params);
    }
    async getFolders(spaceId) {
        const params = {};
        if (spaceId)
            params.spaceId = spaceId;
        return this.sendRequest('get_folders', params);
    }
    async getSpaces() {
        return this.sendRequest('get_spaces');
    }
    async getTags() {
        return this.sendRequest('get_tags');
    }
    async addTimeEntry(taskId, duration, description) {
        const params = {
            taskId,
            duration,
            description
        };
        return this.sendRequest('add_time_entry', params);
    }
    async getTimeEntries(taskId, startDate, endDate) {
        const params = {};
        if (taskId)
            params.taskId = taskId;
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        return this.sendRequest('get_time_entries', params);
    }
    async uploadAttachment(taskId, filePath, fileName) {
        const params = {
            taskId,
            filePath,
            fileName
        };
        return this.sendRequest('upload_attachment', params);
    }
    async addComment(taskId, commentText) {
        const params = {
            taskId,
            commentText
        };
        return this.sendRequest('add_comment', params);
    }
    async getComments(taskId) {
        return this.sendRequest('get_comments', { taskId });
    }
    async searchTasks(query, options) {
        const params = {
            query,
            ...options
        };
        return this.sendRequest('search_tasks', params);
    }
    async bulkUpdateTasks(taskIds, updates) {
        const params = {
            taskIds,
            updates
        };
        return this.sendRequest('bulk_update_tasks', params);
    }
    async moveTask(taskId, targetListId) {
        const params = {
            taskId,
            targetListId
        };
        return this.sendRequest('move_task', params);
    }
    async duplicateTask(taskId, targetListId) {
        const params = { taskId };
        if (targetListId)
            params.targetListId = targetListId;
        return this.sendRequest('duplicate_task', params);
    }
    getConnectionState() {
        return { ...this.connectionState };
    }
    getMetrics() {
        return { ...this.metrics };
    }
    isConnected() {
        return this.connectionState.connected;
    }
}
