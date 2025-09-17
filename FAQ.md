# AI Gateway Toolkit - Frequently Asked Questions (FAQ)

## General Questions

### Q: Is this extension provided by Microsoft?

**A:** No. The AI Gateway Toolkit is developed and maintained by the author (Alex Vieira) and is not an official Microsoft product — it is not provided, endorsed, or supported by Microsoft.

### Q: What is the AI Gateway Toolkit extension?

**A:** The AI Gateway Toolkit is a comprehensive VS Code extension that connects to Azure API Management (APIM) to provide analytics, playground testing, and management capabilities for AI/ML inference APIs. It offers real-time monitoring, interactive API testing, and detailed usage analytics for AI Gateway deployments.

### Q: What are the main features of this extension?

**A:** The extension includes:

- **Analytics Dashboard**: Real-time AI usage metrics with interactive charts and filtering
- **AI Playground**: Interactive testing environment for AI APIs
- **Tree View Explorers**: Organized navigation for APIs, subscriptions, models, and connections
- **Azure Integration**: Native authentication and seamless APIM connectivity
- **Help & Feedback**: Always-available support resources and documentation links

### Q: Is this extension free to use?

**A:** Yes, the AI Gateway Toolkit extension is completely free to use. However, you'll need valid Azure subscriptions and API Management services to connect to your AI resources.

## Installation & Setup

### Q: How do I install the AI Gateway Toolkit extension?

**A:** You can install it in several ways:

