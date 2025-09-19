# Change Log

All notable changes to the "ai-gateway-toolkit" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.2.0] - 2025-09-19

### New Features

- **Playground Model Auto-Selection**: Enhanced playground experience with automatic model selection
  - **First Model Auto-Selection**: Automatically selects the first available model when playground opens
  - **Improved Model Selection UI**: Replaced text input with dropdown select for better discoverability
  - **Token Usage Display**: Shows model usage statistics in dropdown (e.g., "gpt-4 (1,234,567 tokens)")
  - **Consistent User Experience**: Aligns with existing auto-selection behavior for APIs and subscriptions

### User Experience Improvements

- **Reduced Manual Configuration**: Users can start testing immediately without manual model entry
- **Better Model Discoverability**: Dropdown interface shows all available models from Log Analytics
- **Enhanced Playground Workflow**: Streamlined model selection reduces friction in API testing
- **Fallback Behavior**: Graceful handling when models are not yet loaded or unavailable

### Technical Enhancements

- **Improved State Management**: Enhanced playground component state handling for model selection
- **Better Data Flow**: Optimized model data processing and automatic selection logic
- **UI Consistency**: Model selector now matches the design patterns of API and subscription selectors
- **Type Safety**: Enhanced TypeScript interfaces for model selection components

- **Analytics Dashboard Refresh Button**: Added dedicated refresh button (🔄) in analytics dashboard header
  - Manual refresh capability with current filter preservation
  - Loading state management with visual feedback
  - Optimal positioning to the left of filters toggle
- **Backend Management & Analytics**: New comprehensive backend management system
  - **Backends Tree Explorer**: Dedicated view for Azure backend services
  - **Backend Performance Metrics**: Token usage, latency, error rates per backend
  - **Backend Filtering**: Filter analytics by specific backend services
  - **Log Analytics Integration**: Real-time backend data from Log Analytics workspace

### Enhanced Authentication & Token Management

- **Advanced Token Refresh System**: Proactive token refresh 30 minutes before expiry
- **Dual-Token Architecture**: Separate management and logs tokens for optimal security
- **Automatic Retry Logic**: Intelligent retry on token expiry with exponential backoff
- **Error Recovery**: Graceful degradation and re-authentication on failures
- **Debug Tools**: New `Debug: Check Token Status` command for authentication troubleshooting

### Technical Improvements

- **Consolidated Azure Service**: Single `AzureService` class for all Azure operations
- **Enhanced Error Handling**: Comprehensive error recovery with context-aware retry logic
- **Build System Enhancements**: Dual webpack configuration for extension and webview components
- **Service Layer Refactoring**: Better separation of concerns and modularity
- **Performance Optimization**: Improved query construction and caching mechanisms

### User Experience Enhancements

- **Consistent Iconography**: Updated VS Code theme icons across all tree views
- **Better Context Menus**: Streamlined actions with appropriate icon placement
- **Enhanced Documentation**: Updated technical documentation with latest architecture
- **Improved Type Safety**: Better TypeScript interfaces and error handling

## [0.1.4] - 2025-09-17

### New Documentation

- **Comprehensive FAQ Documentation**: New `FAQ.md` with frequently asked questions
- **Support Documentation**: New `SUPPORT.md` with clear guidance
- **Technical Documentation**: New `docs/README.md` with comprehensive technical details

### Enhanced User Experience

- **Documentation Structure**: Better organized documentation hierarchy for different user types
- **User Support**: Multiple channels for getting help based on issue type
- **Developer Experience**: Comprehensive technical documentation for contributors
- **Community Resources**: Clear pathways for community engagement and contribution

### Documentation Improvements

- Enhanced project documentation organization
- Improved markdown formatting and consistency
- Better separation between user-facing and technical documentation
- Comprehensive troubleshooting and FAQ coverage

## [0.1.2] - 2025-09-17

### Added

- **Help & Feedback Tree Provider**: New always-visible tree view section with quick access to:
  - **Toolkit Overview**: Direct link to VS Code Marketplace extension page
  - **What's New**: Changelog and recent updates
  - **Q & A**: Community questions and answers section
  - **Rate & Review**: Extension rating and review interface
  - **AI Gateway Docs**: Official Azure AI Gateway documentation
  - **AI Gateway Labs**: Experimental features and labs
  - **AI Gateway Workshop**: Hands-on tutorials and workshops
- **External Link Support**: `openUrl` command for seamless web page navigation
- **Enhanced User Experience**: Professional icons and tooltips for all help items

### Technical Improvements

- New `HelpTreeProvider` class with structured help items management
- Integrated external link opening functionality
- Always-available help resources (works in both connected/disconnected states)
- Consistent VS Code theme icon usage (`info`, `history`, `question`, `star`, `book`, `beaker`, `mortar-board`)

## [0.1.1] - 2025-09-16

### Enhancements

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
