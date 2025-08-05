/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Folder Service
 *
 * Handles all operations related to folders in ClickUp, including:
 * - Creating folders
 * - Retrieving folders
 * - Updating folders
 * - Deleting folders
 * - Finding folders by name
 */
import { BaseClickUpService, ErrorCode, ClickUpServiceError } from './base.js';
export class FolderService extends BaseClickUpService {
    /**
     * Creates an instance of FolderService
     * @param apiKey - ClickUp API key
     * @param teamId - ClickUp team ID
     * @param baseUrl - Optional custom API URL
     * @param workspaceService - Optional workspace service for lookups
     */
    constructor(apiKey, teamId, baseUrl, workspaceService) {
        super(apiKey, teamId, baseUrl);
        this.workspaceService = null;
        this.workspaceService = workspaceService || null;
    }
    /**
     * Helper method to handle errors consistently
     * @param error The error that occurred
     * @param message Optional custom error message
     * @returns A ClickUpServiceError
     */
    handleError(error, message) {
        if (error instanceof ClickUpServiceError) {
            return error;
        }
        return new ClickUpServiceError(message || `Folder service error: ${error.message}`, ErrorCode.UNKNOWN, error);
    }
    /**
     * Create a new folder in a space
     * @param spaceId The ID of the space to create the folder in
     * @param folderData The data for the new folder
     * @returns The created folder
     */
    async createFolder(spaceId, folderData) {
        try {
            this.logOperation('createFolder', { spaceId, ...folderData });
            const response = await this.client.post(`/space/${spaceId}/folder`, folderData);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error, `Failed to create folder in space ${spaceId}`);
        }
    }
    /**
     * Get a folder by its ID
     * @param folderId The ID of the folder to retrieve
     * @returns The folder details
     */
    async getFolder(folderId) {
        try {
            this.logOperation('getFolder', { folderId });
            const response = await this.client.get(`/folder/${folderId}`);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error, `Failed to get folder ${folderId}`);
        }
    }
    /**
     * Update an existing folder
     * @param folderId The ID of the folder to update
     * @param updateData The data to update on the folder
     * @returns The updated folder
     */
    async updateFolder(folderId, updateData) {
        try {
            this.logOperation('updateFolder', { folderId, ...updateData });
            const response = await this.client.put(`/folder/${folderId}`, updateData);
            return response.data;
        }
        catch (error) {
            throw this.handleError(error, `Failed to update folder ${folderId}`);
        }
    }
    /**
     * Delete a folder
     * @param folderId The ID of the folder to delete
     * @returns Success indicator
     */
    async deleteFolder(folderId) {
        try {
            this.logOperation('deleteFolder', { folderId });
            await this.client.delete(`/folder/${folderId}`);
            return {
                success: true
            };
        }
        catch (error) {
            throw this.handleError(error, `Failed to delete folder ${folderId}`);
        }
    }
    /**
     * Get all folders in a space
     * @param spaceId The ID of the space to get folders from
     * @returns Array of folders in the space
     */
    async getFoldersInSpace(spaceId) {
        this.logOperation('getFoldersInSpace', { spaceId });
        try {
            const response = await this.client.get(`/space/${spaceId}/folder`);
            return response.data.folders;
        }
        catch (error) {
            throw this.handleError(error, `Failed to get folders in space ${spaceId}`);
        }
    }
    /**
     * Find a folder by its name in a space
     * @param spaceId The ID of the space to search in
     * @param folderName The name of the folder to find
     * @returns The folder if found, otherwise null
     */
    async findFolderByName(spaceId, folderName) {
        this.logOperation('findFolderByName', { spaceId, folderName });
        try {
            const folders = await this.getFoldersInSpace(spaceId);
            const matchingFolder = folders.find(folder => folder.name.toLowerCase() === folderName.toLowerCase());
            return matchingFolder || null;
        }
        catch (error) {
            throw this.handleError(error, `Failed to find folder by name in space ${spaceId}`);
        }
    }
}
