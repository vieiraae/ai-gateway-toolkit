import * as vscode from 'vscode';

export interface HelpItem {
    label: string;
    url: string;
    iconPath: vscode.ThemeIcon;
    tooltip: string;
}

export class HelpTreeProvider implements vscode.TreeDataProvider<HelpItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HelpItem | undefined | null | void> = new vscode.EventEmitter<HelpItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HelpItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private helpItems: HelpItem[] = [
        {
            label: 'Toolkit Overview',
            url: 'https://marketplace.visualstudio.com/items?itemName=AlexVieira.ai-gateway-toolkit',
            iconPath: new vscode.ThemeIcon('info'),
            tooltip: 'View the AI Gateway Toolkit extension page on VS Code Marketplace'
        },
        {
            label: "What's New",
            url: 'https://marketplace.visualstudio.com/items/AlexVieira.ai-gateway-toolkit/changelog',
            iconPath: new vscode.ThemeIcon('history'),
            tooltip: 'See the latest changes and updates in the changelog'
        },
        {
            label: 'Q & A',
            url: 'https://marketplace.visualstudio.com/items?itemName=AlexVieira.ai-gateway-toolkit&ssr=false#qna',
            iconPath: new vscode.ThemeIcon('question'),
            tooltip: 'Ask questions and get answers from the community'
        },
        {
            label: 'Rate & Review',
            url: 'https://marketplace.visualstudio.com/items?itemName=AlexVieira.ai-gateway-toolkit&ssr=false#review-details',
            iconPath: new vscode.ThemeIcon('star'),
            tooltip: 'Rate and review the AI Gateway Toolkit extension'
        },
        {
            label: 'AI Gateway Docs',
            url: 'https://aka.ms/ai-gateway/docs',
            iconPath: new vscode.ThemeIcon('book'),
            tooltip: 'Learn more about Azure AI Gateway documentation'
        },
        {
            label: 'AI Gateway Labs',
            url: 'https://aka.ms/ai-gateway',
            iconPath: new vscode.ThemeIcon('beaker'),
            tooltip: 'Explore AI Gateway Labs and experiments'
        },
        {
            label: 'AI Gateway Workshop',
            url: 'https://aka.ms/ai-gateway/workshop',
            iconPath: new vscode.ThemeIcon('mortar-board'),
            tooltip: 'Join hands-on AI Gateway workshops and tutorials'
        }
    ];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HelpItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = element.iconPath;
        treeItem.tooltip = element.tooltip;
        treeItem.command = {
            command: 'aiGatewayToolkit.openUrl',
            title: 'Open URL',
            arguments: [element.url]
        };
        return treeItem;
    }

    getChildren(element?: HelpItem): Thenable<HelpItem[]> {
        if (!element) {
            return Promise.resolve(this.helpItems);
        }
        return Promise.resolve([]);
    }
}