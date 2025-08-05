/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Workspace Tools
 *
 * This module defines workspace-related tools like retrieving workspace hierarchy.
 * It handles the workspace tool definitions and the implementation of their handlers.
 */
import { Logger } from '../logger.js';
import { sponsorService } from '../utils/sponsor-service.js';
import { clickUpServices } from '../services/shared.js';
// Create a logger for workspace tools
const logger = new Logger('WorkspaceTool');
// Use the workspace service from the shared services
const { workspace: workspaceService } = clickUpServices;
/**
 * Tool definition for retrieving the complete workspace hierarchy
 */
export const workspaceHierarchyTool = {
    name: 'get_workspace_hierarchy',
    description: `Gets complete workspace hierarchy (spaces, folders, lists). No parameters needed. Returns tree structure with names and IDs for navigation.`,
    inputSchema: {
        type: 'object',
        properties: {}
    }
};
/**
 * Handler for the get_workspace_hierarchy tool
 */
export async function handleGetWorkspaceHierarchy() {
    try {
        // Get workspace hierarchy from the workspace service
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        // Generate tree representation
        const treeOutput = formatTreeOutput(hierarchy);
        // Use sponsor service to create the response with optional sponsor message
        return sponsorService.createResponse({ hierarchy: treeOutput }, true);
    }
    catch (error) {
        return sponsorService.createErrorResponse(`Error getting workspace hierarchy: ${error.message}`);
    }
}
/**
 * Format the hierarchy as a tree string
 */
function formatTreeOutput(hierarchy) {
    // Helper function to format a node and its children as a tree
    const formatNodeAsTree = (node, level = 0, isLast = true, parentPrefix = '') => {
        const lines = [];
        // Calculate the current line's prefix
        const currentPrefix = level === 0 ? '' : parentPrefix + (isLast ? '└── ' : '├── ');
        // Format current node with descriptive ID type
        const idType = 'type' in node ? `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} ID` : 'Workspace ID';
        lines.push(`${currentPrefix}${node.name} (${idType}: ${node.id})`);
        // Calculate the prefix for children
        const childPrefix = level === 0 ? '' : parentPrefix + (isLast ? '    ' : '│   ');
        // Process children
        const children = node.children || [];
        children.forEach((child, index) => {
            const childLines = formatNodeAsTree(child, level + 1, index === children.length - 1, childPrefix);
            lines.push(...childLines);
        });
        return lines;
    };
    // Generate tree representation
    const treeLines = formatNodeAsTree(hierarchy.root);
    // Return plain text instead of adding code block markers
    return treeLines.join('\n');
}
