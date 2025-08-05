/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * N8N Integration Example
 * 
 * This example demonstrates how to use the ClickUp MCP Client with N8N workflows.
 */

import { ClickUpMCPClient } from '../src/client/index.js';

// Configuration for the MCP client
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'n8n', // Use N8N transport
  timeout: 30000,
  retries: 3,
  enableLogging: true
};

// N8N-specific configuration
const n8nConfig = {
  triggerType: 'webhook',
  pollingInterval: 60000, // 1 minute
  webhookUrl: 'http://localhost:3001/webhook'
};

async function main() {
  const client = new ClickUpMCPClient(config, n8nConfig);

  try {
    // Connect to the MCP server
    await client.connect();
    console.log('✅ Connected to ClickUp MCP Server');

    // Register webhook handlers for different events
    client.registerWebhookHandler('task_created', (event) => {
      console.log('📝 New task created:', event.data);
      // Trigger N8N workflow for new tasks
      triggerN8NWorkflow('new_task_workflow', event.data);
    });

    client.registerWebhookHandler('task_updated', (event) => {
      console.log('🔄 Task updated:', event.data);
      // Trigger N8N workflow for task updates
      triggerN8NWorkflow('task_update_workflow', event.data);
    });

    client.registerWebhookHandler('time_entry_added', (event) => {
      console.log('⏱️ Time entry added:', event.data);
      // Trigger N8N workflow for time tracking
      triggerN8NWorkflow('time_tracking_workflow', event.data);
    });

    // Register workflow triggers
    client.registerWorkflowTrigger('task_update', (data) => {
      console.log('🚀 Triggering task update workflow:', data);
      // Send data to N8N workflow
      sendToN8N('task_update_webhook', data);
    });

    client.registerWorkflowTrigger('time_tracking', (data) => {
      console.log('🚀 Triggering time tracking workflow:', data);
      // Send data to N8N workflow
      sendToN8N('time_tracking_webhook', data);
    });

    // Example: Create a task from N8N data
    const n8nTaskData = {
      description: 'Task created from N8N workflow',
      assignees: ['user123'],
      due_date: '2024-12-31',
      priority: 2,
      tags: ['n8n', 'automation'],
      custom_fields: {
        source: 'n8n_workflow',
        workflow_id: 'wf_123',
        execution_id: 'exec_456'
      },
      workflow_id: 'wf_123',
      execution_id: 'exec_456'
    };

    const createResult = await client.createTaskFromN8N(
      'Sample Task from N8N',
      'list_123',
      n8nTaskData
    );

    if (createResult.success) {
      console.log('✅ Task created successfully:', createResult.data);
    } else {
      console.error('❌ Failed to create task:', createResult.error);
    }

    // Example: Poll for task updates
    const lastPollTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    const pollResult = await client.pollForTaskUpdates('list_123', lastPollTime);
    
    if (pollResult.success) {
      console.log('📊 Found updated tasks:', pollResult.data);
    }

    // Example: Bulk create tasks from N8N
    const bulkTasks = [
      {
        name: 'Task 1 from N8N',
        listId: 'list_123',
        data: { description: 'First task', priority: 1 }
      },
      {
        name: 'Task 2 from N8N',
        listId: 'list_123',
        data: { description: 'Second task', priority: 2 }
      }
    ];

    const bulkResult = await client.bulkCreateTasksFromN8N(bulkTasks);
    console.log('📦 Bulk create results:', bulkResult);

    // Get webhook URLs for N8N configuration
    console.log('🔗 Webhook URL:', client.getWebhookUrl());
    console.log('🔗 Task Update Trigger URL:', client.getTriggerUrl('task_update'));
    console.log('🔗 Health Check URL:', client.getHealthUrl());

    // Monitor connection state
    setInterval(() => {
      const state = client.getConnectionState();
      const metrics = client.getMetrics();
      
      console.log('📊 Connection State:', state);
      console.log('📈 Metrics:', metrics);
    }, 30000); // Every 30 seconds

    // Keep the client running
    console.log('🔄 Client is running. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await client.disconnect();
    process.exit(1);
  }
}

// Helper function to trigger N8N workflows
function triggerN8NWorkflow(workflowName, data) {
  // This would typically send a webhook to N8N
  console.log(`🎯 Triggering N8N workflow: ${workflowName}`);
  console.log('📤 Data:', data);
  
  // Example: Send HTTP request to N8N webhook
  // fetch(`http://localhost:5678/webhook/${workflowName}`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
}

// Helper function to send data to N8N
function sendToN8N(webhookName, data) {
  console.log(`📤 Sending to N8N webhook: ${webhookName}`);
  console.log('📦 Data:', data);
  
  // Example: Send HTTP request to N8N
  // fetch(`http://localhost:5678/webhook/${webhookName}`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
}

// Run the example
main().catch(console.error); 