/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Netlify Function for Health Check
 */

exports.handler = async (event, context) => {
  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.8.5',
      environment: process.env.NODE_ENV || 'production',
      services: {
        mcp: 'operational',
        sse: 'operational'
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(healthStatus)
    };

  } catch (error) {
    console.error('Error in health check:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: 'Internal server error'
      })
    };
  }
};