/**
 * N8N-compatible MCP Server implementation
 * Handles both HTTP and SSE in a way N8N expects
 */

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID;

// Store active sessions
const sessions = {};

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
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, x-session-id, accept',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    // Check if this is an SSE request
    const acceptHeader = event.headers.accept || event.headers.Accept || '';
    const isSSE = acceptHeader.includes('text/event-stream');
    
    if (isSSE || event.path.includes('/events')) {
      // Handle SSE connection
      const sessionId = event.headers['mcp-session-id'] || event.headers['x-session-id'] || generateSessionId();
      
      // Send initial connection event
      const connectionEvent = {
        type: "connection",
        sessionId: sessionId,
        serverInfo: {
          name: "clickup-mcp-server",
          version: "0.8.5",
          protocolVersion: "2024-11-05"
        },
        capabilities: {
          tools: true
        }
      };
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, x-session-id, accept',
          'X-Session-Id': sessionId
        },
        body: `data: ${JSON.stringify(connectionEvent)}\n\n`
      };
    }

    // Handle regular HTTP requests
    const body = JSON.parse(event.body || '{}');
    const { method, params, id } = body;
    
    let result;
    
    switch (method) {
      case "initialize":
        const sessionId = generateSessionId();
        sessions[sessionId] = {
          id: sessionId,
          initialized: true,
          protocolVersion: params?.protocolVersion || "2024-11-05",
          clientInfo: params?.clientInfo
        };
        
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "clickup-mcp-server",
            version: "0.8.5"
          },
          sessionId
        };
        break;
        
      case "tools/list":
      case "list_tools":
      case "listTools":
        result = { tools };
        break;
        
      case "tools/call":
      case "tool/execute":
      case "execute":
        const toolName = params.name || params.tool || params.toolName;
        const toolArgs = params.arguments || params.args || params.input || {};
        
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
              }],
              isError: false
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
              }],
              isError: false
            };
            break;
            
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
        break;
        
      case "describe":
      case "discovery":
      case "capabilities":
        result = {
          name: "clickup-mcp-server",
          version: "0.8.5",
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {
              list: true,
              execute: true
            }
          },
          tools: tools
        };
        break;
        
      default:
        // Log unknown method for debugging
        console.log(`Unknown method: ${method}, full request:`, JSON.stringify(body));
        throw new Error(`Unknown method: ${method}`);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, x-session-id, accept'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        result,
        id
      })
    };
    
  } catch (error) {
    console.error('MCP Error:', error);
    console.error('Request was:', JSON.stringify(event.body));
    
    // Try to get ID from parsed body or raw body
    let errorId = null;
    try {
      const parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      errorId = parsedBody?.id || null;
    } catch (e) {
      // Ignore parse errors
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, x-session-id, accept'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal server error"
        },
        id: errorId
      })
    };
  }
};