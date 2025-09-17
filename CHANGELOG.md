# Change Log

All notable changes to the "ai-gateway-toolkit" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.1.1] - 2025-09-16

### Added

- Repository information and metadata for marketplace publishing
- Improved package.json with proper publisher configuration
- Enhanced build pipeline for marketplace deployment

### Fixed

- Publisher name consistency across configuration files
- Package metadata for VS Code Marketplace requirements

## [0.1.0] - 2025-09-16

### Features

- **Azure Integration**: Complete integration with Azure API Management and Log Analytics
- **Authentication**: VS Code-native Azure authentication using built-in Microsoft auth provider
- **Analytics Dashboard**: Interactive React-based dashboard with:
  - Real-time AI usage metrics and KPIs
  - Multi-dimensional filtering (API, Operation, Subscription, Model, Region, Time)
  - Drill-down capabilities for detailed analysis
  - Auto-refresh functionality with configurable intervals
  - Data visualization using Recharts (line charts, bar charts)
- **AI Playground**: Interactive testing environment with:
  - Real-time API testing against APIM endpoints
  - Support for various AI models and endpoints
  - Request/response inspection with usage metrics
  - Streaming response support (placeholder)
- **Tree View Explorers**: Organized navigation for:
  - APIs and Operations discovery
  - Subscription management and key access
  - Model usage analysis
  - Connection status monitoring
- **Service Architecture**:
  - `AzureService`: Centralized Azure resource management
  - `WebviewService`: React webview panel management
  - Azure SDK integration with proper credential handling
- **Data Services**:
  - Log Analytics query service with Kusto query building
  - Rate limiting and abort controller support
  - Simple TTL caching for improved performance
  - Data sanitization and security measures
- **User Experience**:
  - Loading indicators and progress feedback
  - Error handling with user-friendly notifications
  - Responsive design matching VS Code themes
  - Context-aware command availability

### Development Features

- **Testing Framework**: Comprehensive test suite using Mocha and @vscode/test-electron
- **Build System**: Webpack-based build with separate extension and webview bundles
- **TypeScript**: Full TypeScript support with strict mode
- **React Components**: Modern React with JSX support
- **Code Quality**: ESLint configuration and type checking

### Commands

- `aiGatewayToolkit.connect`: Connect to Azure API Management
- `aiGatewayToolkit.disconnect`: Disconnect from Azure services
- `aiGatewayToolkit.openAnalytics`: Open Analytics Dashboard
- `aiGatewayToolkit.openPlayground`: Open AI Playground
- `aiGatewayToolkit.refresh*`: Refresh various data sources
- `aiGatewayToolkit.createSubscription`: Create new APIM subscription
- `aiGatewayToolkit.copySubscriptionKey`: Copy subscription keys
- `aiGatewayToolkit.setWorkspaceId`: Configure Log Analytics workspace

### Technical Architecture

- **Extension Size**: ~1.03 MB packaged
- **Dependencies**: Azure SDK, React, Recharts, OpenAI SDK
- **Minimum VS Code**: ^1.104.0
- **Target Platforms**: Windows, macOS, Linux
