# ClickUp MCP Client - N8N Integration Guide

This guide provides comprehensive instructions for integrating the ClickUp MCP Client with N8N workflows for automated task management and workflow automation.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Transport Options](#transport-options)
- [N8N Integration Methods](#n8n-integration-methods)
- [Webhook Integration](#webhook-integration)
- [SSE Integration](#sse-integration)
- [HTTP Integration](#http-integration)
- [Workflow Examples](#workflow-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The ClickUp MCP Client provides multiple integration methods for N8N:

- **HTTP Client**: Simple request/response communication
- **SSE Client**: Real-time event streaming
- **N8N Client**: Specialized client with webhook handling and workflow triggers

## Installation

### Prerequisites

- Node.js v18.0.0 or higher
- ClickUp MCP Server running
- N8N instance (local or cloud)

### Install the Client

```bash
npm install @taazkareem/clickup-mcp-client
```

### Import the Client

```javascript
import { ClickUpMCPClient } from '@taazkareem/clickup-mcp-client';
```

## Quick Start

### 1. Basic Setup

```javascript
import { ClickUpMCPClient } from '@taazkareem/clickup-mcp-client';

const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'n8n',
  timeout: 30000,
  retries: 3,
  enableLogging: true
};

const n8nConfig = {
  triggerType: 'webhook',
  pollingInterval: 60000
};

const client = new ClickUpMCPClient(config, n8nConfig);
```

### 2. Connect and Use

```javascript
async function main() {
  await client.connect();
  
  // Create a task from N8N data
  const result = await client.createTaskFromN8N(
    'Task from N8N',
    'list_123',
    {
      description: 'Created via N8N workflow',
      priority: 2,
      tags: ['n8n', 'automation']
    }
  );
  
  console.log('Task created:', result);
}
```

## Transport Options

### HTTP Transport

Best for simple integrations and one-off operations.

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http'
};

const client = new ClickUpMCPClient(config);
```

### SSE Transport

Best for real-time updates and event-driven workflows.

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'sse'
};

const client = new ClickUpMCPClient(config);

// Listen for events
client.on('notification', (data) => {
  console.log('Received notification:', data);
});
```

### N8N Transport

Best for complex N8N integrations with webhook handling.

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'n8n'
};

const n8nConfig = {
  triggerType: 'webhook',
  pollingInterval: 60000
};

const client = new ClickUpMCPClient(config, n8nConfig);
```

## N8N Integration Methods

### 1. Webhook Integration

The client provides webhook endpoints that N8N can use to trigger workflows.

```javascript
// Get webhook URLs
const webhookUrl = client.getWebhookUrl();
const triggerUrl = client.getTriggerUrl('task_update');
const healthUrl = client.getHealthUrl();

console.log('Webhook URL:', webhookUrl);
console.log('Trigger URL:', triggerUrl);
console.log('Health URL:', healthUrl);
```

### 2. Event-Driven Integration

Register handlers for ClickUp events that trigger N8N workflows.

```javascript
// Register webhook handlers
client.registerWebhookHandler('task_created', (event) => {
  console.log('New task created:', event.data);
  // Trigger N8N workflow here
});

client.registerWebhookHandler('task_updated', (event) => {
  console.log('Task updated:', event.data);
  // Trigger N8N workflow here
});

// Register workflow triggers
client.registerWorkflowTrigger('task_update', (data) => {
  // Send data to N8N workflow
  sendToN8N('task_update_webhook', data);
});
```

### 3. Polling Integration

Poll for updates at regular intervals.

```javascript
// Poll for task updates
const lastPollTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const result = await client.pollForTaskUpdates('list_123', lastPollTime);

if (result.success) {
  console.log('Updated tasks:', result.data);
}
```

## Webhook Integration

### Setting Up Webhooks in N8N

1. **Create a Webhook Node in N8N**
   - Add a "Webhook" trigger node
   - Set the webhook URL to your client's webhook endpoint
   - Configure the HTTP method (POST)

2. **Configure the Webhook**
   ```json
   {
     "webhookUrl": "http://localhost:3001/webhook",
     "httpMethod": "POST",
     "responseMode": "responseNode"
   }
   ```

3. **Handle Webhook Data**
   ```javascript
   // In your N8N workflow
   const webhookData = $input.all()[0].json;
   
   if (webhookData.type === 'task_created') {
     // Handle new task
     await createSlackNotification(webhookData.data);
   } else if (webhookData.type === 'task_updated') {
     // Handle task update
     await updateDatabase(webhookData.data);
   }
   ```

### Webhook Event Types

The client sends the following event types:

- `task_created`: New task created
- `task_updated`: Task updated
- `task_deleted`: Task deleted
- `time_entry_added`: Time entry added
- `time_entry_updated`: Time entry updated
- `comment_added`: Comment added
- `attachment_uploaded`: Attachment uploaded
- `status_changed`: Task status changed

## SSE Integration

### Real-Time Event Streaming

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'sse'
};

const client = new ClickUpMCPClient(config);

// Listen for real-time events
client.on('notification', (data) => {
  console.log('Real-time notification:', data);
});

client.on('error', (data) => {
  console.error('Error event:', data);
});

client.on('log', (data) => {
  console.log('Log event:', data);
});

client.on('heartbeat', (data) => {
  console.log('Heartbeat:', data);
});
```

### SSE Event Types

- `notification`: General notifications
- `error`: Error events
- `log`: Log messages
- `heartbeat`: Connection heartbeat
- `message`: Unsolicited messages

## HTTP Integration

### Simple Request/Response

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http'
};

const client = new ClickUpMCPClient(config);

// Basic operations
const tasks = await client.getTasks('list_123');
const task = await client.getTask('task_456');
const result = await client.createTask('New Task', 'list_123');
```

## Workflow Examples

### Example 1: Task Creation Workflow

```javascript
// N8N workflow that creates tasks from form submissions
async function handleFormSubmission(formData) {
  const client = new ClickUpMCPClient(config, n8nConfig);
  await client.connect();
  
  const result = await client.createTaskFromN8N(
    formData.taskName,
    formData.listId,
    {
      description: formData.description,
      assignees: formData.assignees,
      due_date: formData.dueDate,
      priority: formData.priority,
      tags: formData.tags,
      workflow_id: 'form_submission_workflow',
      execution_id: formData.executionId
    }
  );
  
  return result;
}
```

### Example 2: Task Update Workflow

```javascript
// N8N workflow that updates tasks based on external data
async function updateTaskFromExternalSystem(externalData) {
  const client = new ClickUpMCPClient(config, n8nConfig);
  await client.connect();
  
  const result = await client.updateTaskFromN8N(
    externalData.taskId,
    {
      status: externalData.status,
      description: externalData.description,
      assignees: externalData.assignees,
      workflow_id: 'external_sync_workflow',
      execution_id: externalData.executionId
    }
  );
  
  return result;
}
```

### Example 3: Time Tracking Workflow

```javascript
// N8N workflow that adds time entries
async function addTimeEntry(timeData) {
  const client = new ClickUpMCPClient(config, n8nConfig);
  await client.connect();
  
  const result = await client.addTimeEntryFromN8N(
    timeData.taskId,
    {
      duration: timeData.duration,
      description: timeData.description,
      workflow_id: 'time_tracking_workflow',
      execution_id: timeData.executionId
    }
  );
  
  return result;
}
```

### Example 4: Bulk Operations Workflow

```javascript
// N8N workflow that performs bulk operations
async function bulkCreateTasks(tasksData) {
  const client = new ClickUpMCPClient(config, n8nConfig);
  await client.connect();
  
  const tasks = tasksData.map(task => ({
    name: task.name,
    listId: task.listId,
    data: {
      description: task.description,
      assignees: task.assignees,
      priority: task.priority,
      workflow_id: 'bulk_creation_workflow'
    }
  }));
  
  const results = await client.bulkCreateTasksFromN8N(tasks);
  return results;
}
```

## Best Practices

### 1. Error Handling

```javascript
try {
  const result = await client.createTask('Task Name', 'list_123');
  if (result.success) {
    console.log('Task created:', result.data);
  } else {
    console.error('Failed to create task:', result.error);
  }
} catch (error) {
  console.error('Client error:', error);
}
```

### 2. Connection Management

```javascript
// Always disconnect when done
try {
  await client.connect();
  // ... your operations
} finally {
  await client.disconnect();
}
```

### 3. Retry Logic

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http',
  retries: 3,
  timeout: 30000
};
```

### 4. Logging

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http',
  enableLogging: true
};
```

### 5. Health Monitoring

```javascript
// Monitor connection health
setInterval(async () => {
  const isHealthy = await client.healthCheck();
  if (!isHealthy) {
    console.warn('Client health check failed');
  }
}, 30000);
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure the ClickUp MCP Server is running
   - Check the server URL and port
   - Verify network connectivity

2. **Webhook Not Receiving Events**
   - Check webhook URL configuration
   - Verify N8N webhook node settings
   - Check firewall settings

3. **SSE Connection Issues**
   - Ensure SSE transport is enabled on the server
   - Check for proxy/firewall issues
   - Verify EventSource support

4. **Authentication Errors**
   - Verify ClickUp API key and team ID
   - Check API key permissions
   - Ensure team ID is correct

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http',
  enableLogging: true
};
```

### Health Checks

```javascript
// Check connection state
const state = client.getConnectionState();
console.log('Connection state:', state);

// Check metrics
const metrics = client.getMetrics();
console.log('Client metrics:', metrics);

// Test connectivity
const pingTime = await client.ping();
console.log('Ping time:', pingTime);
```

### Support

For additional support:

- Check the [ClickUp MCP Server documentation](../README.md)
- Review the [SSE Transport documentation](sse-transport.md)
- Open an issue on the GitHub repository
- Check the troubleshooting section in the main README

## Next Steps

1. **Explore Examples**: Review the example files in the `examples/` directory
2. **Test Integration**: Use the provided examples to test your N8N integration
3. **Customize Workflows**: Adapt the examples to your specific use cases
4. **Monitor Performance**: Use the built-in metrics and health checks
5. **Scale Up**: Implement more complex workflows as needed

The ClickUp MCP Client provides a powerful foundation for integrating ClickUp with N8N workflows. With multiple transport options and comprehensive event handling, you can build sophisticated automation workflows that respond to ClickUp events in real-time. 