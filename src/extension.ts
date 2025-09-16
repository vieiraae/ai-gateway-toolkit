import * as vscode from 'vscode';
import { AzureService } from './services/azureService';
import { WebviewService } from './services/webviewService';
import { ApiTreeProvider } from './providers/apiTreeProvider';
import { SubscriptionTreeProvider } from './providers/subscriptionTreeProvider';
import { ModelTreeProvider } from './providers/modelTreeProvider';
import { ConnectionTreeProvider } from './providers/connectionTreeProvider';

export async function activate(context: vscode.ExtensionContext) {
    console.log('[AI Gateway Toolkit] Extension activated');

    // Initialize services
    const azureService = new AzureService();
    const webviewService = new WebviewService(context.extensionUri, azureService);

    // Initialize tree providers
    const apiTreeProvider = new ApiTreeProvider(azureService);
    const subscriptionTreeProvider = new SubscriptionTreeProvider(azureService);
    const modelTreeProvider = new ModelTreeProvider(azureService);
    const connectionTreeProvider = new ConnectionTreeProvider(azureService);

    // Listen for tree data changes and notify analytics dashboard
    apiTreeProvider.onDidChangeTreeData(() => {
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'apis' }
        });
    });

    subscriptionTreeProvider.onDidChangeTreeData(() => {
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'subscriptions' }
        });
    });

    modelTreeProvider.onDidChangeTreeData(() => {
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'models' }
        });
    });

    // Register tree views
    const apiTreeView = vscode.window.createTreeView('aiGatewayToolkit.apiExplorer', {
        treeDataProvider: apiTreeProvider,
        showCollapseAll: true
    });

    const subscriptionTreeView = vscode.window.createTreeView('aiGatewayToolkit.subscriptionsExplorer', {
        treeDataProvider: subscriptionTreeProvider,
        showCollapseAll: true
    });

    const modelTreeView = vscode.window.createTreeView('aiGatewayToolkit.modelsExplorer', {
        treeDataProvider: modelTreeProvider,
        showCollapseAll: true
    });

    const connectionTreeView = vscode.window.createTreeView('aiGatewayToolkit.connectionView', {
        treeDataProvider: connectionTreeProvider
    });

    // Register tree view selection handlers to automatically open playground with selections
    apiTreeView.onDidChangeSelection(e => {
        if (e.selection.length > 0) {
            const selectedItem = e.selection[0];
            if (selectedItem.api) {
                openPlaygroundWithSelection({
                    apiId: selectedItem.api.id,
                    apiName: selectedItem.api.displayName
                });
            }
        }
    });

    subscriptionTreeView.onDidChangeSelection(e => {
        if (e.selection.length > 0) {
            const selectedItem = e.selection[0];
            if (selectedItem.subscription) {
                openPlaygroundWithSelection({
                    subscriptionId: selectedItem.subscription.id,
                    subscriptionName: selectedItem.subscription.name
                });
            }
        }
    });

    modelTreeView.onDidChangeSelection(e => {
        if (e.selection.length > 0) {
            const selectedItem = e.selection[0];
            if (selectedItem.model) {
                openPlaygroundWithSelection({
                    modelName: selectedItem.model.modelName
                });
            }
        }
    });

    // Set initial context
    vscode.commands.executeCommand('setContext', 'aiGatewayToolkit.connected', false);

    // Helper function to open playground with selection
    const openPlaygroundWithSelection = (selection: any) => {
        if (!azureService.isConnected()) {
            vscode.window.showWarningMessage('Please connect to Azure API Management first');
            return;
        }

        let panel = webviewService.getPanel('playground');
        if (!panel) {
            panel = webviewService.createPlaygroundPanel();
        }
        panel.reveal();

        // Send selection to the playground with a slight delay to ensure panel is ready
        setTimeout(() => {
            console.log('[Extension] Sending selection to playground:', selection);
            webviewService.sendMessageToPanel('playground', {
                type: 'setSelection',
                data: selection
            });
        }, 100);
    };

    // Helper function to open playground with filters (for analytics)
    const openPlaygroundWithFilters = (filters: any) => {
        if (!azureService.isConnected()) {
            vscode.window.showWarningMessage('Please connect to Azure API Management first');
            return;
        }

        let panel = webviewService.getPanel('playground');
        if (!panel) {
            panel = webviewService.createPlaygroundPanel();
        }
        panel.reveal();

        // Send filters to the playground
        webviewService.sendMessageToPanel('playground', {
            type: 'setFilters',
            data: filters
        });
    };

    // Register commands
    const connectCommand = vscode.commands.registerCommand('aiGatewayToolkit.connect', async () => {
        try {
            vscode.window.showInformationMessage('Connecting to Azure...');
            
            const authenticated = await azureService.authenticate();
            if (!authenticated) {
                vscode.window.showErrorMessage('Authentication failed');
                return;
            }

            const connected = await azureService.selectTenantAndSubscription();
            if (connected) {
                vscode.commands.executeCommand('setContext', 'aiGatewayToolkit.connected', true);
                
                // Refresh all tree views
                apiTreeProvider.refresh();
                subscriptionTreeProvider.refresh();
                modelTreeProvider.refresh();
                connectionTreeProvider.refresh();
                
                // Notify analytics dashboard to refresh
                webviewService.sendMessageToPanel('analytics', {
                    type: 'dataChanged',
                    data: { source: 'connection' }
                });
                
                vscode.window.showInformationMessage('Successfully connected to Azure API Management');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Connection failed: ${error}`);
        }
    });

    const disconnectCommand = vscode.commands.registerCommand('aiGatewayToolkit.disconnect', () => {
        azureService.disconnect();
        vscode.commands.executeCommand('setContext', 'aiGatewayToolkit.connected', false);
        
        // Refresh all tree views
        apiTreeProvider.refresh();
        subscriptionTreeProvider.refresh();
        modelTreeProvider.refresh();
        connectionTreeProvider.refresh();
        
        // Notify analytics dashboard to refresh
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'connection' }
        });
        
        vscode.window.showInformationMessage('Disconnected from Azure API Management');
    });

    const openAnalyticsCommand = vscode.commands.registerCommand('aiGatewayToolkit.openAnalytics', (item?: any) => {
        if (!azureService.isConnected()) {
            vscode.window.showWarningMessage('Please connect to Azure API Management first');
            return;
        }

        let panel = webviewService.getPanel('analytics');
        if (!panel) {
            panel = webviewService.createAnalyticsPanel();
        }
        panel.reveal();

        // If called with a specific item (API, subscription, or model), filter by it
        if (item) {
            console.log('Opening analytics with item:', item);
            const filters = item.api ? { apiIds: [item.api.id] } : 
                          item.subscription ? { subscriptionNames: [item.subscription.name] } :
                          item.model ? { modelNames: [item.model.modelName] } : {};
            
            console.log('Sending filters to analytics:', filters);
            webviewService.sendMessageToPanel('analytics', {
                type: 'setFilters',
                data: filters
            });
        }
    });

    const openPlaygroundCommand = vscode.commands.registerCommand('aiGatewayToolkit.openPlayground', (item?: any) => {
        if (!azureService.isConnected()) {
            vscode.window.showWarningMessage('Please connect to Azure API Management first');
            return;
        }

        let panel = webviewService.getPanel('playground');
        if (!panel) {
            panel = webviewService.createPlaygroundPanel();
        }
        panel.reveal();

        // If called with a specific item, pre-select it
        if (item) {
            const selection = item.api ? { apiId: item.api.id } : 
                            item.subscription ? { subscriptionId: item.subscription.id } :
                            item.model ? { modelName: item.model.modelName } : {};
            
            webviewService.sendMessageToPanel('playground', {
                type: 'setSelection',
                data: selection
            });
        }
    });

    const refreshApisCommand = vscode.commands.registerCommand('aiGatewayToolkit.refreshApis', () => {
        apiTreeProvider.refresh();
        // Notify analytics dashboard to refresh
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'apis' }
        });
    });

    const refreshSubscriptionsCommand = vscode.commands.registerCommand('aiGatewayToolkit.refreshSubscriptions', () => {
        subscriptionTreeProvider.refresh();
        // Notify analytics dashboard to refresh
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'subscriptions' }
        });
    });

    const refreshModelsCommand = vscode.commands.registerCommand('aiGatewayToolkit.refreshModels', () => {
        modelTreeProvider.refresh();
        // Notify analytics dashboard to refresh
        webviewService.sendMessageToPanel('analytics', {
            type: 'dataChanged',
            data: { source: 'models' }
        });
    });

    const copySubscriptionKeyCommand = vscode.commands.registerCommand('aiGatewayToolkit.copySubscriptionKey', (item) => {
        if (item && item.subscription) {
            vscode.env.clipboard.writeText(item.subscription.primaryKey);
            vscode.window.showInformationMessage('Primary key copied to clipboard');
        }
    });

    const copySecondaryKeyCommand = vscode.commands.registerCommand('aiGatewayToolkit.copySecondaryKey', (item) => {
        if (item && item.subscription) {
            vscode.env.clipboard.writeText(item.subscription.secondaryKey);
            vscode.window.showInformationMessage('Secondary key copied to clipboard');
        }
    });

    const createSubscriptionCommand = vscode.commands.registerCommand('aiGatewayToolkit.createSubscription', async () => {
        if (!azureService.isConnected()) {
            vscode.window.showWarningMessage('Please connect to Azure API Management first');
            return;
        }

        const name = await vscode.window.showInputBox({
            prompt: 'Enter subscription name',
            placeHolder: 'my-subscription'
        });

        if (!name) {
            return;
        }

        const displayName = await vscode.window.showInputBox({
            prompt: 'Enter subscription display name',
            placeHolder: 'My Subscription',
            value: name
        });

        if (!displayName) {
            return;
        }

        const scope = await vscode.window.showQuickPick([
            { label: 'All APIs', value: '/apis' },
            { label: 'Product', value: '/products/{productId}' },
            { label: 'API', value: '/apis/{apiId}' }
        ], {
            placeHolder: 'Select subscription scope'
        });

        if (!scope) {
            return;
        }

        try {
            await azureService.createSubscription(name, displayName, scope.value);
            subscriptionTreeProvider.refresh();
            // Notify analytics dashboard to refresh
            webviewService.sendMessageToPanel('analytics', {
                type: 'dataChanged',
                data: { source: 'subscriptions' }
            });
            vscode.window.showInformationMessage(`Subscription '${displayName}' created successfully`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create subscription: ${error}`);
        }
    });

    const openApiDocumentationCommand = vscode.commands.registerCommand('aiGatewayToolkit.openApiDocumentation', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.microsoft.com/en-us/azure/api-management/'));
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        apiTreeView,
        subscriptionTreeView,
        modelTreeView,
        connectionTreeView,
        connectCommand,
        disconnectCommand,
        openAnalyticsCommand,
        openPlaygroundCommand,
        refreshApisCommand,
        refreshSubscriptionsCommand,
        refreshModelsCommand,
        copySubscriptionKeyCommand,
        copySecondaryKeyCommand,
        createSubscriptionCommand,
        openApiDocumentationCommand
    );

    // Handle authentication session changes
    const authChangeListener = vscode.authentication.onDidChangeSessions(e => {
        if (e.provider.id === 'microsoft') {
            // Re-evaluate connection status
            if (!azureService.isConnected()) {
                vscode.commands.executeCommand('setContext', 'aiGatewayToolkit.connected', false);
                connectionTreeProvider.refresh();
            }
        }
    });

    context.subscriptions.push(authChangeListener);
}

export function deactivate() {
    // Cleanup if needed
}
