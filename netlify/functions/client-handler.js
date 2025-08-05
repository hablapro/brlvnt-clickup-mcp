/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Netlify Function for Client Handler
 */

exports.handler = async (event, context) => {
  try {
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

    // Extract path from event
    const path = event.path.replace('/.netlify/functions/client-handler', '');
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : null;

    // Basic client request handling
    const response = {
      path: path,
      method: method,
      timestamp: new Date().toISOString(),
      message: 'Client request received',
      body: body
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in client handler:', error);
    
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