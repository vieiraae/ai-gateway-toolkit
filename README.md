# AI Gateway Toolkit

Connect to Azure API Management and manage AI/ML inference APIs with comprehensive analytics, playground, and configuration features.

## Features

### 🔗 Azure Connection
- Seamless integration with VS Code's built-in Microsoft authentication
- Connect to Azure API Management instances across tenants and subscriptions
- Automatic discovery of inference APIs

### 📊 Analytics Dashboard
- Real-time AI usage metrics and monitoring
- Interactive charts showing usage trends, token consumption, and latency
- Model performance analysis with success rates and error tracking
- Detailed request logs with drill-down capabilities
- Comprehensive filtering by API, subscription, model, region, and time range

### 🎮 Playground
- Interactive testing environment for inference APIs
- Support for streaming and non-streaming responses
- Request/response inspection with raw JSON views
- Azure API Management trace integration
- Conversation history and session management

### 🔧 API Management
- View and manage inference APIs
- Quick access to API documentation
- Context-aware analytics filtering

### 🔑 Subscription Management
- Create and manage API Management subscriptions
- Easy key copying with one-click access
- Subscription-specific analytics and playground access

### 🧠 Model Analytics
- Track model usage from Log Analytics
- Performance metrics and token consumption analysis
- Model comparison and optimization insights

## Getting Started

1. **Install the Extension**: Install AI Gateway Toolkit from the VS Code marketplace
2. **Connect to Azure**: Click the connect button in the AI Gateway Toolkit sidebar
3. **Authenticate**: Use your existing VS Code Microsoft authentication
4. **Select Resources**: Choose your tenant, subscription, and API Management service
5. **Start Exploring**: Use the analytics dashboard, playground, and management features

## Requirements

- VS Code version 1.104.0 or higher
- Azure subscription with API Management service
- Inference APIs configured in Azure API Management
- Log Analytics workspace connected to API Management (for analytics features)

## Configuration

The extension uses VS Code's built-in Microsoft authentication provider and requires the following Azure permissions:
- Read access to Azure subscriptions
- Read access to API Management services
- Read access to Log Analytics workspaces

## Usage

### Analytics Dashboard
- Access real-time metrics and usage trends
- Filter data by time range, API, subscription, model, or region
- Drill down into specific requests and responses
- Export data for further analysis

### Playground
- Select API, model, and subscription
- Configure streaming and tracing options
- Send test prompts and view responses
- Inspect raw requests, responses, and trace data

### API Management
- Browse available inference APIs
- Access API-specific analytics
- Open playground with pre-selected API

### Subscription Management
- View all API Management subscriptions
- Copy primary and secondary keys
- Create new subscriptions with custom scopes

## Support

For issues, feature requests, or contributions, please visit our [GitHub repository](https://github.com/vieiraae/ai-gateway-toolkit).

## License

This extension is licensed under the MIT License.
