import * as vscode from 'vscode';
import { BackendUsage } from '../types';
import { AzureService } from '../services/azureService';

export class BackendTreeItem extends vscode.TreeItem {
    constructor(
        public readonly backend: BackendUsage,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(backend.backendName, collapsibleState);
        this.tooltip = `${backend.backendName}\nTotal Tokens: ${backend.totalTokens.toLocaleString()}\nRequests: ${backend.requestCount.toLocaleString()}\nAvg Latency: ${backend.averageLatency.toFixed(2)}ms\nSuccess Rate: ${backend.successRate.toFixed(1)}%`;
        this.description = `${backend.totalTokens.toLocaleString()} tokens`;
        this.contextValue = 'backend';
        this.iconPath = new vscode.ThemeIcon('server');
    }
}

export class BackendTreeProvider implements vscode.TreeDataProvider<BackendTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BackendTreeItem | undefined | null | void> = new vscode.EventEmitter<BackendTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BackendTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private azureService: AzureService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BackendTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: BackendTreeItem): Promise<BackendTreeItem[]> {
        if (!this.azureService.isConnected()) {
            return [];
        }

        if (!element) {
            try {
                const backends = await this.azureService.getBackendsFromLogs();
                return backends.map(backend => new BackendTreeItem(backend, vscode.TreeItemCollapsibleState.None));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load backends: ${error}`);
                return [];
            }
        }

        return [];
    }
}