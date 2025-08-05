/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * HTTP Client Example
 * 
 * This example demonstrates how to use the ClickUp MCP HTTP Client for simple integrations.
 */

import { ClickUpMCPHTTPClient } from '../src/client/http-client.js';

// Configuration for the HTTP client
const config = {
  serverUrl: 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  enableLogging: true
};

async function main() {
  const client = new ClickUpMCPHTTPClient(config);

  try {
    // Connect to the MCP server
    await client.connect();
    console.log('✅ Connected to ClickUp MCP Server via HTTP');

    // Example 1: Get all spaces
    console.log('\n📋 Getting spaces...');
    const spacesResult = await client.getSpaces();
    if (spacesResult.success) {
      console.log('✅ Spaces:', spacesResult.data);
    } else {
      console.error('❌ Failed to get spaces:', spacesResult.error);
    }

    // Example 2: Get lists from a space
    if (spacesResult.success && spacesResult.data.length > 0) {
      const firstSpaceId = spacesResult.data[0].id;
      console.log(`\n📋 Getting lists from space: ${firstSpaceId}`);
      
      const listsResult = await client.getLists(firstSpaceId);
      if (listsResult.success) {
        console.log('✅ Lists:', listsResult.data);
      } else {
        console.error('❌ Failed to get lists:', listsResult.error);
      }

      // Example 3: Get tasks from a list
      if (listsResult.success && listsResult.data.length > 0) {
        const firstListId = listsResult.data[0].id;
        console.log(`\n📋 Getting tasks from list: ${firstListId}`);
        
        const tasksResult = await client.getTasks(firstListId);
        if (tasksResult.success) {
          console.log('✅ Tasks:', tasksResult.data);
        } else {
          console.error('❌ Failed to get tasks:', tasksResult.error);
        }

        // Example 4: Create a new task
        console.log('\n📝 Creating a new task...');
        const createResult = await client.createTask(
          'Test Task from HTTP Client',
          firstListId,
          {
            description: 'This is a test task created via the HTTP client',
            priority: 2,
            tags: ['test', 'http-client']
          }
        );

        if (createResult.success) {
          console.log('✅ Task created:', createResult.data);
          
          const taskId = createResult.data.id;
          
          // Example 5: Update the task
          console.log('\n🔄 Updating the task...');
          const updateResult = await client.updateTask(taskId, {
            description: 'Updated description via HTTP client',
            priority: 1
          });

          if (updateResult.success) {
            console.log('✅ Task updated:', updateResult.data);
          } else {
            console.error('❌ Failed to update task:', updateResult.error);
          }

          // Example 6: Add a comment
          console.log('\n💬 Adding a comment...');
          const commentResult = await client.addComment(
            taskId,
            'This is a test comment from the HTTP client'
          );

          if (commentResult.success) {
            console.log('✅ Comment added:', commentResult.data);
          } else {
            console.error('❌ Failed to add comment:', commentResult.error);
          }

          // Example 7: Get comments
          console.log('\n💬 Getting comments...');
          const commentsResult = await client.getComments(taskId);
          if (commentsResult.success) {
            console.log('✅ Comments:', commentsResult.data);
          } else {
            console.error('❌ Failed to get comments:', commentsResult.error);
          }

          // Example 8: Add time entry
          console.log('\n⏱️ Adding time entry...');
          const timeResult = await client.addTimeEntry(
            taskId,
            3600000, // 1 hour in milliseconds
            'Worked on task via HTTP client'
          );

          if (timeResult.success) {
            console.log('✅ Time entry added:', timeResult.data);
          } else {
            console.error('❌ Failed to add time entry:', timeResult.error);
          }

          // Example 9: Search for tasks
          console.log('\n🔍 Searching for tasks...');
          const searchResult = await client.searchTasks('test');
          if (searchResult.success) {
            console.log('✅ Search results:', searchResult.data);
          } else {
            console.error('❌ Failed to search tasks:', searchResult.error);
          }

          // Example 10: Get task details
          console.log('\n📋 Getting task details...');
          const taskResult = await client.getTask(taskId);
          if (taskResult.success) {
            console.log('✅ Task details:', taskResult.data);
          } else {
            console.error('❌ Failed to get task details:', taskResult.error);
          }
        } else {
          console.error('❌ Failed to create task:', createResult.error);
        }
      }
    }

    // Example 11: Get tags
    console.log('\n🏷️ Getting tags...');
    const tagsResult = await client.getTags();
    if (tagsResult.success) {
      console.log('✅ Tags:', tagsResult.data);
    } else {
      console.error('❌ Failed to get tags:', tagsResult.error);
    }

    // Example 12: Get connection state and metrics
    console.log('\n📊 Connection State:', client.getConnectionState());
    console.log('📈 Metrics:', client.getMetrics());

    // Example 13: Test ping
    console.log('\n🏓 Testing ping...');
    try {
      const pingTime = await client.ping();
      console.log(`✅ Ping successful: ${pingTime}ms`);
    } catch (error) {
      console.error('❌ Ping failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from the server
    await client.disconnect();
    console.log('\n👋 Disconnected from ClickUp MCP Server');
  }
}

// Run the example
main().catch(console.error); 