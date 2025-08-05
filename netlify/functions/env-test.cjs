/**
 * Simple test function to check environment variables
 */

exports.handler = async (event, context) => {
  console.log('=== ENV TEST FUNCTION CALLED ===');
  
  try {
    const envCheck = {
      hasClickUpApiKey: !!process.env.CLICKUP_API_KEY,
      hasClickUpTeamId: !!process.env.CLICKUP_TEAM_ID,
      clickUpApiKeyLength: process.env.CLICKUP_API_KEY ? process.env.CLICKUP_API_KEY.length : 0,
      clickUpTeamId: process.env.CLICKUP_TEAM_ID || 'NOT_SET',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('CLICKUP')),
      nodeEnv: process.env.NODE_ENV || 'NOT_SET'
    };
    
    console.log('Environment check result:', JSON.stringify(envCheck, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        environment: envCheck,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
    
  } catch (error) {
    console.error('Error in env-test function:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};