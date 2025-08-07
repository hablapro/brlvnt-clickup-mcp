/**
 * N8N-compatible MCP Server implementation
 * Handles the specific handshake and protocol that N8N expects
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

// Generate session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// MCP Tools Definition
const tools = [
  {
    name: "get_workspace_hierarchy",
    description: "Gets complete workspace hierarchy (spaces, folders, lists). No parameters needed. Returns tree structure with names and IDs for navigation.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "create_task",
    description: "Create a new task in ClickUp with comprehensive options",
    inputSchema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "List ID where task will be created" },
        name: { type: "string", description: "Task name/title" },
        description: { type: "string", description: "Task description (markdown supported)" },
        assignees: { 
          type: "array", 
          items: { type: "string" }, 
          description: "User IDs, emails, or usernames to assign" 
        },
        priority: { 
          type: "integer", 
          description: "Priority level: 1=Urgent, 2=High, 3=Normal, 4=Low" 
        },
        status: { type: "string", description: "Task status name" },
        dueDate: { type: "string", description: "Due date (ISO format or natural language)" },
        tags: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Tag names to add" 
        }
      },
      required: ["listId", "name"]
    }
  }
];

exports.handler = async (event, context) => {
  console.log('N8N MCP Handler - Method:', event.httpMethod);
  console.log('N8N MCP Handler - Headers:', JSON.stringify(event.headers));
  console.log('N8N MCP Handler - Path:', event.path);
  console.log('N8N MCP Handler - Body:', event.body);

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

    // Handle GET request for initial connection/handshake
    if (event.httpMethod === 'GET') {
      console.log('Handling GET request - likely SSE connection');
      
      const sessionId = generateSessionId();
      
      // Send initial SSE events that N8N expects
      const events = [
        `data: {"type": "connection", "sessionId": "${sessionId}", "status": "connected"}\n\n`,
        `data: {"type": "server_info", "name": "clickup-mcp-server", "version": "0.8.5", "protocolVersion": "2024-11-05"}\n\n`,
        `data: {"type": "capabilities", "tools": ${JSON.stringify(tools)}}\n\n`,
        `data: {"type": "ready"}\n\n`
      ];
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'X-Session-Id': sessionId
        },
        body: events.join('')
      };
    }

    // Handle POST requests (RPC calls)
    if (event.httpMethod === 'POST') {
      console.log('Handling POST request - RPC call');
      
      const body = JSON.parse(event.body || '{}');
      const { method, params, id } = body;
      
      console.log('RPC Method:', method);
      console.log('RPC Params:', JSON.stringify(params));
      
      let result;
      
      switch (method) {
        case "initialize":
          const sessionId = generateSessionId();
          result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              logging: {},
              prompts: {},
              resources: {}
            },
            serverInfo: {
              name: "clickup-mcp-server",
              version: "0.8.5"
            }
          };
          break;
          
        case "tools/list":
          result = { tools };
          break;
          
        case "tools/call":
          const toolName = params.name;
          const toolArgs = params.arguments || {};
          
          console.log('Calling tool:', toolName);
          console.log('Tool args:', JSON.stringify(toolArgs));
          
          if (!CLICKUP_API_KEY || !CLICKUP_TEAM_ID) {
            throw new Error("ClickUp API credentials not configured");
          }
          
          switch (toolName) {
            case "get_workspace_hierarchy":
              try {
                console.log('Fetching workspace hierarchy');
                
                // Get team info first
                const teamResponse = await makeClickUpRequest(`/api/v2/team`);
                const team = teamResponse.teams ? teamResponse.teams.find(t => t.id === CLICKUP_TEAM_ID) : null;
                
                // Build hierarchy tree
                let treeOutput = '';
                if (team) {
                  treeOutput += `📊 ${team.name} (Team: ${team.id})\n`;
                } else {
                  treeOutput += `📊 Team Workspace (Team: ${CLICKUP_TEAM_ID})\n`;
                }
                
                const spacesResponse = await makeClickUpRequest(`/api/v2/team/${CLICKUP_TEAM_ID}/space`);
                
                if (spacesResponse.spaces) {
                  for (const space of spacesResponse.spaces) {
                    treeOutput += `├── 📁 ${space.name} (Space: ${space.id})\n`;
                    
                    // Get folders and lists for this space
                    try {
                      const foldersResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/folder`);
                      
                      if (foldersResponse.folders && foldersResponse.folders.length > 0) {
                        for (let i = 0; i < foldersResponse.folders.length; i++) {
                          const folder = foldersResponse.folders[i];
                          const isLastFolder = i === foldersResponse.folders.length - 1;
                          const folderPrefix = isLastFolder ? '└──' : '├──';
                          
                          treeOutput += `│   ${folderPrefix} 📂 ${folder.name} (Folder: ${folder.id})\n`;
                          
                          if (folder.lists && folder.lists.length > 0) {
                            for (let j = 0; j < folder.lists.length; j++) {
                              const list = folder.lists[j];
                              const isLastList = j === folder.lists.length - 1;
                              const listPrefix = isLastList ? '└──' : '├──';
                              const indent = isLastFolder ? '    ' : '│   ';
                              
                              treeOutput += `${indent}${listPrefix} 📋 ${list.name} (List: ${list.id})\n`;
                            }
                          }
                        }
                      }
                    } catch (folderError) {
                      console.error(`Error fetching folders for space ${space.id}:`, folderError);
                    }
                    
                    // Get direct lists
                    try {
                      const listsResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/list`);
                      
                      if (listsResponse.lists && listsResponse.lists.length > 0) {
                        for (let i = 0; i < listsResponse.lists.length; i++) {
                          const list = listsResponse.lists[i];
                          const isLast = i === listsResponse.lists.length - 1;
                          const listPrefix = isLast ? '└──' : '├──';
                          
                          treeOutput += `│   ${listPrefix} 📋 ${list.name} (List: ${list.id})\n`;
                        }
                      }
                    } catch (listError) {
                      console.error(`Error fetching lists for space ${space.id}:`, listError);
                    }
                  }
                }
                
                result = {
                  content: [{
                    type: "text",
                    text: treeOutput
                  }]
                };
              } catch (error) {
                console.error('Error fetching workspace hierarchy:', error);
                result = {
                  content: [{
                    type: "text",
                    text: `Error getting workspace hierarchy: ${error.message}`
                  }],
                  isError: true
                };
              }
              break;
              
            case "create_task":
              try {
                if (!toolArgs.listId || !toolArgs.name) {
                  throw new Error("listId and name are required to create a task");
                }
                
                const taskData = { name: toolArgs.name };
                
                if (toolArgs.description) taskData.description = toolArgs.description;
                if (toolArgs.assignees) taskData.assignees = toolArgs.assignees;
                if (toolArgs.priority) taskData.priority = toolArgs.priority;
                if (toolArgs.dueDate) taskData.due_date = new Date(toolArgs.dueDate).getTime();
                if (toolArgs.status) taskData.status = toolArgs.status;
                
                const taskResponse = await makeClickUpRequest(`/api/v2/list/${toolArgs.listId}/task`, 'POST', taskData);
                
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
                        }
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
          
        default:
          throw new Error(`Unknown method: ${method}`);
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
    }
    
    // Default response
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('N8N MCP Handler Error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
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
        id: null
      })
    };
  }
};