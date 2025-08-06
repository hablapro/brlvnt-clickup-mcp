/**
 * Combined MCP HTTP and SSE server for N8N compatibility
 * This handles both regular HTTP requests and SSE connections
 */

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID;

// Simple session ID generator
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Available tools
const tools = [
  {
    name: "get_workspace_hierarchy",
    description: "Get the complete workspace hierarchy including spaces, folders, and lists",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "create_task",
    description: "Create a new task in ClickUp",
    inputSchema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "The ID of the list to create the task in" },
        name: { type: "string", description: "The name of the task" },
        description: { type: "string", description: "The description of the task" },
        assignees: { type: "array", items: { type: "string" }, description: "Array of user IDs to assign" },
        priority: { type: "integer", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" },
        dueDate: { type: "string", description: "Due date in ISO format" },
        status: { type: "string", description: "Task status name" }
      },
      required: ["listId", "name"]
    }
  }
];

exports.handler = async (event, context) => {
  console.log('MCP-SSE Handler called');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Headers:', JSON.stringify(event.headers));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    // Check if this is an SSE request
    const acceptHeader = event.headers.accept || event.headers.Accept || '';
    const isSSE = acceptHeader.includes('text/event-stream') || event.httpMethod === 'GET';
    
    if (isSSE) {
      console.log('Handling SSE request');
      const sessionId = event.headers['mcp-session-id'] || event.headers['x-session-id'] || generateSessionId();
      
      // Send initial connection event in the format N8N expects
      const messages = [
        {
          type: "connection",
          status: "connected",
          sessionId: sessionId
        },
        {
          type: "ready",
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "clickup-mcp-server",
            version: "0.8.5"
          },
          capabilities: {
            tools: {
              list: true,
              execute: true
            }
          }
        }
      ];
      
      // Format as SSE
      let sseBody = '';
      for (const message of messages) {
        sseBody += `data: ${JSON.stringify(message)}\n\n`;
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'X-Accel-Buffering': 'no' // Disable Nginx buffering
        },
        body: sseBody
      };
    }

    // Handle regular HTTP requests
    console.log('Handling HTTP request');
    console.log('Body:', event.body);
    
    const body = JSON.parse(event.body || '{}');
    const { method, params, id } = body;
    
    console.log('RPC Method:', method);
    
    let result;
    
    switch (method) {
      case "initialize":
      case "connection.initialize":
        const sessionId = generateSessionId();
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              list: true,
              execute: true
            }
          },
          serverInfo: {
            name: "clickup-mcp-server",
            version: "0.8.5"
          },
          sessionId
        };
        break;
        
      case "tools/list":
      case "tools.list":
      case "listTools":
        result = { tools };
        break;
        
      case "tools/call":
      case "tools.call":
      case "executeTool":
        const toolName = params.name || params.tool || params.toolName;
        const toolArgs = params.arguments || params.args || params.input || {};
        
        console.log('Executing tool:', toolName);
        console.log('With args:', toolArgs);
        
        if (!CLICKUP_API_KEY || !CLICKUP_TEAM_ID) {
          throw new Error("ClickUp API credentials not configured");
        }
        
        switch (toolName) {
          case "get_workspace_hierarchy":
            result = {
              content: [{
                type: "text",
                text: JSON.stringify({
                  teamId: CLICKUP_TEAM_ID,
                  spaces: [
                    {
                      id: "space_1",
                      name: "Test Space",
                      folders: [],
                      lists: [
                        {
                          id: "list_1",
                          name: "Test List"
                        }
                      ]
                    }
                  ]
                }, null, 2)
              }]
            };
            break;
            
          case "create_task":
            result = {
              content: [{
                type: "text",
                text: JSON.stringify({
                  id: `task_${Date.now()}`,
                  name: toolArgs.name,
                  listId: toolArgs.listId,
                  created: new Date().toISOString()
                }, null, 2)
              }]
            };
            break;
            
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
        break;
        
      case "ping":
        result = { pong: true, timestamp: Date.now() };
        break;
        
      default:
        console.log(`Unknown method: ${method}`);
        throw new Error(`Method not found: ${method}`);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        result,
        id
      })
    };
    
  } catch (error) {
    console.error('MCP-SSE Error:', error);
    console.error('Full event:', JSON.stringify(event));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal server error"
        },
        id: event.body ? JSON.parse(event.body).id : null
      })
    };
  }
};