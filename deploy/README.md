# ClickUp MCP Client - Deployment Guide

This guide provides comprehensive instructions for deploying the ClickUp MCP Client to various hosting platforms.

## 🚀 **Quick Deploy Options**

### 1. **Railway (Recommended for MCP)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

### 2. **Vercel (Serverless)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. **Docker Compose (Local/Cloud)**
```bash
# Start all services
docker-compose -f deploy/docker-compose.yml up -d

# View logs
docker-compose -f deploy/docker-compose.yml logs -f
```

## 📋 **Prerequisites**

1. **ClickUp API Credentials**:
   - API Key from [ClickUp Settings](https://app.clickup.com/settings/apps)
   - Team ID from your ClickUp workspace URL

2. **Environment Variables**:
   ```bash
   CLICKUP_API_KEY=your_api_key_here
   CLICKUP_TEAM_ID=your_team_id_here
   NODE_ENV=production
   ```

## 🏠 **Hosting Options**

### **Option 1: Railway (Recommended)**

Railway is ideal for MCP servers due to its simplicity and MCP-friendly architecture.

#### Setup:
1. **Create Railway Account**: [railway.app](https://railway.app)
2. **Connect Repository**: Link your GitHub repo
3. **Set Environment Variables**:
   ```bash
   CLICKUP_API_KEY=your_api_key
   CLICKUP_TEAM_ID=your_team_id
   ENABLE_SSE=true
   SSE_PORT=3000
   ```
4. **Deploy**: Railway automatically detects and deploys

#### Benefits:
- ✅ MCP-friendly architecture
- ✅ Automatic HTTPS
- ✅ Easy environment management
- ✅ Built-in monitoring
- ✅ Free tier available

### **Option 2: Vercel (Serverless)**

Good for HTTP-based MCP clients, limited for SSE.

#### Setup:
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `vercel --prod`
3. **Configure Environment Variables** in Vercel dashboard

#### Benefits:
- ✅ Excellent performance
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ Free tier available

#### Limitations:
- ❌ Limited SSE support
- ❌ No persistent connections

### **Option 3: Heroku**

Traditional PaaS option with good MCP support.

#### Setup:
1. **Install Heroku CLI**: [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)
2. **Create App**: `heroku create your-app-name`
3. **Set Environment Variables**:
   ```bash
   heroku config:set CLICKUP_API_KEY=your_api_key
   heroku config:set CLICKUP_TEAM_ID=your_team_id
   ```
4. **Deploy**: `git push heroku main`

#### Benefits:
- ✅ Good MCP support
- ✅ Easy deployment
- ✅ Built-in monitoring
- ✅ SSL included

### **Option 4: AWS ECS (Enterprise)**

For enterprise deployments with full control.

#### Setup:
1. **Build Docker Images**:
   ```bash
   docker build -t clickup-mcp-server .
   docker build -f Dockerfile.client -t clickup-mcp-client .
   ```
2. **Push to ECR**:
   ```bash
   aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account.dkr.ecr.your-region.amazonaws.com
   docker tag clickup-mcp-server:latest your-account.dkr.ecr.your-region.amazonaws.com/clickup-mcp-server:latest
   docker push your-account.dkr.ecr.your-region.amazonaws.com/clickup-mcp-server:latest
   ```
3. **Deploy with ECS**: Use the provided task definition

#### Benefits:
- ✅ Full control
- ✅ High availability
- ✅ Auto-scaling
- ✅ Enterprise features

### **Option 5: Self-Hosted (VPS)**

For complete control over infrastructure.

#### Setup:
1. **Provision VPS** (DigitalOcean, Linode, etc.)
2. **Install Docker**: `curl -fsSL https://get.docker.com | sh`
3. **Clone Repository**: `git clone your-repo`
4. **Set Environment Variables**:
   ```bash
   export CLICKUP_API_KEY=your_api_key
   export CLICKUP_TEAM_ID=your_team_id
   ```
5. **Deploy**: `docker-compose -f deploy/docker-compose.yml up -d`

#### Benefits:
- ✅ Complete control
- ✅ Cost-effective
- ✅ No vendor lock-in
- ✅ Custom configurations

## 🔧 **Configuration**

### **Environment Variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CLICKUP_API_KEY` | ClickUp API key | ✅ | - |
| `CLICKUP_TEAM_ID` | ClickUp team ID | ✅ | - |
| `NODE_ENV` | Environment | ❌ | `development` |
| `ENABLE_SSE` | Enable SSE transport | ❌ | `false` |
| `SSE_PORT` | SSE server port | ❌ | `3000` |
| `ENABLE_STDIO` | Enable STDIO transport | ❌ | `true` |
| `DOCUMENT_SUPPORT` | Enable document support | ❌ | `false` |

### **Port Configuration**

| Service | Port | Description |
|---------|------|-------------|
| MCP Server | 3000 | Main MCP server |
| Webhook Server | 3001 | N8N webhook endpoints |
| MCP Client | 3002 | Client web interface |
| Nginx | 80/443 | Reverse proxy |

## 🔒 **Security Considerations**

### **SSL/TLS**
- Always use HTTPS in production
- Configure SSL certificates (Let's Encrypt recommended)
- Enable HSTS headers

### **API Key Security**
- Never commit API keys to version control
- Use environment variables or secrets management
- Rotate API keys regularly

### **Rate Limiting**
- Implement rate limiting (configured in nginx.conf)
- Monitor API usage
- Set appropriate limits

### **Access Control**
- Use authentication if needed
- Implement IP whitelisting if required
- Monitor access logs

## 📊 **Monitoring & Health Checks**

### **Health Check Endpoints**
- **Server**: `https://your-domain.com/health`
- **Client**: `https://your-domain.com/client/health`
- **Webhook**: `https://your-domain.com/webhook/health`

### **Monitoring Setup**
```bash
# Check server status
curl https://your-domain.com/health

# Check client status
curl https://your-domain.com/client/health

# Monitor logs
docker-compose logs -f clickup-mcp-server
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Connection Failed**
   ```bash
   # Check if server is running
   curl http://localhost:3000/health
   
   # Check logs
   docker-compose logs clickup-mcp-server
   ```

2. **API Key Issues**
   ```bash
   # Verify API key
   curl -H "Authorization: YOUR_API_KEY" https://api.clickup.com/api/v2/team
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   
   # Change ports in docker-compose.yml
   ```

4. **SSL Issues**
   ```bash
   # Test SSL configuration
   openssl s_client -connect your-domain.com:443
   ```

### **Debug Mode**
```bash
# Enable debug logging
export NODE_ENV=development
export ENABLE_LOGGING=true

# Run with debug
npm run dev
```

## 📈 **Scaling**

### **Horizontal Scaling**
- Use load balancers (nginx, AWS ALB)
- Deploy multiple instances
- Use container orchestration (Kubernetes, ECS)

### **Vertical Scaling**
- Increase CPU/memory allocation
- Optimize Node.js settings
- Use connection pooling

### **Performance Optimization**
- Enable caching
- Use CDN for static assets
- Optimize database queries
- Monitor performance metrics

## 🔄 **CI/CD Pipeline**

### **GitHub Actions Example**
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: railway/cli@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📞 **Support**

- **Documentation**: [README.md](../README.md)
- **Issues**: [GitHub Issues](https://github.com/TaazKareem/clickup-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TaazKareem/clickup-mcp-server/discussions)

## 🎯 **Next Steps**

1. **Choose Hosting Platform**: Select based on your needs
2. **Set Up Environment**: Configure API keys and settings
3. **Deploy**: Follow platform-specific instructions
4. **Test**: Verify functionality with test scripts
5. **Monitor**: Set up monitoring and alerts
6. **Scale**: Optimize based on usage patterns

The ClickUp MCP Client is now ready for production deployment! Choose the hosting option that best fits your requirements and follow the platform-specific instructions. 