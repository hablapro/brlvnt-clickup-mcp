/**
 * Simple ClickUp HTTP Tool for N8N
 * Bypasses MCP complexity and provides direct HTTP interface
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

exports.handler = async (event, context) => {
  console.log('ClickUp Tool Handler called');
  console.log('Method:', event.httpMethod);
  console.log('Query params:', event.queryStringParameters);
  console.log('Body:', event.body);

  try {
    // Handle CORS
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const action = event.queryStringParameters?.action || 'get_workspace_hierarchy';
    let body = {};
    
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    }

    console.log('Action:', action);

    let result;

    switch (action) {
      case 'get_workspace_hierarchy':
        try {
          console.log('Fetching workspace hierarchy');
          
          // Get team info
          const teamResponse = await makeClickUpRequest(`/api/v2/team`);
          const team = teamResponse.teams ? teamResponse.teams.find(t => t.id === CLICKUP_TEAM_ID) : null;
          
          let hierarchyText = `# ClickUp Workspace Hierarchy\n\n`;
          hierarchyText += `**Team:** ${team ? team.name : 'Team Workspace'} (ID: ${CLICKUP_TEAM_ID})\n\n`;
          
          const spacesResponse = await makeClickUpRequest(`/api/v2/team/${CLICKUP_TEAM_ID}/space`);
          
          if (spacesResponse.spaces && spacesResponse.spaces.length > 0) {
            hierarchyText += `## Spaces (${spacesResponse.spaces.length} total):\n\n`;
            
            for (const space of spacesResponse.spaces) {
              hierarchyText += `### 📁 ${space.name}\n`;
              hierarchyText += `- **Space ID:** ${space.id}\n`;
              
              // Get folders
              try {
                const foldersResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/folder`);
                
                if (foldersResponse.folders && foldersResponse.folders.length > 0) {
                  hierarchyText += `- **Folders:**\n`;
                  for (const folder of foldersResponse.folders) {
                    hierarchyText += `  - 📂 ${folder.name} (ID: ${folder.id})\n`;
                    
                    if (folder.lists && folder.lists.length > 0) {
                      hierarchyText += `    - **Lists:**\n`;
                      for (const list of folder.lists) {
                        hierarchyText += `      - 📋 ${list.name} (ID: ${list.id})\n`;
                      }
                    }
                  }
                }
              } catch (error) {
                hierarchyText += `- **Folders:** Error loading folders\n`;
              }
              
              // Get direct lists
              try {
                const listsResponse = await makeClickUpRequest(`/api/v2/space/${space.id}/list`);
                
                if (listsResponse.lists && listsResponse.lists.length > 0) {
                  hierarchyText += `- **Direct Lists:**\n`;
                  for (const list of listsResponse.lists) {
                    hierarchyText += `  - 📋 ${list.name} (ID: ${list.id})\n`;
                  }
                }
              } catch (error) {
                hierarchyText += `- **Direct Lists:** Error loading lists\n`;
              }
              
              hierarchyText += `\n`;
            }
          } else {
            hierarchyText += `No spaces found.\n`;
          }

          result = {
            success: true,
            action: 'get_workspace_hierarchy',
            data: {
              teamId: CLICKUP_TEAM_ID,
              teamName: team ? team.name : 'Team Workspace',
              spacesCount: spacesResponse.spaces ? spacesResponse.spaces.length : 0,
              hierarchy: hierarchyText,
              rawData: spacesResponse
            }
          };
        } catch (error) {
          console.error('Error getting workspace hierarchy:', error);
          result = {
            success: false,
            action: 'get_workspace_hierarchy',
            error: error.message,
            data: null
          };
        }
        break;
        
      case 'create_task':
        try {
          const { listId, name, description, assignees, priority, status, dueDate } = body;
          
          if (!listId || !name) {
            throw new Error('listId and name are required');
          }
          
          const taskData = { name };
          if (description) taskData.description = description;
          if (assignees) taskData.assignees = assignees;
          if (priority) taskData.priority = priority;
          if (status) taskData.status = status;
          if (dueDate) taskData.due_date = new Date(dueDate).getTime();
          
          const taskResponse = await makeClickUpRequest(`/api/v2/list/${listId}/task`, 'POST', taskData);
          
          result = {
            success: true,
            action: 'create_task',
            data: {
              task: {
                id: taskResponse.id,
                name: taskResponse.name,
                url: taskResponse.url,
                status: taskResponse.status?.status,
                list: taskResponse.list
              }
            }
          };
        } catch (error) {
          console.error('Error creating task:', error);
          result = {
            success: false,
            action: 'create_task',
            error: error.message,
            data: null
          };
        }
        break;
        
      case 'get_space_details':
        try {
          const spaceId = event.queryStringParameters?.spaceId || body.spaceId;
          if (!spaceId) {
            throw new Error('spaceId is required');
          }
          
          const spaceResponse = await makeClickUpRequest(`/api/v2/space/${spaceId}`);
          const foldersResponse = await makeClickUpRequest(`/api/v2/space/${spaceId}/folder`);
          const listsResponse = await makeClickUpRequest(`/api/v2/space/${spaceId}/list`);
          
          result = {
            success: true,
            action: 'get_space_details',
            data: {
              space: spaceResponse,
              folders: foldersResponse.folders || [],
              lists: listsResponse.lists || []
            }
          };
        } catch (error) {
          console.error('Error getting space details:', error);
          result = {
            success: false,
            action: 'get_space_details',
            error: error.message,
            data: null
          };
        }
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: [
            'get_workspace_hierarchy',
            'create_task', 
            'get_space_details'
          ]
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};