/**
 * Test function to verify module imports
 */

exports.handler = async (event, context) => {
  const results = {
    imports: {},
    errors: [],
    environment: {
      hasClickUpApiKey: !!process.env.CLICKUP_API_KEY,
      hasClickUpTeamId: !!process.env.CLICKUP_TEAM_ID,
      nodeVersion: process.version
    }
  };

  try {
    // Test config import
    console.log('Testing config import...');
    const config = await import('../../build/config.js');
    results.imports.config = {
      success: true,
      hasClickupApiKey: !!config.default?.clickupApiKey,
      hasClickupTeamId: !!config.default?.clickupTeamId,
      keys: Object.keys(config.default || {})
    };
  } catch (error) {
    results.imports.config = { success: false, error: error.message };
    results.errors.push(`Config import error: ${error.message}`);
  }

  try {
    // Test server import
    console.log('Testing server import...');
    const serverModule = await import('../../build/server.js');
    results.imports.server = {
      success: true,
      hasConfigureServer: typeof serverModule.configureServer === 'function',
      hasServer: !!serverModule.server,
      exports: Object.keys(serverModule)
    };
  } catch (error) {
    results.imports.server = { success: false, error: error.message };
    results.errors.push(`Server import error: ${error.message}`);
  }

  try {
    // Test SDK import
    console.log('Testing SDK import...');
    const sdkModule = await import('@modelcontextprotocol/sdk/server/http.js');
    results.imports.sdk = {
      success: true,
      hasStreamableHTTPServerTransport: !!sdkModule.StreamableHTTPServerTransport,
      exports: Object.keys(sdkModule)
    };
  } catch (error) {
    results.imports.sdk = { success: false, error: error.message };
    results.errors.push(`SDK import error: ${error.message}`);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(results, null, 2)
  };
};