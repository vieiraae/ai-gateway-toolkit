import * as vscode from 'vscode';
import { ApiManagementSubscription } from '../types';
import { AzureService } from '../services/azureService';

export class SubscriptionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly subscription: ApiManagementSubscription,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(subscription.name, collapsibleState);
        this.tooltip = `${subscription.displayName} - ${subscription.state}`;
        this.description = subscription.scope;
        this.contextValue = 'subscription';
        this.iconPath = new vscode.ThemeIcon('key');
        
        // Show state in the icon
        if (subscription.state === 'active') {
            this.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.green'));
        } else if (subscription.state === 'suspended') {
            this.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.yellow'));
        } else {
            this.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.red'));
        }
    }
}

export class SubscriptionTreeProvider implements vscode.TreeDataProvider<SubscriptionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SubscriptionTreeItem | undefined | null | void> = new vscode.EventEmitter<SubscriptionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SubscriptionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private azureService: AzureService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SubscriptionTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SubscriptionTreeItem): Promise<SubscriptionTreeItem[]> {
        if (!this.azureService.isConnected()) {
            return [];
        }

        if (!element) {
            try {
                const subscriptions = await this.azureService.getSubscriptions();
                return subscriptions.map(sub => new SubscriptionTreeItem(sub, vscode.TreeItemCollapsibleState.None));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load subscriptions: ${error}`);
                return [];
            }
        }

        return [];
    }
}