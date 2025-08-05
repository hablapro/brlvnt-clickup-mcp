/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Attachments Module
 *
 * Handles file attachment operations for ClickUp tasks, supporting three methods:
 * - Uploading file attachments from base64/buffer data
 * - Uploading file attachments from a URL (web URLs like http/https)
 * - Uploading file attachments from local file paths (absolute paths)
 *
 * REFACTORED: Now uses composition instead of inheritance.
 * Only depends on TaskServiceCore for base functionality.
 */
/**
 * Attachment functionality for the TaskService
 *
 * This service handles all file attachment operations for ClickUp tasks.
 * It uses composition to access core functionality instead of inheritance.
 */
export class TaskServiceAttachments {
    constructor(core) {
        this.core = core;
    }
    /**
     * Upload a file attachment to a ClickUp task
     * @param taskId The ID of the task to attach the file to
     * @param fileData The file data as a Buffer
     * @param fileName The name of the file
     * @returns Promise resolving to the attachment response from ClickUp
     */
    async uploadTaskAttachment(taskId, fileData, fileName) {
        this.core.logOperation('uploadTaskAttachment', { taskId, fileName, fileSize: fileData.length });
        try {
            return await this.core.makeRequest(async () => {
                // Create FormData for multipart/form-data upload
                const FormData = (await import('form-data')).default;
                const formData = new FormData();
                // Add the file to the form data
                formData.append('attachment', fileData, {
                    filename: fileName,
                    contentType: 'application/octet-stream' // Let ClickUp determine the content type
                });
                // Use the raw axios client for this request since we need to handle FormData
                const response = await this.core.client.post(`/task/${taskId}/attachment`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': this.core.apiKey
                    }
                });
                return response.data;
            });
        }
        catch (error) {
            throw this.core.handleError(error, `Failed to upload attachment to task ${taskId}`);
        }
    }
    /**
     * Upload a file attachment to a ClickUp task from a URL
     * @param taskId The ID of the task to attach the file to
     * @param fileUrl The URL of the file to download and attach
     * @param fileName Optional file name (if not provided, it will be extracted from the URL)
     * @param authHeader Optional authorization header for the URL
     * @returns Promise resolving to the attachment response from ClickUp
     */
    async uploadTaskAttachmentFromUrl(taskId, fileUrl, fileName, authHeader) {
        this.core.logOperation('uploadTaskAttachmentFromUrl', { taskId, fileUrl, fileName });
        try {
            return await this.core.makeRequest(async () => {
                // Import required modules
                const axios = (await import('axios')).default;
                const FormData = (await import('form-data')).default;
                // Download the file from the URL
                const headers = {};
                if (authHeader) {
                    headers['Authorization'] = authHeader;
                }
                const response = await axios.get(fileUrl, {
                    responseType: 'arraybuffer',
                    headers
                });
                // Extract filename from URL if not provided
                const actualFileName = fileName || fileUrl.split('/').pop() || 'downloaded-file';
                // Create FormData for multipart/form-data upload
                const formData = new FormData();
                // Add the file to the form data
                formData.append('attachment', Buffer.from(response.data), {
                    filename: actualFileName,
                    contentType: 'application/octet-stream'
                });
                // Upload the file to ClickUp
                const uploadResponse = await this.core.client.post(`/task/${taskId}/attachment`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': this.core.apiKey
                    }
                });
                return uploadResponse.data;
            });
        }
        catch (error) {
            throw this.core.handleError(error, `Failed to upload attachment from URL to task ${taskId}`);
        }
    }
}
