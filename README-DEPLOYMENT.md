# Netlify Deployment Guide

This guide will help you deploy the ClickUp MCP Server to Netlify.

## Prerequisites

1. A Netlify account
2. A ClickUp API token
3. Access to a ClickUp workspace

## Deployment Steps

### 1. Fork or Clone the Repository

Make sure you have the repository in your GitHub account.

### 2. Connect to Netlify

1. Go to [Netlify](https://netlify.com) and sign in
2. Click "New site from Git"
3. Choose your Git provider (GitHub, GitLab, Bitbucket)
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
   - **Functions directory**: `netlify/functions`

### 3. Set Environment Variables

In your Netlify site dashboard, go to **Site settings > Environment variables** and add:

```
CLICKUP_API_TOKEN=your_clickup_api_token_here
CLICKUP_TEAM_ID=your_team_id_here
NODE_ENV=production
ENABLE_SSE=true
SSE_PORT=3000
ENABLE_STDIO=true
DOCUMENT_SUPPORT=true
```

### 4. Deploy

Click "Deploy site" and wait for the build to complete.

## Available Endpoints

After deployment, your site will have the following endpoints:

- **MCP Server**: `https://your-site.netlify.app/mcp`
- **Health Check**: `https://your-site.netlify.app/health`
- **SSE Events**: `https://your-site.netlify.app/events`
- **Webhooks**: `https://your-site.netlify.app/webhook`
- **Client API**: `https://your-site.netlify.app/client/*`

## Configuration

The Netlify deployment uses serverless functions to handle MCP requests. The configuration is defined in `netlify.toml` at the root of the project.

### Security Headers

The deployment includes security headers:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Content-Security-Policy with appropriate directives

### CORS

CORS is configured to allow cross-origin requests for the MCP endpoints.

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check the build logs in Netlify
2. Ensure all dependencies are properly installed
3. Verify TypeScript compilation is successful

### Runtime Errors

If functions fail at runtime:

1. Check the function logs in Netlify
2. Verify environment variables are set correctly
3. Ensure ClickUp API token has proper permissions

### MCP Connection Issues

If MCP clients can't connect:

1. Verify CORS headers are properly set
2. Check that the MCP endpoint is responding
3. Test the health endpoint first

## Environment-Specific Configuration

The deployment supports different environments:

- **Production**: Full security headers and optimizations
- **Deploy Preview**: Same as production but with preview-specific settings
- **Branch Deploy**: Development mode with additional logging

## Monitoring

You can monitor your deployment through:

- Netlify Analytics
- Function logs in the Netlify dashboard
- Health check endpoint responses

## Support

For issues specific to the ClickUp MCP Server, please check the main repository documentation and issues.