/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Netlify Function for SSE Server
 */

// Dynamic import for ES modules
let createSSEServer;

exports.handler = async (event, context) => {
  // Import ES module dynamically
  if (!createSSEServer) {
    const sseModule = await import('../../build/sse_server.js');
    createSSEServer = sseModule.createSSEServer;
  }
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

    // For SSE, we need to establish a connection and stream events
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id'
      },
      body: 'data: {"type":"connected","timestamp":' + Date.now() + '}\n\n'
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