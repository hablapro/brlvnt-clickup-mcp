#!/bin/bash

# ClickUp MCP Client Deployment Script
# This script helps you deploy the MCP client to various platforms

set -e

echo "🚀 ClickUp MCP Client Deployment Script"
echo "========================================"

# Check if required environment variables are set
if [ -z "$CLICKUP_API_KEY" ]; then
    echo "❌ Error: CLICKUP_API_KEY environment variable is not set"
    echo "Please set it with: export CLICKUP_API_KEY=your_api_key"
    exit 1
fi

if [ -z "$CLICKUP_TEAM_ID" ]; then
    echo "❌ Error: CLICKUP_TEAM_ID environment variable is not set"
    echo "Please set it with: export CLICKUP_TEAM_ID=your_team_id"
    exit 1
fi

echo "✅ Environment variables are set"

# Function to deploy to Railway
deploy_railway() {
    echo "🚂 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "📦 Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    echo "🔐 Logging into Railway..."
    railway login
    
    # Deploy
    echo "🚀 Deploying..."
    railway up
    
    echo "✅ Railway deployment completed!"
}

# Function to deploy with Docker Compose
deploy_docker() {
    echo "🐳 Deploying with Docker Compose..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Error: Docker is not installed"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Error: Docker Compose is not installed"
        echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Build and start services
    echo "🔨 Building and starting services..."
    docker-compose -f deploy/docker-compose.yml up -d --build
    
    echo "✅ Docker deployment completed!"
    echo "🌐 Services are running on:"
    echo "   - MCP Server: http://localhost:3000"
    echo "   - Webhook Server: http://localhost:3001"
    echo "   - MCP Client: http://localhost:3002"
}

# Function to deploy to Vercel
deploy_vercel() {
    echo "▲ Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "📦 Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy
    echo "🚀 Deploying..."
    vercel --prod
    
    echo "✅ Vercel deployment completed!"
}

# Function to deploy to Heroku
deploy_heroku() {
    echo "🟣 Deploying to Heroku..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "❌ Error: Heroku CLI is not installed"
        echo "Please install Heroku CLI first: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Create Heroku app if it doesn't exist
    if [ -z "$HEROKU_APP_NAME" ]; then
        echo "📝 Creating Heroku app..."
        heroku create
    else
        echo "📝 Using existing Heroku app: $HEROKU_APP_NAME"
        heroku git:remote -a $HEROKU_APP_NAME
    fi
    
    # Set environment variables
    echo "🔧 Setting environment variables..."
    heroku config:set CLICKUP_API_KEY=$CLICKUP_API_KEY
    heroku config:set CLICKUP_TEAM_ID=$CLICKUP_TEAM_ID
    heroku config:set NODE_ENV=production
    heroku config:set ENABLE_SSE=true
    
    # Deploy
    echo "🚀 Deploying..."
    git push heroku main
    
    echo "✅ Heroku deployment completed!"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  railway    Deploy to Railway (recommended)"
    echo "  docker     Deploy with Docker Compose"
    echo "  vercel     Deploy to Vercel"
    echo "  heroku     Deploy to Heroku"
    echo "  help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  CLICKUP_API_KEY    Your ClickUp API key (required)"
    echo "  CLICKUP_TEAM_ID    Your ClickUp team ID (required)"
    echo "  HEROKU_APP_NAME    Heroku app name (optional, for Heroku deployment)"
    echo ""
    echo "Examples:"
    echo "  $0 railway"
    echo "  $0 docker"
    echo "  HEROKU_APP_NAME=my-app $0 heroku"
}

# Main script logic
case "${1:-help}" in
    railway)
        deploy_railway
        ;;
    docker)
        deploy_docker
        ;;
    vercel)
        deploy_vercel
        ;;
    heroku)
        deploy_heroku
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📚 Next steps:"
echo "  1. Test your deployment: curl https://your-domain.com/health"
echo "  2. Configure your MCP client to use the new URL"
echo "  3. Set up monitoring and alerts"
echo ""
echo "📖 For more information, see: deploy/README.md" 