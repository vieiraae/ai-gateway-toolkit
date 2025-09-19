# AI Gateway Toolkit - Technical Documentation

## Project Overview

The AI Gateway Toolkit is a comprehensive VS Code extension that provides analytics, playground testing, and management capabilities for AI/ML inference APIs through Azure API Management (APIM). This document describes the technical architecture, project structure, and implementation details.

## Architecture Overview

The extension follows a modular architecture with clear separation of concerns:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VS Code UI    │    │   Azure APIs    │    │ Log Analytics   │
│  (Tree Views,   │◄──►│     (APIM)      │    │   Workspace     │
│   Webviews)     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Extension Host                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Tree Providers│  │   Services    │  │   Authentication  │   │
│  │               │  │               │  │                   │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```text
ai-gateway-toolkit/
├── src/                           # TypeScript source code
│   ├── auth/                      # Authentication and Azure integration
│   │   ├── azureContextManager.ts # Manages Azure context state
│   │   └── vscodeAzureCredential.ts # VS Code Azure auth provider
│   ├── providers/                 # Tree data providers for VS Code
│   │   ├── apisTreeProvider.ts    # APIs tree view
│   │   ├── backendsTreeProvider.ts # Backends tree view
│   │   ├── connectionsTreeProvider.ts # Connections management
│   │   ├── helpTreeProvider.ts    # Help & Feedback resources
│   │   ├── modelsTreeProvider.ts  # Models tree view
│   │   └── subscriptionsTreeProvider.ts # Subscriptions tree view
│   ├── services/                  # Core business logic services
│   │   ├── azureService.ts        # Azure SDK integration & authentication
│   │   ├── webviewService.ts      # Webview panel management
│   │   └── logAnalyticsQueryService.ts # Log Analytics queries
│   ├── utils/                     # Utility functions and helpers
│   │   ├── errorHandler.ts        # Centralized error handling
│   │   ├── filterUtils.ts         # Query filter utilities
│   │   └── kustoQueryBuilder.ts   # Kusto query construction
│   ├── webview/                   # Webview panel implementations
│   │   ├── dashboardPanel.ts      # Analytics dashboard
│   │   └── playgroundPanel.ts     # AI testing playground
│   └── extension.ts               # Main extension entry point
├── webview-ui/                    # React frontend for webviews
│   ├── src/
│   │   ├── analytics/             # Analytics dashboard components
│   │   │   ├── components/        # React components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── services/          # Frontend service layer
│   │   │   ├── types/             # TypeScript type definitions
│   │   │   └── analytics.tsx      # Main analytics app
│   │   └── playground/            # Playground components
│   │       ├── components/        # React components
│   │       ├── hooks/             # Custom React hooks
│   │       ├── services/          # Frontend service layer
│   │       ├── types/             # TypeScript type definitions
│   │       └── playground.tsx     # Main playground app
│   ├── package.json               # Frontend dependencies
│   └── webpack.config.js          # Frontend build configuration
├── docs/                          # Technical documentation
│   └── README.md                  # This file
├── test/                          # Test suites
│   ├── suite/                     # Extension test suites
│   └── runTest.ts                 # Test runner configuration
├── out/                           # Compiled JavaScript output
├── dist/                          # Built webview assets
├── package.json                   # Extension manifest and dependencies
├── tsconfig.json                  # TypeScript configuration
├── webpack.config.js              # Extension build configuration
├── CHANGELOG.md                   # Version history
├── FAQ.md                         # Frequently asked questions
├── SUPPORT.md                     # Support and contribution guidelines
└── README.md                      # User-facing documentation
```

## Core Components

### 1. Authentication System

#### VSCodeAzureSessionCredential (`src/auth/vscodeAzureCredential.ts`)

- Integrates with VS Code's built-in Microsoft authentication
- Implements Azure Identity's `TokenCredential` interface
- Handles token acquisition and refresh automatically
- No additional user credentials required

#### AzureContextManager (`src/auth/azureContextManager.ts`)

- Manages Azure tenant, subscription, and service selection
- Persists user preferences in VS Code workspace state
- Provides context switching capabilities
- Handles workspace ID configuration for Log Analytics

### 2. Service Layer

#### AzureService (`src/services/azureService.ts`)

- **Unified Azure SDK Integration**: Centralized service for all Azure operations
- **Advanced Token Management**: 
  - Automatic token refresh with intelligent retry logic
  - Dual-token system for management and logs operations
  - Token expiry detection and proactive refresh (30-minute refresh window)
  - Error recovery with automatic re-authentication
- **API Management Operations**:
  - Listing APIs, subscriptions, and backends
  - Subscription creation and key management
  - APIM gateway URL detection and configuration
- **Log Analytics Integration**:
  - Kusto query execution with resource-specific tokens
  - Multi-dimensional analytics (models, backends, usage trends)
  - Support for custom time ranges and filtering
- **Enhanced Error Handling**: Automatic retry on token expiry with exponential backoff
- **Debug Capabilities**: Token status inspection and authentication troubleshooting

