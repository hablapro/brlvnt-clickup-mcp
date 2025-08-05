/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Time tracking service for ClickUp tasks
 *
 * This service provides methods to manage time tracking for ClickUp tasks:
 * - Get time entries for a task
 * - Start time tracking on a task
 * - Stop time tracking on a task
 * - Add a manual time entry
 * - Delete a time entry
 */
import { BaseClickUpService, ErrorCode, ClickUpServiceError } from './base.js';
/**
 * Time tracking service for ClickUp
 */
export class TimeTrackingService extends BaseClickUpService {
    /**
     * Get all time entries for a task
     * @param taskId ID of the task
     * @param startDate Optional start date filter (Unix timestamp in milliseconds)
     * @param endDate Optional end date filter (Unix timestamp in milliseconds)
     * @returns List of time entries
     */
    async getTimeEntries(taskId, startDate, endDate) {
        try {
            this.logOperation('getTimeEntries', { taskId, startDate, endDate });
            // Build query parameters
            let query = {};
            if (startDate)
                query.start_date = startDate;
            if (endDate)
                query.end_date = endDate;
            const path = `/task/${taskId}/time`;
            this.traceRequest('GET', path, query);
            const response = await this.makeRequest(() => this.client.get(path, {
                params: query
            }));
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to get time entries: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
    /**
     * Start time tracking on a task
     * @param data Task ID and optional parameters
     * @returns The created time entry
     */
    async startTimeTracking(data) {
        try {
            this.logOperation('startTimeTracking', { taskId: data.tid });
            const path = `/team/${this.teamId}/time_entries/start`;
            this.traceRequest('POST', path, data);
            const response = await this.makeRequest(() => this.client.post(path, data));
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to start time tracking: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
    /**
     * Stop the currently running time tracker
     * @param data Optional parameters for the stopped time entry
     * @returns The completed time entry
     */
    async stopTimeTracking(data) {
        try {
            this.logOperation('stopTimeTracking', {});
            const path = `/team/${this.teamId}/time_entries/stop`;
            this.traceRequest('POST', path, data || {});
            const response = await this.makeRequest(() => this.client.post(path, data || {}));
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to stop time tracking: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
    /**
     * Add a manual time entry to a task
     * @param data Time entry data including task ID, start time, and duration
     * @returns The created time entry
     */
    async addTimeEntry(data) {
        try {
            this.logOperation('addTimeEntry', { taskId: data.tid, duration: data.duration });
            const path = `/team/${this.teamId}/time_entries`;
            this.traceRequest('POST', path, data);
            const response = await this.makeRequest(() => this.client.post(path, data));
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to add time entry: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
    /**
     * Delete a time entry
     * @param timeEntryId ID of the time entry to delete
     * @returns Success response
     */
    async deleteTimeEntry(timeEntryId) {
        try {
            this.logOperation('deleteTimeEntry', { timeEntryId });
            const path = `/team/${this.teamId}/time_entries/${timeEntryId}`;
            this.traceRequest('DELETE', path);
            await this.makeRequest(() => this.client.delete(path));
            return {
                success: true,
                data: true
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to delete time entry: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
    /**
     * Get currently running time entry for the user
     * @returns The currently running time entry or null if no timer is running
     */
    async getCurrentTimeEntry() {
        try {
            this.logOperation('getCurrentTimeEntry', {});
            const path = `/team/${this.teamId}/time_entries/current`;
            this.traceRequest('GET', path);
            const response = await this.makeRequest(() => this.client.get(path));
            return {
                success: true,
                data: response.data.data
            };
        }
        catch (error) {
            if (error instanceof ClickUpServiceError) {
                return {
                    success: false,
                    error: {
                        message: error.message,
                        code: error.code,
                        details: error.data
                    }
                };
            }
            return {
                success: false,
                error: {
                    message: `Failed to get current time entry: ${error.message}`,
                    code: ErrorCode.UNKNOWN
                }
            };
        }
    }
}
