import * as vscode from 'vscode';
import { ModelUsage } from '../types';
import { AzureService } from '../services/azureService';

export class ModelTreeItem extends vscode.TreeItem {
    constructor(
        public readonly model: ModelUsage,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(model.modelName, collapsibleState);
        this.tooltip = `${model.modelName}\nTotal Tokens: ${model.totalTokens.toLocaleString()}\nRequests: ${model.requestCount.toLocaleString()}\nAvg Latency: ${model.averageLatency.toFixed(2)}ms\nSuccess Rate: ${model.successRate.toFixed(1)}%`;
        this.description = `${model.totalTokens.toLocaleString()} tokens`;
        this.contextValue = 'model';
        this.iconPath = new vscode.ThemeIcon('package');
    }
}

export class ModelTreeProvider implements vscode.TreeDataProvider<ModelTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ModelTreeItem | undefined | null | void> = new vscode.EventEmitter<ModelTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ModelTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private azureService: AzureService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ModelTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ModelTreeItem): Promise<ModelTreeItem[]> {
        if (!this.azureService.isConnected()) {
            return [];
        }

        if (!element) {
            try {
                const models = await this.azureService.getModelsFromLogs();
                return models.map(model => new ModelTreeItem(model, vscode.TreeItemCollapsibleState.None));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load models: ${error}`);
                return [];
            }
        }

        return [];
    }
}