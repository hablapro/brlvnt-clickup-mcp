/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Common type definitions for ClickUp API entities
 */
// Helper function to validate and convert priority values
export function toTaskPriority(value) {
    if (value === null)
        return null;
    if (value === undefined)
        return undefined;
    if (value === "null")
        return null;
    // Convert string to number if needed
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    // Validate it's a valid priority number
    if (typeof numValue === 'number' && !isNaN(numValue) && [1, 2, 3, 4].includes(numValue)) {
        return numValue;
    }
    return undefined;
}
/**
 * ClickUp parent container types
 */
export var ClickUpParentType;
(function (ClickUpParentType) {
    ClickUpParentType[ClickUpParentType["Space"] = 4] = "Space";
    ClickUpParentType[ClickUpParentType["Folder"] = 5] = "Folder";
    ClickUpParentType[ClickUpParentType["List"] = 6] = "List";
    ClickUpParentType[ClickUpParentType["All"] = 7] = "All";
    ClickUpParentType[ClickUpParentType["Workspace"] = 12] = "Workspace";
})(ClickUpParentType || (ClickUpParentType = {}));
