/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Netlify Function for SSE Server
 * Simple implementation for serverless environment
 */

// Simple session ID generator
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

exports.handler = async (event, context) => {
  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    // Get session ID from headers
    const sessionId = event.headers['mcp-session-id'] || event.headers['x-session-id'] || generateSessionId();
    
    // For SSE, we need to establish a connection and stream events
    // N8N expects a specific format for MCP SSE
    const initialEvent = {
      jsonrpc: "2.0",
      method: "connection/ready",
      params: {
        sessionId: sessionId,
        serverInfo: {
          name: "clickup-mcp-server",
          version: "0.8.5"
        }
      }
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, x-session-id',
        'X-Session-Id': sessionId
      },
      body: `data: ${JSON.stringify(initialEvent)}\n\n`
    };

  } catch (error) {
    console.error('Error in SSE server:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};