#### WebviewService (`src/services/webviewService.ts`)

- **React Webview Management**: Creates and manages webview panels for analytics and playground
- **Message Handling**: Bidirectional communication between extension and React components
- **HTML Generation**: Dynamic HTML generation with CSP-compliant script injection
- **Resource Management**: Proper cleanup and lifecycle management of webview resources

#### LogAnalyticsQueryService (`src/services/logAnalyticsQueryService.ts`)

- Constructs and executes Kusto queries against Log Analytics
- Features:
  - Query sanitization and validation
  - Rate limiting and request queuing
  - Abort signal support for cancellation
  - Dimension value extraction
  - Correlation log retrieval
- Integrates with KustoQueryBuilder for complex query construction

### 3. Tree Data Providers

All tree providers implement VS Code's `TreeDataProvider<T>` interface:

#### ApisTreeProvider (`src/providers/apisTreeProvider.ts`)
- Displays available APIs from APIM
- Hierarchical view: API → Operations
- Context menu actions for opening dashboard/playground
- Refresh capability with loading states

#### SubscriptionsTreeProvider (`src/providers/subscriptionsTreeProvider.ts`)
- Shows APIM subscriptions
- Actions: Create subscription, copy keys, view details
- Real-time updates when subscriptions change

#### BackendsTreeProvider (`src/providers/backendsTreeProvider.ts`)

- Displays Azure backends from Log Analytics data
- Shows backend performance metrics and token usage
- Context menu actions for opening analytics dashboard
- Real-time updates with refresh capabilities

#### ModelsTreeProvider (`src/providers/modelsTreeProvider.ts`)

- Displays detected AI models from usage data
- Groups by model family and version
- Usage statistics integration

#### HelpTreeProvider (`src/providers/helpTreeProvider.ts`)
- Always-available help resources
- Links to documentation, Q&A, workshops
- VS Code theme icon integration

### 4. Webview Panels

#### DashboardPanel (`src/webview/dashboardPanel.ts`)
- Analytics dashboard implementation
- React webview integration
- Message passing for data requests
- State management for filters and refresh

#### PlaygroundPanel (`src/webview/playgroundPanel.ts`)
- AI testing interface
- Request/response handling
- API endpoint switching
- Usage metrics display

### 5. Frontend Architecture (React)

The webview frontend is built with React and TypeScript:

#### Analytics Dashboard (`webview-ui/src/analytics/`)
- **Components**: Reusable UI components (charts, filters, KPIs)
- **Hooks**: Custom hooks for data fetching and state management
- **Services**: API communication with extension backend
- **Types**: TypeScript interfaces for type safety

#### Playground (`webview-ui/src/playground/`)
- **Components**: Prompt input, response display, API selector
- **Hooks**: Request handling, streaming support preparation
- **Services**: Inference API communication
- **Types**: Request/response type definitions

## Technical Implementation Details

### Message Passing Architecture

Communication between the extension and webviews uses VS Code's message passing API:

```typescript
// Extension to Webview
webview.postMessage({
    command: 'updateData',
    data: analyticsData
});

// Webview to Extension
vscode.postMessage({
    command: 'executeQuery',
    filters: selectedFilters
});
```

### State Management

- **Extension State**: VS Code's `ExtensionContext.globalState` and `workspaceState`
- **Webview State**: React's `useState` and `useContext` hooks
- **Cache Management**: TTL-based caching for API responses
- **Filter Persistence**: User preferences saved between sessions

### Error Handling Strategy

Centralized error handling through `ErrorHandler` utility:

```typescript
try {
    const result = await apiCall();
    return result;
} catch (error) {
    ErrorHandler.handleError(error, 'Failed to load APIs');
    throw error;
}
```

Features:
- User-friendly error messages
- Logging for debugging
- Retry mechanisms for transient failures
- Graceful degradation

### Build System

#### Extension Build (`webpack.config.js`)
- TypeScript compilation
- Node.js target for extension host
- Source maps for debugging
- Production optimizations

#### Webview Build (`webview-ui/webpack.config.js`)
- React/TypeScript compilation
- Browser target for webview context
- CSS processing and optimization
- Asset bundling and optimization

### Testing Strategy

#### Unit Tests (`test/suite/`)
- Mocha test framework
- Mock Azure services for isolated testing
- KustoQueryBuilder validation
- Filter utility testing

#### Integration Tests
- VS Code extension test harness
- End-to-end workflow validation
- Authentication flow testing

## Development Workflow

### Prerequisites
- Node.js 18+
- VS Code with latest version
- Azure subscription with APIM service
- TypeScript knowledge

### Setup
```bash
# Install dependencies
npm install

# Install webview dependencies
cd webview-ui && npm install && cd ..

# Compile extension
npm run compile

# Build webviews
npm run build:webview

# Run tests
npm test
```

