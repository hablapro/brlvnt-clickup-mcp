/**
 * Simple MCP Server implementation for Netlify Functions
 * This is a minimal implementation that handles MCP protocol without external dependencies
 */

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID;

// Store active sessions
const sessions = {};

// Simple session ID generator
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// MCP Protocol handlers
const handlers = {
  initialize: async (params) => {
    const sessionId = generateSessionId();
    sessions[sessionId] = {
      id: sessionId,
      initialized: true,
      protocolVersion: params.protocolVersion,
      clientInfo: params.clientInfo
    };
    
    return {
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
  },
  
  "tools/list": async () => {
    return {
      tools: [
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
      ]
    };
  },
  
  "tools/call": async (params) => {
    const { name, arguments: args } = params;
    
    if (!CLICKUP_API_KEY || !CLICKUP_TEAM_ID) {
      throw new Error("ClickUp API credentials not configured");
    }
    
    switch (name) {
      case "get_workspace_hierarchy":
        // Simple mock response for testing
        return {
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
        
      case "create_task":
        // Simple mock response for testing
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              id: `task_${Date.now()}`,
              name: args.name,
              listId: args.listId,
              created: new Date().toISOString()
            }, null, 2)
          }]
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
};

exports.handler = async (event, context) => {
  let body;
  let id;
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }
    
    // Parse request
    body = JSON.parse(event.body || '{}');
    const { method, params } = body;
    id = body.id;
    
    console.log('MCP Request:', { method, id });
    
    // Handle the request
    let result;
    if (handlers[method]) {
      result = await handlers[method](params);
    } else {
      throw new Error(`Method not found: ${method}`);
    }
    
    // Return response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'mcp-session-id': result.sessionId || event.headers['mcp-session-id'] || ''
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        result,
        id
      })
    };
    
  } catch (error) {
    console.error('MCP Error:', error);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error.message || "Internal server error"
        },
        id: id || null
      })
    };
  }
};