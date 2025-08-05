/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service
 *
 * Complete task service combining all task-related functionality
 *
 * REFACTORED: Now uses composition instead of linear inheritance.
 * Extends TaskServiceCore and composes other services as properties.
 */
import { TaskServiceCore } from './task-core.js';
import { TaskServiceSearch } from './task-search.js';
import { TaskServiceAttachments } from './task-attachments.js';
import { TaskServiceComments } from './task-comments.js';
import { TaskServiceTags } from './task-tags.js';
import { TaskServiceCustomFields } from './task-custom-fields.js';
/**
 * Complete TaskService combining all task-related functionality
 *
 * This service uses composition to provide access to all task operations
 * while maintaining clean separation of concerns and eliminating artificial
 * dependencies between service modules.
 */
export class TaskService extends TaskServiceCore {
    constructor(apiKey, teamId, baseUrl, workspaceService) {
        super(apiKey, teamId, baseUrl, workspaceService);
        this.logOperation('constructor', { initialized: true });
        // Initialize composed services with core as dependency
        this.search = new TaskServiceSearch(this);
        this.attachments = new TaskServiceAttachments(this);
        this.comments = new TaskServiceComments(this);
        this.tags = new TaskServiceTags(this);
        this.customFields = new TaskServiceCustomFields(this);
    }
    // ===== DELEGATED SEARCH METHODS =====
    async findTaskByName(listId, taskName) {
        return this.search.findTaskByName(listId, taskName);
    }
    async getWorkspaceTasks(filters = {}) {
        return this.search.getWorkspaceTasks(filters);
    }
    async getTaskSummaries(filters = {}) {
        return this.search.getTaskSummaries(filters);
    }
    async getListViews(listId) {
        return this.search.getListViews(listId);
    }
    async getTasksFromView(viewId, filters = {}) {
        return this.search.getTasksFromView(viewId, filters);
    }
    async getTaskDetails(filters = {}) {
        return this.search.getTaskDetails(filters);
    }
    async updateTaskByName(listId, taskName, updateData) {
        return this.search.updateTaskByName(listId, taskName, updateData);
    }
    async findTaskByNameGlobally(taskName) {
        return this.search.findTaskByNameGlobally(taskName);
    }
    async findTasks(params) {
        return this.search.findTasks(params);
    }
    // ===== DELEGATED ATTACHMENT METHODS =====
    async uploadTaskAttachment(taskId, fileData, fileName) {
        return this.attachments.uploadTaskAttachment(taskId, fileData, fileName);
    }
    async uploadTaskAttachmentFromUrl(taskId, fileUrl, fileName, authHeader) {
        return this.attachments.uploadTaskAttachmentFromUrl(taskId, fileUrl, fileName, authHeader);
    }
    // ===== DELEGATED COMMENT METHODS =====
    async getTaskComments(taskId, start, startId) {
        return this.comments.getTaskComments(taskId, start, startId);
    }
    async createTaskComment(taskId, commentText, notifyAll, assignee) {
        return this.comments.createTaskComment(taskId, commentText, notifyAll, assignee);
    }
    // ===== DELEGATED TAG METHODS =====
    async addTagToTask(taskId, tagName) {
        return this.tags.addTagToTask(taskId, tagName);
    }
    async removeTagFromTask(taskId, tagName) {
        return this.tags.removeTagFromTask(taskId, tagName);
    }
    async getTaskTags(taskId) {
        return this.tags.getTaskTags(taskId);
    }
    async updateTaskTags(taskId, tagNames) {
        return this.tags.updateTaskTags(taskId, tagNames);
    }
    // ===== DELEGATED CUSTOM FIELD METHODS =====
    async setCustomFieldValue(taskId, fieldId, value) {
        return this.customFields.setCustomFieldValue(taskId, fieldId, value);
    }
    async setCustomFieldValues(taskId, customFields) {
        return this.customFields.setCustomFieldValues(taskId, customFields);
    }
    async getCustomFieldValues(taskId) {
        return this.customFields.getCustomFieldValues(taskId);
    }
    async getCustomFieldValue(taskId, fieldId) {
        return this.customFields.getCustomFieldValue(taskId, fieldId);
    }
}
