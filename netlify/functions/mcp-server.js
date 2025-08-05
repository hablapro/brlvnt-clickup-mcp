/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Netlify Function for ClickUp MCP Server
 * 
 * Handles MCP server requests in a serverless environment.
 */

// Import using dynamic import for ES modules
let configureServer, server, StreamableHTTPServerTransport;

// Configure the server once
let isConfigured = false;
let transports = {};

async function configureServerOnce() {
  if (!isConfigured) {
    // Dynamic import for ES modules
    if (!configureServer) {
      const serverModule = await import('../../build/server.js');
      configureServer = serverModule.configureServer;
      server = serverModule.server;
      
      const sdkModule = await import('@modelcontextprotocol/sdk/server/http.js');
      StreamableHTTPServerTransport = sdkModule.StreamableHTTPServerTransport;
    }
    
    configureServer();
    isConfigured = true;
  }
}

exports.handler = async (event, context) => {
  try {
    await configureServerOnce();

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    const sessionId = event.headers['mcp-session-id'] || event.headers['mcp-session-id'];
    const body = event.body ? JSON.parse(event.body) : null;

    let transport;

    // Create or get existing transport
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && body && body.method === 'initialize') {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        onsessioninitialized: (sessionId) => {
          transports[sessionId] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      await server.connect(transport);
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        })
      };
    }

    // Handle the request
    const response = await transport.handleRequest(event, {
      statusCode: 200,
      headers: {},
      body: ''
    }, body);

    return {
      statusCode: response.statusCode || 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
        ...response.headers
      },
      body: response.body || JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      })
    };
  }
}; 