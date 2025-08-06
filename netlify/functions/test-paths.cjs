/**
 * Test function to check file paths in Netlify environment
 */

const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const results = {
    cwd: process.cwd(),
    dirname: __dirname,
    paths: {},
    files: {}
  };

  // Check various potential paths
  const pathsToCheck = [
    '.',
    '..',
    '../..',
    'build',
    '../build',
    '../../build',
    '/var/task',
    '/var/task/build',
    '/opt/build/repo',
    '/opt/build/repo/build'
  ];

  for (const p of pathsToCheck) {
    const fullPath = path.resolve(p);
    try {
      const stats = fs.statSync(fullPath);
      results.paths[p] = {
        resolved: fullPath,
        exists: true,
        isDirectory: stats.isDirectory()
      };
      
      // List files if it's a directory
      if (stats.isDirectory()) {
        try {
          results.files[p] = fs.readdirSync(fullPath);
        } catch (e) {
          results.files[p] = `Error listing: ${e.message}`;
        }
      }
    } catch (e) {
      results.paths[p] = {
        resolved: fullPath,
        exists: false,
        error: e.message
      };
    }
  }

  // Check node_modules
  try {
    const nodeModulesPath = path.resolve('node_modules');
    const hasNodeModules = fs.existsSync(nodeModulesPath);
    results.nodeModules = {
      exists: hasNodeModules,
      path: nodeModulesPath
    };
    
    if (hasNodeModules) {
      // Check for specific packages
      const packagesToCheck = ['@modelcontextprotocol/sdk', 'axios', 'zod'];
      results.packages = {};
      
      for (const pkg of packagesToCheck) {
        const pkgPath = path.join(nodeModulesPath, ...pkg.split('/'));
        results.packages[pkg] = fs.existsSync(pkgPath);
      }
    }
  } catch (e) {
    results.nodeModules = { error: e.message };
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