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

// Available tools - matching the original ClickUp MCP server
const tools = [
  {
    name: "get_workspace_hierarchy",
    description: "Gets complete workspace hierarchy (spaces, folders, lists). No parameters needed. Returns tree structure with names and IDs for navigation.",
    inputSchema: {
      type: "object",
      properties: {}
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
  },
  {
    name: "get_task",
    description: "Get detailed information about a specific task",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID to retrieve" }
      },
      required: ["taskId"]
    }
  },
  {
    name: "get_workspace_tasks",
    description: "Get tasks from workspace with filtering options",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", description: "Page number for pagination" },
        assignees: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Filter by assignee IDs" 
        },
        statuses: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Filter by task statuses" 
        }
      }
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
              console.log('Fetching workspace hierarchy for team:', CLICKUP_TEAM_ID);
              
              // Get team info first
              const teamResponse = await makeClickUpRequest(`/api/v2/team`);
              const team = teamResponse.teams ? teamResponse.teams.find(t => t.id === CLICKUP_TEAM_ID) : null;
              
              // Build hierarchy tree like the original implementation
              let treeOutput = '';
              if (team) {
                treeOutput += `📊 ${team.name} (Team: ${team.id})\n`;
              } else {
                treeOutput += `📊 Team Workspace (Team: ${CLICKUP_TEAM_ID})\n`;
              }
              
              const spacesResponse = await makeClickUpRequest(`/api/v2/team/${CLICKUP_TEAM_ID}/space`);
              console.log('Spaces response:', JSON.stringify(spacesResponse));
              
              if (spacesResponse.spaces) {
                for (const space of spacesResponse.spaces) {
                  console.log(`Processing space: ${space.name} (${space.id})`);
                  treeOutput += `├── 📁 ${space.name} (Space: ${space.id})\n`;
                  
                  // Get folders for this space
                  try {
                    const foldersResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/folder`);
                    
                    if (foldersResponse.folders && foldersResponse.folders.length > 0) {
                      for (let i = 0; i < foldersResponse.folders.length; i++) {
                        const folder = foldersResponse.folders[i];
                        const isLastFolder = i === foldersResponse.folders.length - 1;
                        const folderPrefix = isLastFolder ? '└──' : '├──';
                        
                        treeOutput += `│   ${folderPrefix} 📂 ${folder.name} (Folder: ${folder.id})\n`;
                        
                        // Get lists in this folder
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
                    treeOutput += `│   ⚠️ Error loading folders\n`;
                  }
                  
                  // Get lists directly in the space (not in folders)
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
                    treeOutput += `│   ⚠️ Error loading lists\n`;
                  }
                }
              }
              
              result = {
                hierarchy: treeOutput
              };
            } catch (error) {
              console.error('Error fetching workspace hierarchy:', error);
              result = {
                error: `Error getting workspace hierarchy: ${error.message}`
              };
            }
            break;
            
          case "get_workspace_summary":
            try {
              console.log('Generating workspace summary for team:', CLICKUP_TEAM_ID);
              const spacesResponse = await makeClickUpRequest(`/api/v2/team/${CLICKUP_TEAM_ID}/space`);
              
              let summary = `# ClickUp Workspace Summary\n\n`;
              summary += `**Team ID:** ${CLICKUP_TEAM_ID}\n`;
              summary += `**Total Spaces:** ${spacesResponse.spaces?.length || 0}\n\n`;
              
              if (spacesResponse.spaces) {
                for (const space of spacesResponse.spaces) {
                  summary += `## 📁 ${space.name} (ID: ${space.id})\n\n`;
                  
                  // Count totals
                  let totalFolders = 0;
                  let totalLists = 0;
                  
                  // Get folders
                  try {
                    const foldersResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/folder`);
                    if (foldersResponse.folders) {
                      totalFolders = foldersResponse.folders.length;
                      
                      for (const folder of foldersResponse.folders) {
                        summary += `### 📂 ${folder.name}\n`;
                        if (folder.lists) {
                          folder.lists.forEach(list => {
                            summary += `   - 📋 ${list.name} (ID: ${list.id})\n`;
                            totalLists++;
                          });
                        }
                        summary += '\n';
                      }
                    }
                  } catch (error) {
                    summary += `   ⚠️ Could not fetch folders: ${error.message}\n\n`;
                  }
                  
                  // Get direct lists
                  try {
                    const listsResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/list`);
                    if (listsResponse.lists && listsResponse.lists.length > 0) {
                      summary += `### 📋 Direct Lists:\n`;
                      listsResponse.lists.forEach(list => {
                        summary += `   - ${list.name} (ID: ${list.id})\n`;
                        totalLists++;
                      });
                      summary += '\n';
                    }
                  } catch (error) {
                    summary += `   ⚠️ Could not fetch lists: ${error.message}\n\n`;
                  }
                  
                  summary += `**Space Summary:** ${totalFolders} folders, ${totalLists} lists\n\n`;
                  summary += `---\n\n`;
                }
              }
              
              result = {
                content: [{
                  type: "text",
                  text: summary
                }]
              };
            } catch (error) {
              console.error('Error generating workspace summary:', error);
              result = {
                content: [{
                  type: "text", 
                  text: `Error generating workspace summary: ${error.message}`
                }],
                isError: true
              };
            }
            break;
            
          case "get_task":
            try {
              const taskId = toolArgs.taskId;
              if (!taskId) {
                throw new Error("taskId is required");
              }
              
              console.log('Getting task:', taskId);
              const taskResponse = await makeClickUpRequest(`/api/v2/task/${taskId}`);
              
              result = taskResponse;
            } catch (error) {
              console.error('Error getting task:', error);
              result = {
                error: `Error getting task: ${error.message}`
              };
            }
            break;
            
          case "get_workspace_tasks":
            try {
              console.log('Getting workspace tasks with args:', toolArgs);
              
              let url = `/api/v2/team/${CLICKUP_TEAM_ID}/task`;
              const params = new URLSearchParams();
              
              if (toolArgs.page) params.append('page', toolArgs.page);
              if (toolArgs.assignees && toolArgs.assignees.length > 0) {
                params.append('assignees[]', toolArgs.assignees.join(','));
              }
              if (toolArgs.statuses && toolArgs.statuses.length > 0) {
                params.append('statuses[]', toolArgs.statuses.join(','));
              }
              
              if (params.toString()) {
                url += '?' + params.toString();
              }
              
              const tasksResponse = await makeClickUpRequest(url);
              result = tasksResponse;
            } catch (error) {
              console.error('Error getting workspace tasks:', error);
              result = {
                error: `Error getting workspace tasks: ${error.message}`
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