### Debugging
- F5 in VS Code launches Extension Development Host
- Webview debugging via VS Code Developer Tools
- Extension logs in Output panel

### Publishing
```bash
# Package extension
npx vsce package

# Publish to marketplace
npx vsce publish
```

## Configuration

### VS Code Extension Settings
- `aiGatewayToolkit.workspaceId`: Log Analytics workspace ID
- `aiGatewayToolkit.autoRefresh`: Dashboard auto-refresh interval
- `aiGatewayToolkit.defaultTimeRange`: Default analytics time range

### Azure Requirements
- **API Management**: Reader access minimum, Contributor for subscription management
- **Log Analytics**: Reader access for query execution
- **Azure Resource Manager**: Subscription and resource group access

## Performance Considerations

### Caching Strategy
- API responses cached with TTL
- Dimension values cached to reduce queries
- User preferences persisted locally

### Query Optimization
- Efficient Kusto query construction
- Result pagination for large datasets
- Request deduplication and batching

### Resource Management
- Webview lifecycle management
- Memory cleanup on disposal
- Abort signals for cancelled operations

## Security

### Authentication
- No stored credentials
- VS Code's secure token storage
- Automatic token refresh

### Data Handling
- No data leaves Azure tenant
- Queries executed in user's Log Analytics workspace
- Secure message passing between components

## Latest Features & Improvements (v0.1.4+)

### New Analytics Dashboard Features

#### Refresh Button Functionality
- **Manual Refresh**: Dedicated refresh button (🔄) in analytics dashboard header
- **Current Filter Preservation**: Refresh uses currently selected filters without resetting state
- **Loading State Management**: Visual feedback during refresh operations
- **Intelligent Positioning**: Located to the left of filters toggle for optimal workflow

#### Backend Analytics & Management
- **Backends Tree Explorer**: New dedicated view for Azure backend services
- **Backend Performance Metrics**: Token usage, latency, error rates per backend
- **Backend Filtering**: Filter analytics by specific backend services
- **Log Analytics Integration**: Real-time backend data from Log Analytics workspace

### Enhanced Authentication & Token Management

#### Advanced Token Refresh System
- **Proactive Token Refresh**: Automatic refresh 30 minutes before expiry
- **Dual-Token Architecture**: Separate management and logs tokens for optimal security
- **Automatic Retry Logic**: Intelligent retry on token expiry with exponential backoff
- **Error Recovery**: Graceful degradation and re-authentication on failures

#### Debug & Troubleshooting Tools
- **Token Status Command**: `Debug: Check Token Status` for authentication troubleshooting
- **Token Expiry Monitoring**: Real-time token status with expiry timestamps
- **Session Management**: Improved VS Code authentication session handling
- **Tenant-Specific Tokens**: Optimized for multi-tenant scenarios

### Architecture Improvements

#### Build System Enhancements
- **Dual Webpack Configuration**: Separate builds for extension and webview components
- **Automated Webview Compilation**: `npm run build:webview` for React component builds
- **Source Map Support**: Enhanced debugging with complete source map coverage
- **Asset Optimization**: Improved bundle sizes and loading performance

#### Service Layer Refactoring  
- **Consolidated Azure Service**: Single `AzureService` class for all Azure operations
- **Enhanced Error Handling**: Comprehensive error recovery with context-aware retry logic
- **Resource Management**: Improved cleanup and lifecycle management
- **Query Optimization**: Better Kusto query construction with performance improvements

### User Experience Enhancements

#### Tree View Improvements
- **Consistent Iconography**: Updated VS Code theme icons across all tree views
- **Better Context Menus**: Streamlined actions with appropriate icon placement
- **Performance Optimization**: Faster loading with intelligent caching
- **Error State Handling**: Graceful fallbacks when services are unavailable

#### Developer Experience
- **Comprehensive Documentation**: Updated technical docs with latest architecture
- **Enhanced Debugging**: Better logging and error reporting throughout the codebase
- **Type Safety**: Improved TypeScript interfaces and error handling
- **Code Organization**: Better separation of concerns and modularity

## Future Enhancements

### Planned Features
- Streaming response support in playground
- Export capabilities for analytics data
- Custom dashboard layouts
- Advanced alerting integration

### Architecture Improvements
- Plugin system for custom visualizations
- Offline mode with cached data
- Multi-workspace support
- Enhanced error recovery

## Contributing

See [SUPPORT.md](../SUPPORT.md) for contribution guidelines and support information.

## Troubleshooting

### Common Issues
1. **Authentication failures**: Check VS Code Microsoft account extension
2. **No data in dashboard**: Verify Log Analytics workspace configuration
3. **API not found errors**: Ensure APIM service is properly configured
4. **Performance issues**: Check network connectivity and query complexity

### Debugging Tips
- Enable extension development mode
- Check VS Code Output panel for logs
- Use browser developer tools for webview debugging
- Monitor Azure resource access permissions

---

*This technical documentation is maintained alongside the codebase. For user-facing documentation, see the main [README.md](../README.md).*