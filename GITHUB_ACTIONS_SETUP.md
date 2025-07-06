# GitHub Actions Setup Guide

This guide will help you migrate from Azure Deployment Center to GitHub Actions for your blood sugar tracker application.

## Prerequisites

1. Your code must be in a GitHub repository
2. You need access to your Azure Web App
3. You need a Docker Hub account (if using container deployment)

## Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

### Required Secrets

1. **AZURE_WEBAPP_PUBLISH_PROFILE**
   - Download your Azure Web App publish profile:
     - Go to Azure Portal → Your Web App → Overview → Get publish profile
     - Download the `.PublishSettings` file
     - Copy the entire content of the file
     - Paste it as the secret value

2. **DOCKER_HUB_USERNAME**
   - Your Docker Hub username

3. **DOCKER_HUB_TOKEN**
   - Your Docker Hub access token (not your password)
   - Create one at: https://hub.docker.com/settings/security

### Optional: Update Environment Variables

In the `.github/workflows/deploy.yml` file, update these variables if needed:

```yaml
env:
  BUILD_CONFIGURATION: 'Release'
  IMAGE_NAME: 'bloodsugerhistory'
  DOCKER_HUB_NAMESPACE: 'iceinplanet' # Replace with your Docker Hub username
  AZURE_WEBAPP_NAME: 'bloodsugarhistory' # Replace with your Azure Web App name
```

## Step 2: Disable Azure Deployment Center

1. Go to your Azure Web App → Deployment Center
2. Disconnect the current deployment source
3. This will prevent conflicts between Azure and GitHub Actions

## Step 3: Test the Workflow

1. Push a change to the `main` branch
2. Go to your GitHub repository → Actions tab
3. You should see the workflow running
4. Check that the deployment completes successfully

## Workflow Features

The GitHub Actions workflow includes:

- **Build Process**: 
  - Installs .NET 9.0 and Node.js 18
  - Builds the React frontend
  - Builds the .NET backend
  - Creates a deployment package

- **Docker Support**:
  - Builds and pushes Docker image to Docker Hub
  - Deploys container to Azure Web App

- **Deployment**:
  - Deploys both ZIP package and Docker container
  - Only deploys on pushes to `main` branch
  - Runs on pull requests for testing

## Troubleshooting

### Common Issues

1. **Publish Profile Issues**
   - Ensure the publish profile is correctly copied
   - Check that the Azure Web App name matches

2. **Docker Hub Authentication**
   - Verify your Docker Hub username and token
   - Ensure the token has write permissions

3. **Build Failures**
   - Check the Actions logs for specific error messages
   - Verify all dependencies are correctly specified

### Getting Help

- Check the GitHub Actions logs for detailed error information
- Verify all secrets are correctly configured
- Ensure your Azure Web App is running and accessible

## Migration Benefits

- **Better Integration**: Direct integration with GitHub
- **Faster Builds**: GitHub Actions runners are typically faster
- **More Control**: Full control over the build and deployment process
- **Cost Effective**: GitHub Actions provides more free minutes
- **Better Visibility**: Detailed logs and status in GitHub 