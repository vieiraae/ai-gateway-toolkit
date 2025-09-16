import * as vscode from 'vscode';
import * as path from 'path';
import https from 'https';
import http from 'http';
import { WebviewMessage, AnalyticsFilters } from '../types';
import { AzureService } from './azureService';
import { AzureOpenAI } from 'openai';

export class WebviewService {
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private extensionUri: vscode.Uri, private azureService: AzureService) {}

    createAnalyticsPanel(): vscode.WebviewPanel {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const panel = vscode.window.createWebviewPanel(
            'aiGatewayAnalytics',
            'AI Gateway Analytics',
            columnToShowIn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, 'dist'),
                    vscode.Uri.joinPath(this.extensionUri, 'resources')
                ]
            }
        );

        panel.webview.html = this.getAnalyticsHtml(panel.webview);
        panel.iconPath = {
            light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'analytics.svg'),
            dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'analytics.svg')
        };

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => {
                this.handleAnalyticsMessage(message, panel);
            },
            undefined
        );

        panel.onDidDispose(() => {
            this.panels.delete('analytics');
        });

        this.panels.set('analytics', panel);
        return panel;
    }

    createPlaygroundPanel(): vscode.WebviewPanel {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const panel = vscode.window.createWebviewPanel(
            'aiGatewayPlayground',
            'AI Gateway Playground',
            columnToShowIn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, 'dist'),
                    vscode.Uri.joinPath(this.extensionUri, 'resources')
                ],
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getPlaygroundHtml(panel.webview);
        panel.iconPath = {
            light: vscode.Uri.joinPath(this.extensionUri, 'resources', 'playground.svg'),
            dark: vscode.Uri.joinPath(this.extensionUri, 'resources', 'playground.svg')
        };

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => {
                this.handlePlaygroundMessage(message, panel);
            },
            undefined
        );

        panel.onDidDispose(() => {
            this.panels.delete('playground');
        });

        this.panels.set('playground', panel);
        return panel;
    }

    getPanel(type: string): vscode.WebviewPanel | undefined {
        return this.panels.get(type);
    }

    sendMessageToPanel(type: string, message: WebviewMessage): void {
        const panel = this.panels.get(type);
        if (panel) {
            panel.webview.postMessage(message);
        }
    }

    private getAnalyticsHtml(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'analytics.js')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource};">
                <title>AI Gateway Analytics</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                <div id="analytics-root"></div>
                <script>
                    // Make VS Code API available globally
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                </script>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private getPlaygroundHtml(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'playground.js')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource};">
                <title>AI Gateway Playground</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        overflow: hidden;
                    }
                    
                    .playground-container {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                        box-sizing: border-box;
                    }
                    
                    .playground-header {
                        flex-shrink: 0;
                        margin-bottom: 20px;
                    }
                    
                    .playground-header h1 {
                        margin: 0 0 20px 0;
                        color: var(--vscode-foreground);
                        font-size: 24px;
                    }
                    
                    .config-section {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 16px;
                        margin-bottom: 20px;
                    }
                    
                    .config-row {
                        display: flex;
                        gap: 16px;
                        margin-bottom: 16px;
                        flex-wrap: wrap;
                    }
                    
                    .config-row:last-child {
                        margin-bottom: 0;
                    }
                    
                    .config-group {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        min-width: 200px;
                        flex: 1;
                    }
                    
                    .config-group.full-width {
                        min-width: 100%;
                    }
                    
                    .config-group label {
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .config-group select,
                    .config-group input,
                    .config-group textarea {
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 2px;
                        padding: 6px 8px;
                        font-size: 13px;
                        font-family: var(--vscode-font-family);
                    }
                    
                    .config-group select:focus,
                    .config-group input:focus,
                    .config-group textarea:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .conversation-area {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        min-height: 0;
                    }
                    
                    .messages-container {
                        flex: 1;
                        overflow-y: auto;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 16px;
                        margin-bottom: 16px;
                        background: var(--vscode-editor-background);
                    }
                    
                    .empty-state {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        padding: 40px 20px;
                    }
                    
                    .message {
                        margin-bottom: 16px;
                        padding: 12px;
                        border-radius: 4px;
                        border-left: 3px solid;
                    }
                    
                    .message.user {
                        background: var(--vscode-input-background);
                        border-left-color: var(--vscode-button-background);
                    }
                    
                    .message.assistant {
                        background: var(--vscode-editor-background);
                        border-left-color: var(--vscode-notificationsInfoIcon-foreground);
                    }
                    
                    .message-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    
                    .message-type {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .message-timestamp {
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .message-content pre {
                        margin: 0;
                        white-space: pre-wrap;
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                        line-height: 1.4;
                    }
                    
                    .input-area {
                        flex-shrink: 0;
                    }
                    
                    .input-container {
                        display: flex;
                        gap: 12px;
                        align-items: flex-end;
                    }
                    
                    .input-container textarea {
                        flex: 1;
                        min-height: 60px;
                        resize: vertical;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 8px 12px;
                        font-family: var(--vscode-font-family);
                        font-size: 13px;
                    }
                    
                    .input-container textarea:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .send-button,
                    .clear-button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        cursor: pointer;
                        font-size: 13px;
                        font-family: var(--vscode-font-family);
                    }
                    
                    .send-button:hover,
                    .clear-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .send-button:disabled {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        cursor: not-allowed;
                    }
                    
                    .loading-dots {
                        display: inline-flex;
                        gap: 4px;
                    }
                    
                    .loading-dots span {
                        width: 4px;
                        height: 4px;
                        border-radius: 50%;
                        background: var(--vscode-foreground);
                        animation: loading 1.4s infinite ease-in-out;
                    }
                    
                    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
                    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
                    
                    @keyframes loading {
                        0%, 80%, 100% { opacity: 0.3; }
                        40% { opacity: 1; }
                    }
                </style>
            </head>
            <body>
                <div id="playground-root"></div>
                <script>
                    // Make VS Code API available globally
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                </script>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private handleAnalyticsMessage(message: WebviewMessage, panel: vscode.WebviewPanel): void {
        switch (message.type) {
            case 'getAnalyticsData':
                // Handle analytics data request
                this.sendAnalyticsData(panel, message.data);
                break;
            case 'getFilterOptions':
                // Handle filter options request
                this.sendFilterOptions(panel);
                break;
            case 'exportData':
                this.exportAnalyticsData(message.data);
                break;
            case 'setFilters':
                // Handle pre-setting of filters for specific API, subscription, or model
                panel.webview.postMessage({
                    type: 'setFilters',
                    data: message.data
                });
                break;
            default:
                console.log('Unknown analytics message type:', message.type);
        }
    }

    private handlePlaygroundMessage(message: WebviewMessage, panel: vscode.WebviewPanel): void {
        switch (message.type) {
            case 'sendMessage':
                // Handle playground message request
                this.sendPlaygroundMessage(panel, message.data);
                break;
            case 'getApis':
                this.sendApisToPlayground(panel);
                break;
            case 'getSubscriptions':
                this.sendSubscriptionsToPlayground(panel);
                break;
            case 'getModels':
                this.sendModelsToPlayground(panel);
                break;
            case 'setSelection':
                // Handle pre-selection of API, subscription, or model
                panel.webview.postMessage({
                    type: 'setSelection',
                    data: message.data
                });
                break;
            default:
                console.log('Unknown playground message type:', message.type);
        }
    }

    private async sendAnalyticsData(panel: vscode.WebviewPanel, filters: any): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            // Convert filters to proper format
            const analyticsFilters: AnalyticsFilters = {
                timeRange: {
                    start: filters.timeRange?.start ? new Date(filters.timeRange.start) : new Date(Date.now() - 30 * 60 * 1000),
                    end: filters.timeRange?.end ? new Date(filters.timeRange.end) : new Date()
                },
                apiIds: filters.apiIds,
                subscriptionNames: filters.subscriptionNames,
                modelNames: filters.modelNames
            };

            // Get real data from Azure services
            const [summary, models, logs, usageTrend] = await Promise.all([
                this.azureService.getAnalyticsSummary(analyticsFilters),
                this.azureService.getModelsFromLogs(analyticsFilters),
                this.azureService.getLogs(analyticsFilters, 50),
                this.azureService.getUsageTrend(analyticsFilters)
            ]);

            // Build model usage chart data
            const modelUsage = models.map((model, index) => ({
                name: model.modelName,
                value: model.totalTokens,
                color: this.getModelColor(index)
            }));

            // Build top models data
            const topModels = models.map(model => ({
                model: model.modelName,
                totalTokens: model.totalTokens,
                avgLatency: model.averageLatency,
                errorRate: model.errorRate,
                successRate: model.successRate
            }));

            // Convert logs to the expected format
            const formattedLogs = logs.map(log => ({
                timestamp: log.timestamp.toISOString(),
                correlationId: log.correlationId,
                api: log.apiName,
                model: log.modelName,
                region: log.region,
                subscription: log.subscriptionName,
                backend: log.backend,
                promptTokens: log.promptTokens,
                completionTokens: log.completionTokens,
                promptRequest: log.promptRequest,
                completionResponse: log.completionResponse,
                streamed: log.streamed,
                statusCode: log.statusCode
            }));

            const analyticsData = {
                summary,
                usageTrend,
                modelUsage,
                topModels,
                logs: formattedLogs
            };

            panel.webview.postMessage({
                type: 'analyticsData',
                data: analyticsData
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to fetch analytics data: ${error}` }
            });
        }
    }

    private getModelColor(index: number): string {
        const colors = ['#0078d4', '#00bcf2', '#40e0d0', '#ff6b35', '#f7931e', '#8b5cf6', '#06d6a0', '#ef476f'];
        return colors[index % colors.length];
    }

    private async sendPlaygroundMessage(panel: vscode.WebviewPanel, messageData: any): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            const { sdk, apiId, modelName, subscriptionId, apiVersion, inferenceApiType, stream, trace, instructions, prompt } = messageData;
            
            // Get the API details to find the gateway URL
            const apis = await this.azureService.getApis();
            const selectedApi = apis.find(api => api.id === apiId);
            
            if (!selectedApi) {
                throw new Error(`API with ID ${apiId} not found`);
            }

            // Get subscription key for authentication
            const subscriptions = await this.azureService.getSubscriptions();
            const selectedSubscription = subscriptions.find(sub => sub.id === subscriptionId);
            
            if (!selectedSubscription) {
                throw new Error(`Subscription with ID ${subscriptionId} not found`);
            }

            // Extract gateway URLs and subscription key
            const fullGatewayUrl = this.extractGatewayUrl(selectedApi);
            const baseGatewayUrl = this.extractBaseGatewayUrl(selectedApi);
            const subscriptionKey = this.extractSubscriptionKey(selectedSubscription);

            if (!fullGatewayUrl) {
                throw new Error('Gateway URL not found for the selected API');
            }

            if (!subscriptionKey) {
                throw new Error('Subscription key not found for the selected subscription');
            }

            console.log(`[Playground] Making API call with SDK: ${sdk}`);
            console.log(`[Playground] Full Gateway URL: ${fullGatewayUrl}`);
            console.log(`[Playground] Base Gateway URL: ${baseGatewayUrl}`);
            console.log(`[Playground] Model: ${modelName}`);

            // Make the API call based on the selected SDK
            const startTime = Date.now();
            let response: any;

            switch (sdk) {
                case 'azure-openai':
                    // Azure OpenAI SDK expects base endpoint URL
                    response = await this.makeAzureOpenAIRequest(fullGatewayUrl, subscriptionKey, modelName, prompt, instructions, stream, apiVersion, inferenceApiType);
                    break;
                case 'azure-ai-inference':
                    // Azure AI Inference uses full gateway URL with endpoint path
                    response = await this.makeAzureAIInferenceRequest(fullGatewayUrl, subscriptionKey, modelName, prompt, instructions, stream);
                    break;
                case 'openai-compatible':
                    // OpenAI compatible uses full gateway URL with endpoint path
                    response = await this.makeOpenAICompatibleRequest(fullGatewayUrl, subscriptionKey, modelName, prompt, instructions, stream);
                    break;
                default:
                    throw new Error(`Unsupported SDK: ${sdk}`);
            }

            const endTime = Date.now();
            const latency = endTime - startTime;

            // Send response back to playground
            panel.webview.postMessage({
                type: 'messageResponse',
                data: {
                    content: response.choices[0].message.content,
                    tokens: response.usage,
                    latency: latency,
                    rawRequest: undefined,
                    rawResponse: JSON.stringify(response, null, 2),
                    traceInfo: trace ? response.traceInfo : undefined
                }
            });

        } catch (error) {
            console.error('[Playground] Error sending message:', error);
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to send message: ${error}` }
            });
        }
    }

    private async sendApisToPlayground(panel: vscode.WebviewPanel): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            const apis = await this.azureService.getApis();
            const formattedApis = apis.map(api => ({
                id: api.id,
                name: api.name,
                displayName: api.displayName
            }));

            panel.webview.postMessage({
                type: 'apisData',
                data: formattedApis
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to fetch APIs: ${error}` }
            });
        }
    }

    private async sendSubscriptionsToPlayground(panel: vscode.WebviewPanel): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            const subscriptions = await this.azureService.getSubscriptions();
            const formattedSubscriptions = subscriptions.map(sub => ({
                id: sub.id,
                name: sub.name,
                displayName: sub.displayName
            }));

            panel.webview.postMessage({
                type: 'subscriptionsData',
                data: formattedSubscriptions
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to fetch subscriptions: ${error}` }
            });
        }
    }

    private async sendModelsToPlayground(panel: vscode.WebviewPanel): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            const models = await this.azureService.getModelsFromLogs();
            const formattedModels = models.map(model => ({
                modelName: model.modelName,
                displayName: model.modelName, // Using modelName as displayName since ModelUsage doesn't have displayName
                usage: model.totalTokens
            }));

            panel.webview.postMessage({
                type: 'modelsData',
                data: formattedModels
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to fetch models: ${error}` }
            });
        }
    }

    private async sendFilterOptions(panel: vscode.WebviewPanel): Promise<void> {
        try {
            if (!this.azureService.isConnected()) {
                throw new Error('Not connected to Azure API Management');
            }

            // Get filter options from Azure services
            const [apis, subscriptions, models] = await Promise.all([
                this.azureService.getApis(),
                this.azureService.getSubscriptions(),
                this.azureService.getModelsFromLogs()
            ]);

            // Extract unique values for each filter type
            const filterOptions = {
                apiIds: apis.map(api => api.id),
                operationIds: [] as string[], // Would need to be populated from API operations
                subscriptionNames: subscriptions.map(sub => sub.name),
                backends: [] as string[], // Would need to be populated from backend services  
                modelNames: models.map(model => model.modelName),
                regions: [] as string[] // Would be extracted from logs analysis
            };

            // Try to get additional filter options from recent logs if available
            try {
                const recentLogs = await this.azureService.getLogs({
                    timeRange: {
                        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        end: new Date()
                    }
                }, 1000); // Get more logs for better filter data

                // Extract unique regions from logs
                const uniqueRegions = [...new Set(recentLogs
                    .map(log => log.region)
                    .filter(region => region && region.trim() !== ''))];
                
                // Extract unique backends from logs
                const uniqueBackends = [...new Set(recentLogs
                    .map(log => log.backend)
                    .filter(backend => backend && backend.trim() !== ''))];

                // Extract unique API names from logs (using as operation IDs for now)
                const uniqueApiNames = [...new Set(recentLogs
                    .map(log => log.apiName)
                    .filter(apiName => apiName && apiName.trim() !== ''))];

                filterOptions.regions = uniqueRegions;
                filterOptions.backends = uniqueBackends;
                filterOptions.operationIds = uniqueApiNames;
                
            } catch (logsError) {
                console.warn('Could not fetch logs for additional filter options:', logsError);
                // Fallback to common values if logs are unavailable
                filterOptions.regions = [
                    'eastus', 'eastus2', 'westus', 'westus2', 'westus3',
                    'centralus', 'northcentralus', 'southcentralus',
                    'westeurope', 'northeurope', 'uksouth', 'ukwest',
                    'japaneast', 'japanwest', 'australiaeast', 'australiasoutheast'
                ];
                filterOptions.backends = [
                    'openai-eastus', 'openai-westus', 'openai-europe',
                    'azure-openai-eastus', 'azure-openai-westus'
                ];
            }

            panel.webview.postMessage({
                type: 'filterOptions',
                data: filterOptions
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                data: { message: `Failed to fetch filter options: ${error}` }
            });
        }
    }

    private async exportAnalyticsData(data: any): Promise<void> {
        try {
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('analytics-export.json'),
                filters: {
                    'JSON': ['json'],
                    'CSV': ['csv']
                }
            });

            if (uri) {
                const content = JSON.stringify(data, null, 2);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage('Analytics data exported successfully');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export data: ${error}`);
        }
    }

    // Helper methods for API gateway extraction
    private extractGatewayUrl(api: any): string | null {
        try {
            // Priority 1: Use the constructed APIM gateway URL (most reliable from REST API)
            if (api.gatewayUrl) {
                console.log('[Playground] Using API Management REST API gateway URL:', api.gatewayUrl);
                return api.gatewayUrl;
            }
            
            // Priority 2: Use connection's actual gateway URL + API path
            const connection = this.azureService.getConnection();
            if (connection?.gatewayUrl && api.path) {
                const fullUrl = `${connection.gatewayUrl}${api.path}`;
                console.log('[Playground] Using connection gateway URL + API path:', fullUrl);
                return fullUrl;
            }
            
            // Priority 3: If we have the service name and path, construct it manually
            if (api.serviceName && api.path) {
                const constructedUrl = `https://${api.serviceName}.azure-api.net${api.path}`;
                console.log('[Playground] Constructed gateway URL from service name:', constructedUrl);
                return constructedUrl;
            }
            
            // Priority 4: Use connection's service name if available
            if (connection?.serviceName && api.path) {
                const constructedUrl = `https://${connection.serviceName}.azure-api.net${api.path}`;
                console.log('[Playground] Constructed gateway URL from connection:', constructedUrl);
                return constructedUrl;
            }
            
            // Priority 5: Backend service URL (less reliable for API Management calls)
            if (api.serviceUrl) {
                console.log('[Playground] Using backend service URL:', api.serviceUrl);
                return api.serviceUrl;
            }
            
            // Priority 6: Alternative paths where gateway URL might be stored
            if (api.properties?.serviceUrl) {
                return api.properties.serviceUrl;
            }
            
            console.log('[Playground] No valid gateway URL found. API object structure:', JSON.stringify(api, null, 2));
            return null;
        } catch (error) {
            console.error('[Playground] Error extracting gateway URL:', error);
            return null;
        }
    }

    private extractBaseGatewayUrl(api: any): string | null {
        try {
            // Priority 1: Use the base gateway URL if available from API
            if (api.baseGatewayUrl) {
                console.log('[Playground] Using API base gateway URL:', api.baseGatewayUrl);
                return api.baseGatewayUrl;
            }
            
            // Priority 2: Use connection's actual gateway URL (from REST API)
            const connection = this.azureService.getConnection();
            if (connection?.gatewayUrl) {
                console.log('[Playground] Using connection gateway URL as base:', connection.gatewayUrl);
                return connection.gatewayUrl;
            }
            
            // Priority 3: Extract base URL from full gateway URL
            if (api.gatewayUrl) {
                try {
                    const url = new URL(api.gatewayUrl);
                    const baseUrl = `${url.protocol}//${url.host}`;
                    console.log('[Playground] Extracted base URL from API gateway URL:', baseUrl);
                    return baseUrl;
                } catch (urlError) {
                    console.error('[Playground] Failed to parse gateway URL:', urlError);
                }
            }
            
            // Priority 4: Construct from connection service name
            if (connection?.serviceName) {
                const constructedUrl = `https://${connection.serviceName}.azure-api.net`;
                console.log('[Playground] Constructed base URL from connection service name:', constructedUrl);
                return constructedUrl;
            }
            
            console.log('[Playground] No valid base gateway URL found.');
            return null;
        } catch (error) {
            console.error('[Playground] Error extracting base gateway URL:', error);
            return null;
        }
    }

    private extractSubscriptionKey(subscription: any): string | null {
        try {
            // Extract subscription key from APIM subscription object
            if (subscription.primaryKey) {
                return subscription.primaryKey;
            }
            
            if (subscription.properties?.primaryKey) {
                return subscription.properties.primaryKey;
            }
            
            if (subscription.keys?.primaryKey) {
                return subscription.keys.primaryKey;
            }
            
            console.log('[Playground] Subscription object structure:', JSON.stringify(subscription, null, 2));
            return null;
        } catch (error) {
            console.error('[Playground] Error extracting subscription key:', error);
            return null;
        }
    }

    // API call implementations for different SDKs
    private async makeAzureOpenAIRequest(gatewayUrl: string, subscriptionKey: string, modelName: string, prompt: string, instructions: string, stream: boolean, apiVersion: string, inferenceApiType: string): Promise<any> {

        gatewayUrl = gatewayUrl.replace('/openai', '');

        const client = new AzureOpenAI({ endpoint: gatewayUrl, apiKey: subscriptionKey, apiVersion });
 
        let result: any;

        if (inferenceApiType === 'Responses API') {
            // Use responses.create for Responses API
            result = await client.responses.create({
                model: modelName,
                input: prompt,
                instructions: instructions,
                stream: stream
            });
        } else {
            const messages = [
                    { role: "system" as const, content: instructions },
                    { role: "user" as const, content: prompt }
                ];

            // Use chat.completions.create for Chat Completions (default)
            result = await client.chat.completions.create({
                messages: messages,
                model: modelName,
                stream: stream
            });
        }

        return result;
    }

    private async makeAzureAIInferenceRequest(gatewayUrl: string, subscriptionKey: string, modelName: string, prompt: string, instructions: string, stream: boolean): Promise<any> {
        const payload = {
            messages: [
                ...(instructions ? [{ role: 'system', content: instructions }] : []),
                { role: 'user', content: prompt }
            ],
            model: modelName,
            stream: stream
        };

        // Construct the full endpoint URL - if gatewayUrl already ends with the endpoint, don't append
        let endpointUrl = gatewayUrl;
        if (!gatewayUrl.endsWith('/chat/completions')) {
            endpointUrl = gatewayUrl.endsWith('/') ? gatewayUrl + 'chat/completions' : gatewayUrl + '/chat/completions';
        }

        return this.makeHttpRequest(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': subscriptionKey
            },
            body: JSON.stringify(payload)
        });
    }

    private async makeOpenAICompatibleRequest(gatewayUrl: string, subscriptionKey: string, modelName: string, prompt: string, instructions: string, stream: boolean): Promise<any> {
        const payload = {
            model: modelName,
            messages: [
                ...(instructions ? [{ role: 'system', content: instructions }] : []),
                { role: 'user', content: prompt }
            ],
            stream: stream
        };

        // Construct the full endpoint URL - if gatewayUrl already ends with the endpoint, don't append
        let endpointUrl = gatewayUrl;
        if (!gatewayUrl.includes('/v1/chat/completions') && !gatewayUrl.endsWith('/chat/completions')) {
            if (gatewayUrl.includes('/v1')) {
                // If it already has /v1 in the path, just append chat/completions
                endpointUrl = gatewayUrl.endsWith('/') ? gatewayUrl + 'chat/completions' : gatewayUrl + '/chat/completions';
            } else {
                // Add the full /v1/chat/completions path
                endpointUrl = gatewayUrl.endsWith('/') ? gatewayUrl + 'v1/chat/completions' : gatewayUrl + '/v1/chat/completions';
            }
        }

        return this.makeHttpRequest(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${subscriptionKey}`,
                'Ocp-Apim-Subscription-Key': subscriptionKey
            },
            body: JSON.stringify(payload)
        });
    }

    private async makeHttpRequest(url: string, options: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method,
                headers: options.headers
            };

            const req = httpModule.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const rawRequest = {
                            url: url,
                            method: options.method,
                            headers: options.headers,
                            body: options.body
                        };

                        const rawResponse = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: data
                        };

                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            const responseData = JSON.parse(data);
                            
                            // Extract content based on response structure
                            let content = '';
                            let tokens = null;
                            
                            if (responseData.choices && responseData.choices.length > 0) {
                                content = responseData.choices[0].message?.content || 
                                         responseData.choices[0].delta?.content || 
                                         responseData.choices[0].text || '';
                            } else if (responseData.content) {
                                content = responseData.content;
                            } else if (responseData.message) {
                                content = responseData.message;
                            }

                            // Extract token usage if available
                            if (responseData.usage) {
                                tokens = {
                                    prompt: responseData.usage.prompt_tokens,
                                    completion: responseData.usage.completion_tokens,
                                    total: responseData.usage.total_tokens
                                };
                            }

                            resolve({
                                content: content,
                                tokens: tokens,
                                rawRequest: rawRequest,
                                rawResponse: rawResponse,
                                traceInfo: {
                                    requestId: res.headers['x-request-id'] || res.headers['request-id'],
                                    timestamp: new Date().toISOString()
                                }
                            });
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }
}