#!/usr/bin/env node

/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Client
 * 
 * This client provides integration capabilities for N8N and other workflow automation
 * platforms to interact with the ClickUp MCP Server. It supports both HTTP and SSE
 * transport mechanisms for flexible integration options.
 * 
 * Key Features:
 * - HTTP client for direct API calls
 * - SSE client for real-time communication
 * - N8N integration helpers
 * - Type-safe ClickUp operations
 * - Error handling and retry logic
 * - Connection management
 */

import { ClickUpMCPClient } from './client.js';
import { ClickUpMCPSSEClient } from './sse-client.js';
import { ClickUpMCPHTTPClient } from './http-client.js';
import { ClickUpMCPN8NClient } from './n8n-client.js';
import { info, error, debug } from '../logger.js';

export {
  ClickUpMCPClient,
  ClickUpMCPSSEClient,
  ClickUpMCPHTTPClient,
  ClickUpMCPN8NClient
};

// CLI interface for standalone usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new ClickUpMCPClient();
  
  process.on('SIGINT', async () => {
    info('Shutting down ClickUp MCP Client...');
    await client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    info('Shutting down ClickUp MCP Client...');
    await client.disconnect();
    process.exit(0);
  });
} 