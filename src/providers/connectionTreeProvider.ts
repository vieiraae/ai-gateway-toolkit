import * as vscode from 'vscode';
import { AzureService } from '../services/azureService';

export class ConnectionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri }
    ) {
        super(label, collapsibleState);
        if (iconPath) {
            this.iconPath = iconPath;
        }
    }
}

export class ConnectionTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConnectionTreeItem | undefined | null | void> = new vscode.EventEmitter<ConnectionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConnectionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private azureService: AzureService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ConnectionTreeItem): ConnectionTreeItem[] {
        if (!element) {
            if (this.azureService.isConnected()) {
                // Connected state
                const connection = this.azureService.getConnection();
                return [
                    new ConnectionTreeItem(
                        'Connected to Azure',
                        vscode.TreeItemCollapsibleState.None,
                        'connected',
                        new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.green'))
                    ),
                    new ConnectionTreeItem(
                        `Tenant: ${connection?.tenantId?.substring(0, 8)}...`,
                        vscode.TreeItemCollapsibleState.None,
                        'tenant-info',
                        new vscode.ThemeIcon('organization')
                    ),
                    new ConnectionTreeItem(
                        `Subscription: ${connection?.subscriptionId?.substring(0, 8)}...`,
                        vscode.TreeItemCollapsibleState.None,
                        'subscription-info',
                        new vscode.ThemeIcon('credit-card')
                    ),
                    new ConnectionTreeItem(
                        `APIM: ${connection?.serviceName}`,
                        vscode.TreeItemCollapsibleState.None,
                        'service-info',
                        new vscode.ThemeIcon('server-environment')
                    )
                ];
            } else {
                // Disconnected state
                return [
                    new ConnectionTreeItem(
                        'Disconnected',
                        vscode.TreeItemCollapsibleState.None,
                        'disconnected',
                        new vscode.ThemeIcon('debug-disconnect', new vscode.ThemeColor('charts.red'))
                    ),
                    new ConnectionTreeItem(
                        'Connect to Azure API Management',
                        vscode.TreeItemCollapsibleState.None,
                        'connect-button',
                        new vscode.ThemeIcon('plug')
                    )
                ];
            }
        }
        return [];
    }
}