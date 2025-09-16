# AI Gateway Toolkit Extension - Installation and Testing Guide

## Overview

The AI Gateway Toolkit VS Code extension has been successfully created and packaged. This extension provides comprehensive features for managing Azure API Management instances with AI/ML inference APIs.

## Installation

### Method 1: Install from VSIX (Recommended for Testing)

1. Locate the packaged extension file: `ai-gateway-toolkit-0.0.1.vsix`
2. In VS Code, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Extensions: Install from VSIX..." and select it
4. Browse to and select the `ai-gateway-toolkit-0.0.1.vsix` file
5. Restart VS Code if prompted

### Method 2: Development Mode

1. Open the project folder in VS Code: `c:\Projects\ai-gateway-toolkit-3`
2. Press `F5` or go to Run and Debug view and click "Run Extension"
3. This will open a new VS Code window with the extension loaded

## Features Available

### 🔗 Connection Management
- **Connect to Azure**: Use the connect command to authenticate with your Azure account
- **Select Resources**: Choose tenant, subscription, and API Management service
- **View Connection Status**: Check connection in the AI Gateway Toolkit sidebar

### 📊 Analytics Dashboard
- **View Metrics**: Access real-time usage analytics and performance metrics  
- **Interactive Charts**: Usage trends, token consumption, latency analysis
- **Filtering**: Filter by API, subscription, model, region, and time range
- **Detailed Logs**: Drill down into specific requests and responses

### 🎮 Playground
- **Interactive Testing**: Test inference APIs with different configurations
- **Streaming Support**: Handle both streaming and non-streaming responses
- **Trace Integration**: View Azure API Management trace information
- **Request/Response Inspection**: Examine raw JSON data and responses

### 🔧 API Management
- **Browse APIs**: View all available inference APIs
- **API Details**: Access API-specific information and documentation
- **Quick Actions**: Direct access to analytics and playground for specific APIs

### 🔑 Subscription Management
- **View Subscriptions**: List all API Management subscriptions
- **Key Management**: Copy primary and secondary keys with one click
- **Create Subscriptions**: Add new subscriptions with custom scopes

### 🧠 Model Analytics
- **Usage Tracking**: Monitor model usage from Log Analytics
- **Performance Metrics**: Token consumption and response time analysis
- **Model Comparison**: Compare performance across different models

## Extension Commands

Access these commands via the Command Palette (`Ctrl+Shift+P`):

- `AI Gateway: Connect to Azure` - Authenticate and connect to Azure
- `AI Gateway: Disconnect` - Disconnect from Azure
- `AI Gateway: Show Analytics` - Open the analytics dashboard
- `AI Gateway: Open Playground` - Launch the API testing playground
- `AI Gateway: Refresh APIs` - Refresh the API list
- `AI Gateway: Refresh Subscriptions` - Refresh subscriptions
- `AI Gateway: Refresh Models` - Refresh model information

## Sidebar Views

The extension adds an "AI Gateway Toolkit" section to the sidebar with:

- **APIs**: Browse and manage inference APIs
- **Subscriptions**: Manage API Management subscriptions  
- **Models**: View model usage and analytics
- **Connection**: Check and manage Azure connection status

## Prerequisites

- VS Code version 1.104.0 or higher
- Azure subscription with API Management service
- Inference APIs configured in Azure API Management
- Log Analytics workspace connected to API Management (for analytics features)

## Required Azure Permissions

The extension requires the following Azure permissions:
- Read access to Azure subscriptions
- Read access to API Management services  
- Read access to Log Analytics workspaces

## Testing the Extension

1. **Install the Extension**: Follow the installation steps above
2. **Connect to Azure**: Click the connect button in the AI Gateway Toolkit sidebar
3. **Authenticate**: Use your existing VS Code Microsoft authentication
4. **Select Resources**: Choose your tenant, subscription, and API Management service
5. **Explore Features**: Use the analytics dashboard, playground, and management features

## Troubleshooting

### Extension Not Loading
- Ensure VS Code version is 1.104.0 or higher
- Check that the VSIX file is not corrupted
- Try restarting VS Code after installation

### Authentication Issues
- Verify you have the required Azure permissions
- Try signing out and back in to your Microsoft account in VS Code
- Check that your tenant has access to the API Management resources

### Analytics Not Showing Data
- Ensure Log Analytics workspace is connected to API Management
- Verify you have read permissions to the Log Analytics workspace
- Check that there is actual API usage data in the configured time range

### Playground Not Working
- Verify the selected API exists and is accessible
- Check that the subscription has access to the API
- Ensure the API Management service is running and accessible

## Development

### Building from Source

1. Clone the repository or navigate to the project folder
2. Install dependencies: `npm install`
3. Build the extension: `npm run compile`
4. Build webview components: `npx webpack --config webpack.webview.config.js`
5. Package: `vsce package --allow-missing-repository`

### File Structure

- `src/extension.ts` - Main extension entry point
- `src/services/` - Azure integration and webview services
- `src/providers/` - Tree data providers for sidebar views
- `src/webview/` - React components for analytics and playground
- `package.json` - Extension manifest and configuration
- `webpack.config.js` - Extension bundling configuration
- `webpack.webview.config.js` - Webview bundling configuration

## Support

For issues, feature requests, or contributions, please refer to the project documentation or create an issue in the repository.

## License

This extension is licensed under the MIT License.