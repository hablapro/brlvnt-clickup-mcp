/**
 * Combined MCP HTTP and SSE server for N8N compatibility
 * This handles both regular HTTP requests and SSE connections
 */

const https = require('https');

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const CLICKUP_TEAM_ID = process.env.CLICKUP_TEAM_ID;

// Helper function to make ClickUp API requests
function makeClickUpRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.clickup.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`ClickUp API error: ${result.err || result.error || body}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

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
            try {
              console.log('Fetching spaces for team:', CLICKUP_TEAM_ID);
              const spacesResponse = await makeClickUpRequest(`/api/v2/team/${CLICKUP_TEAM_ID}/space`);
              console.log('Spaces response:', JSON.stringify(spacesResponse));
              
              const hierarchy = {
                teamId: CLICKUP_TEAM_ID,
                spaces: []
              };
              
              if (spacesResponse.spaces) {
                for (const space of spacesResponse.spaces) {
                  console.log(`Processing space: ${space.name} (${space.id})`);
                  
                  const spaceData = {
                    id: space.id,
                    name: space.name,
                    folders: [],
                    lists: []
                  };
                  
                  // Get folders for this space
                  try {
                    const foldersResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/folder`);
                    console.log(`Folders for space ${space.id}:`, JSON.stringify(foldersResponse));
                    
                    if (foldersResponse.folders) {
                      for (const folder of foldersResponse.folders) {
                        const folderData = {
                          id: folder.id,
                          name: folder.name,
                          lists: []
                        };
                        
                        // Get lists in this folder
                        if (folder.lists) {
                          folderData.lists = folder.lists.map(list => ({
                            id: list.id,
                            name: list.name
                          }));
                        }
                        
                        spaceData.folders.push(folderData);
                      }
                    }
                  } catch (folderError) {
                    console.error(`Error fetching folders for space ${space.id}:`, folderError);
                  }
                  
                  // Get lists directly in the space (not in folders)
                  try {
                    const listsResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/list`);
                    console.log(`Lists for space ${space.id}:`, JSON.stringify(listsResponse));
                    
                    if (listsResponse.lists) {
                      spaceData.lists = listsResponse.lists.map(list => ({
                        id: list.id,
                        name: list.name
                      }));
                    }
                  } catch (listError) {
                    console.error(`Error fetching lists for space ${space.id}:`, listError);
                  }
                  
                  hierarchy.spaces.push(spaceData);
                }
              }
              
              result = {
                content: [{
                  type: "text",
                  text: JSON.stringify(hierarchy, null, 2)
                }]
              };
            } catch (error) {
              console.error('Error fetching workspace hierarchy:', error);
              result = {
                content: [{
                  type: "text", 
                  text: `Error fetching workspace hierarchy: ${error.message}`
                }],
                isError: true
              };
            }
            break;
            
          case "create_task":
            try {
              console.log('Creating task with args:', toolArgs);
              
              if (!toolArgs.listId || !toolArgs.name) {
                throw new Error("listId and name are required to create a task");
              }
              
              const taskData = {
                name: toolArgs.name
              };
              
              // Add optional fields if provided
              if (toolArgs.description) taskData.description = toolArgs.description;
              if (toolArgs.assignees) taskData.assignees = toolArgs.assignees;
              if (toolArgs.priority) taskData.priority = toolArgs.priority;
              if (toolArgs.dueDate) taskData.due_date = new Date(toolArgs.dueDate).getTime();
              if (toolArgs.status) taskData.status = toolArgs.status;
              
              console.log('Sending task data to ClickUp:', JSON.stringify(taskData));
              
              const taskResponse = await makeClickUpRequest(`/api/v2/list/${toolArgs.listId}/task`, 'POST', taskData);
              console.log('Task created:', JSON.stringify(taskResponse));
              
              result = {
                content: [{
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    task: {
                      id: taskResponse.id,
                      name: taskResponse.name,
                      url: taskResponse.url,
                      status: taskResponse.status?.status,
                      list: {
                        id: taskResponse.list?.id,
                        name: taskResponse.list?.name
                      },
                      created: new Date().toISOString()
                    }
                  }, null, 2)
                }]
              };
            } catch (error) {
              console.error('Error creating task:', error);
              result = {
                content: [{
                  type: "text",
                  text: `Error creating task: ${error.message}`
                }],
                isError: true
              };
            }
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