1. **VS Code Extensions View**: Search for "AI Gateway Toolkit" in the Extensions panel (Ctrl+Shift+X)
2. **Command Line**: Run `code --install-extension AlexVieira.ai-gateway-toolkit`
3. **Marketplace**: Visit the [VS Code Marketplace page](https://marketplace.visualstudio.com/items?itemName=AlexVieira.ai-gateway-toolkit)

### Q: What are the system requirements?

**A:**

- **VS Code Version**: 1.104.0 or later
- **Platforms**: Windows, macOS, Linux
- **Azure Requirements**: Valid Azure subscription with API Management service
- **Internet Connection**: Required for Azure authentication and data retrieval

### Q: How do I connect to Azure API Management?

**A:**

1. Open the AI Gateway Toolkit panel in VS Code
2. Click the "Connect to Azure API Management" button
3. Sign in with your Microsoft/Azure account
4. Select your tenant, subscription, and APIM service
5. The extension will automatically detect available APIs and workspaces

## Authentication & Permissions

### Q: What authentication method does the extension use?

**A:** The extension uses VS Code's built-in Microsoft authentication provider, leveraging the same secure authentication system used by other Microsoft extensions. No additional credentials or tokens are required.

### Q: What Azure permissions do I need?

**A:** You need the following permissions:

- **API Management**: Reader access to view APIs, operations, and subscriptions
- **API Management**: Contributor access to create subscriptions (optional)
- **Log Analytics**: Reader access to query usage metrics and logs
- **Azure Resource Manager**: Reader access to list subscriptions and resource groups

### Q: Can I use this extension with multiple Azure tenants?

**A:** Yes, you can switch between different Azure tenants and subscriptions using the connection management features in the extension.

## Features & Usage

### Q: How does the Analytics Dashboard work?

**A:** The Analytics Dashboard connects to your Azure Log Analytics workspace to retrieve AI usage metrics. It provides:

- Real-time KPIs (total requests, success rate, average latency, token usage)
- Interactive charts showing usage trends over time
- Multi-dimensional filtering by API, operation, subscription, model, region, and time
- Drill-down capabilities for detailed analysis
- Auto-refresh functionality with configurable intervals

### Q: What can I do in the AI Playground?

**A:** The AI Playground allows you to:

- Test AI inference APIs directly from VS Code
- Send custom prompts and payloads to your APIs
- View real-time responses and usage metrics
- Inspect request/response headers and timing
- Switch between different APIs and endpoints easily

### Q: How do I create new API subscriptions?

**A:** If you have contributor permissions:

1. Navigate to the Subscriptions tree view
2. Click the "Create Subscription" button
3. Provide a display name for the subscription
4. The extension will generate the subscription with primary and secondary keys
5. Use these keys for API authentication

### Q: Can I copy subscription keys?

**A:** Yes, you can easily copy subscription keys:

- Right-click on any subscription in the tree view
- Select "Copy Primary Key" or "Copy Secondary Key"
- The key will be copied to your clipboard for use in other applications

## Troubleshooting

### Q: The extension isn't connecting to Azure. What should I do?

**A:** Try these troubleshooting steps:

1. **Check Authentication**: Ensure you're signed in to the Microsoft account extension
2. **Verify Permissions**: Confirm you have at least Reader access to the APIM service
3. **Network Connection**: Ensure you have internet connectivity
4. **Reload VS Code**: Try reloading the window (Ctrl+Shift+P → "Developer: Reload Window")
5. **Check Extension Logs**: Open the Output panel and select "AI Gateway Toolkit" for error details

### Q: I can't see any data in the Analytics Dashboard. Why?

**A:** This could be due to:

- **Log Analytics Configuration**: Ensure your APIM service is configured to send logs to Log Analytics
- **Workspace Selection**: Verify you've selected the correct Log Analytics workspace
- **Data Availability**: Check if there's actual API usage data in the selected time range
- **Permissions**: Confirm you have Reader access to the Log Analytics workspace

### Q: The Playground shows "API not found" errors. How do I fix this?

**A:** Common solutions:

- **Refresh APIs**: Click the refresh button in the APIs tree view
- **Check API Status**: Ensure the API is published and available in APIM
- **Verify Subscription**: Confirm you have a valid subscription with access to the API
- **Network Issues**: Check if there are any network connectivity problems

### Q: How do I update my workspace ID for Log Analytics?

**A:** Use the command palette:

1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type "AI Gateway Toolkit: Set Workspace ID"
3. Enter your Log Analytics workspace ID
4. The extension will save this setting for future use

## Data & Privacy

### Q: What data does the extension collect?

**A:** The extension only accesses:

- Azure API Management metadata (APIs, operations, subscriptions)
- Log Analytics query results for usage metrics
- Authentication tokens (stored securely by VS Code)
- User preferences and workspace settings (stored locally)

### Q: Is my data stored outside of Azure?

**A:** No, all your Azure data remains within your Azure tenant. The extension only retrieves and displays data from your own Azure resources. No data is sent to external services.

### Q: Can I use this extension offline?

**A:** The extension requires internet connectivity to:

- Authenticate with Azure
- Retrieve API metadata and usage data
- Access help and documentation links

However, previously loaded data may be cached temporarily for improved performance.

## Support & Feedback

### Q: How do I report bugs or request features?

**A:** You can:

- **GitHub Issues**: Visit the [project repository](https://github.com/vieiraae/ai-gateway-toolkit) to file issues
- **VS Code Marketplace**: Use the Q&A section for questions or the Review section for feedback
- **Help & Feedback**: Use the built-in Help & Feedback tree view in the extension

### Q: How do I get help with Azure AI Gateway configuration?

**A:** For Azure-specific help:

- **AI Gateway Docs**: Access official documentation via the Help & Feedback section
- **AI Gateway Labs**: Explore experimental features and examples
- **AI Gateway Workshop**: Join hands-on tutorials and workshops
- **Azure Support**: Contact Azure support for service-specific issues

### Q: Is there a community for this extension?

**A:** Yes! You can:

- Join discussions in the VS Code Marketplace Q&A section
- Participate in Azure AI Gateway community forums
- Attend AI Gateway workshops and events
- Connect with other users through the GitHub repository

### Q: How often is the extension updated?

**A:** The extension follows semantic versioning and is updated regularly with:

- **Patch releases** (0.1.x): Bug fixes and minor improvements
- **Minor releases** (0.x.0): New features and enhancements
- **Major releases** (x.0.0): Significant changes and breaking updates

Check the [changelog](https://marketplace.visualstudio.com/items/AlexVieira.ai-gateway-toolkit/changelog) for the latest updates.

## Advanced Usage

### Q: Can I customize the dashboard filters and time ranges?

**A:** Yes, the Analytics Dashboard supports:

- **Multi-select filters**: API ID, Operation ID, Subscription Name, Backend Host, Model Name, Region
- **Flexible time ranges**: Last hour, 24 hours, 7 days, 30 days, or custom ranges
- **Persistent settings**: Your filter preferences are saved between sessions
- **Real-time updates**: Auto-refresh with configurable intervals (30s, 1m, 5m, 15m)

### Q: How do I drill down into specific API usage patterns?

**A:** Use the drill-down features:

1. Click on specific data points in charts to filter results
2. Use the correlation logs to see detailed request information
3. Apply multiple filters simultaneously for precise analysis
4. Export data for external analysis (planned feature)

### Q: Can I integrate this extension with CI/CD pipelines?

**A:** While direct CI/CD integration isn't currently available, you can:

- Use the extension for manual testing and validation
- Monitor deployment success through the analytics dashboard
- Validate API availability before releases
- Track usage patterns after deployments

---

*This FAQ is regularly updated. For the most current information, please check the [extension's marketplace page](https://marketplace.visualstudio.com/items?itemName=AlexVieira.ai-gateway-toolkit) or the Help & Feedback section within VS Code.*