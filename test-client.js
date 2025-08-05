#!/usr/bin/env node

/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Client Test Script
 * 
 * Simple test script to verify the MCP client functionality.
 */

import { ClickUpMCPClient } from './src/client/index.js';

async function testClient() {
  console.log('🧪 Testing ClickUp MCP Client...\n');

  // Test configuration
  const config = {
    serverUrl: 'http://localhost:3000',
    transport: 'http',
    timeout: 10000,
    retries: 2,
    enableLogging: true
  };

  const client = new ClickUpMCPClient(config);

  try {
    console.log('📡 Connecting to ClickUp MCP Server...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Test basic operations
    console.log('📋 Testing basic operations...');
    
    // Get spaces
    console.log('  - Getting spaces...');
    const spacesResult = await client.getSpaces();
    if (spacesResult.success) {
      console.log(`    ✅ Found ${spacesResult.data.length} spaces`);
    } else {
      console.log(`    ❌ Failed to get spaces: ${spacesResult.error}`);
    }

    // Test connection state
    console.log('  - Checking connection state...');
    const state = client.getConnectionState();
    console.log(`    ✅ Connection state: ${JSON.stringify(state, null, 2)}`);

    // Test metrics
    console.log('  - Getting metrics...');
    const metrics = client.getMetrics();
    console.log(`    ✅ Metrics: ${JSON.stringify(metrics, null, 2)}`);

    // Test ping
    console.log('  - Testing ping...');
    try {
      const pingTime = await client.ping();
      console.log(`    ✅ Ping successful: ${pingTime}ms`);
    } catch (error) {
      console.log(`    ❌ Ping failed: ${error.message}`);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('\n🔌 Disconnecting...');
    await client.disconnect();
    console.log('👋 Disconnected successfully!');
  }
}

// Run the test
testClient().catch(console.error); 