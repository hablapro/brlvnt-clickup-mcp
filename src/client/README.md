# ClickUp MCP Client

A comprehensive client library for integrating with the ClickUp MCP Server, designed specifically for N8N workflows and automation.

## Features

- **Multiple Transport Options**: HTTP, SSE, and N8N-specific transports
- **Real-time Event Streaming**: Server-Sent Events (SSE) for live updates
- **Webhook Integration**: Built-in webhook handling for N8N workflows
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error handling and retry logic
- **Connection Management**: Automatic connection management and health monitoring
- **Metrics & Monitoring**: Built-in metrics collection and health checks

## Quick Start

### Installation

```bash
npm install @taazkareem/clickup-mcp-client
```

### Basic Usage

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

// Connect and use
await client.connect();
const result = await client.createTask('My Task', 'list_123');
console.log('Task created:', result);
```

## Transport Options

### HTTP Transport
Simple request/response communication for basic integrations.

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http'
};

const client = new ClickUpMCPClient(config);
```

### SSE Transport
Real-time event streaming for live updates.

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'sse'
};

const client = new ClickUpMCPClient(config);

// Listen for events
client.on('notification', (data) => {
  console.log('Real-time update:', data);
});
```

### N8N Transport
Specialized transport with webhook handling and workflow triggers.

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

## API Reference

### Core Methods

#### Connection Management
- `connect()`: Connect to the MCP server
- `disconnect()`: Disconnect from the server
- `isConnected()`: Check connection status
- `healthCheck()`: Perform health check
- `ping()`: Test connectivity

#### Task Operations
- `getTasks(listId?, listName?, options?)`: Get tasks from a list
- `getTask(taskId?, taskName?, options?)`: Get a single task
- `createTask(name, listId, options?)`: Create a new task
- `updateTask(taskId, updates)`: Update an existing task
- `deleteTask(taskId)`: Delete a task
- `searchTasks(query, options?)`: Search for tasks
- `bulkUpdateTasks(taskIds, updates)`: Update multiple tasks
- `moveTask(taskId, targetListId)`: Move a task to another list
- `duplicateTask(taskId, targetListId?)`: Duplicate a task

#### List & Folder Operations
- `getLists(spaceId?, folderId?)`: Get lists
- `getFolders(spaceId?)`: Get folders
- `getSpaces()`: Get spaces
- `getTags()`: Get tags

#### Time Tracking
- `addTimeEntry(taskId, duration, description?)`: Add time entry
- `getTimeEntries(taskId?, startDate?, endDate?)`: Get time entries

#### Attachments & Comments
- `uploadAttachment(taskId, filePath, fileName?)`: Upload attachment
- `addComment(taskId, commentText)`: Add comment
- `getComments(taskId)`: Get comments

### N8N-Specific Methods

#### Webhook & Event Handling
- `registerWebhookHandler(eventType, handler)`: Register webhook handler
- `registerWorkflowTrigger(triggerId, handler)`: Register workflow trigger
- `unregisterWorkflowTrigger(triggerId)`: Unregister workflow trigger

#### N8N Helper Methods
- `createTaskFromN8N(name, listId, n8nData)`: Create task with N8N metadata
- `updateTaskFromN8N(taskId, n8nData)`: Update task with N8N metadata
- `addTimeEntryFromN8N(taskId, n8nData)`: Add time entry with N8N metadata
- `addCommentFromN8N(taskId, n8nData)`: Add comment with N8N metadata
- `bulkCreateTasksFromN8N(tasks)`: Bulk create tasks with N8N metadata
- `bulkUpdateTasksFromN8N(updates)`: Bulk update tasks with N8N metadata

#### Polling Methods
- `pollForTaskUpdates(listId?, lastPollTime?)`: Poll for task updates
- `pollForNewTasks(listId?, lastPollTime?)`: Poll for new tasks

#### URL Getters
- `getWebhookUrl()`: Get webhook endpoint URL
- `getTriggerUrl(triggerId)`: Get trigger endpoint URL
- `getHealthUrl()`: Get health check URL

### SSE Event Methods
- `on(event, listener)`: Register event listener
- `off(event, listener)`: Unregister event listener

### Status & Monitoring
- `getConnectionState()`: Get connection state
- `getMetrics()`: Get client metrics
- `getTransport()`: Get current transport type

## Configuration

### Client Configuration

```javascript
const config = {
  serverUrl: 'http://localhost:3000',    // MCP server URL
  transport: 'http',                     // Transport type: 'http', 'sse', 'n8n'
  timeout: 30000,                        // Request timeout in ms
  retries: 3,                           // Number of retry attempts
  enableLogging: true                   // Enable debug logging
};
```

### N8N Configuration

```javascript
const n8nConfig = {
  triggerType: 'webhook',               // Trigger type: 'webhook', 'polling', 'manual'
  pollingInterval: 60000,               // Polling interval in ms
  webhookUrl: 'http://localhost:3001/webhook'  // Custom webhook URL
};
```

## Examples

### Basic Task Management

```javascript
const client = new ClickUpMCPClient({ transport: 'http' });
await client.connect();

// Create a task
const result = await client.createTask('My Task', 'list_123', {
  description: 'Task description',
  priority: 2,
  tags: ['important', 'urgent']
});

// Update the task
await client.updateTask(result.data.id, {
  status: 'in progress',
  assignees: ['user123']
});
```

### N8N Integration

```javascript
const client = new ClickUpMCPClient(
  { transport: 'n8n' },
  { triggerType: 'webhook' }
);

await client.connect();

// Register webhook handlers
client.registerWebhookHandler('task_created', (event) => {
  console.log('New task:', event.data);
  // Trigger N8N workflow
});

// Create task with N8N metadata
await client.createTaskFromN8N('N8N Task', 'list_123', {
  description: 'Created via N8N',
  workflow_id: 'wf_123',
  execution_id: 'exec_456'
});
```

### Real-time Updates

```javascript
const client = new ClickUpMCPClient({ transport: 'sse' });
await client.connect();

// Listen for real-time events
client.on('notification', (data) => {
  console.log('Real-time update:', data);
});

client.on('error', (data) => {
  console.error('Error event:', data);
});
```

## Error Handling

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

## Best Practices

1. **Always disconnect**: Use try/finally to ensure proper cleanup
2. **Handle errors**: Check result.success before using result.data
3. **Use appropriate transport**: Choose transport based on your needs
4. **Monitor health**: Use healthCheck() and ping() for monitoring
5. **Enable logging**: Use enableLogging for debugging

## Troubleshooting

### Common Issues

1. **Connection failed**: Check server URL and ensure MCP server is running
2. **Webhook not working**: Verify webhook URL and N8N configuration
3. **SSE connection issues**: Check firewall and proxy settings
4. **Authentication errors**: Verify ClickUp API key and team ID

### Debug Mode

```javascript
const config = {
  serverUrl: 'http://localhost:3000',
  transport: 'http',
  enableLogging: true  // Enable debug logging
};
```

## Support

- [N8N Integration Guide](../docs/n8n-integration-guide.md)
- [SSE Transport Documentation](../docs/sse-transport.md)
- [Main Documentation](../README.md)
- [GitHub Issues](https://github.com/TaazKareem/clickup-mcp-server/issues)

## License

MIT License - see [LICENSE](../LICENSE) for details. 