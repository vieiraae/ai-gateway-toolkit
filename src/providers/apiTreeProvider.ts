import * as vscode from 'vscode';
import { ApiManagementApi } from '../types';
import { AzureService } from '../services/azureService';

export class ApiTreeItem extends vscode.TreeItem {
    constructor(
        public readonly api: ApiManagementApi,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(api.displayName, collapsibleState);
        this.tooltip = `${api.displayName} - ${api.description || 'No description'}`;
        this.description = api.path;
        this.contextValue = 'api';
        this.iconPath = new vscode.ThemeIcon('symbol-interface');
    }
}

export class ApiTreeProvider implements vscode.TreeDataProvider<ApiTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ApiTreeItem | undefined | null | void> = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ApiTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private azureService: AzureService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ApiTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ApiTreeItem): Promise<ApiTreeItem[]> {
        if (!this.azureService.isConnected()) {
            return [];
        }

        if (!element) {
            try {
                const apis = await this.azureService.getApis();
                return apis.map(api => new ApiTreeItem(api, vscode.TreeItemCollapsibleState.None));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load APIs: ${error}`);
                return [];
            }
        }

        return [];
    }
}