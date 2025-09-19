export interface AzureConnection {
    tenantId: string;
    subscriptionId: string;
    resourceGroupName: string;
    serviceName: string;
    accessToken: string;
    gatewayUrl?: string; // Actual gateway URL from APIM service properties
}

export interface ApiManagementApi {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    serviceUrl?: string;
    path: string;
    protocols: string[];
    subscriptionRequired: boolean;
    gatewayUrl?: string; // Full APIM gateway URL constructed from service name + path
    baseGatewayUrl?: string; // Base APIM gateway URL (without path) for SDK clients
}

export interface ApiManagementSubscription {
    id: string;
    name: string;
    displayName: string;
    state: string;
    primaryKey: string;
    secondaryKey: string;
    scope: string;
    createdDate: Date;
}

export interface ModelUsage {
    modelName: string;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    requestCount: number;
    averageLatency: number;
    errorRate: number;
    successRate: number;
}

export interface BackendUsage {
    backendName: string;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    requestCount: number;
    averageLatency: number;
    errorRate: number;
    successRate: number;
}

export interface LogAnalyticsResult {
    timestamp: Date;
    correlationId: string;
    apiName: string;
    modelName: string;
    region: string;
    subscriptionName: string;
    backend: string;
    promptTokens: number;
    completionTokens: number;
    promptRequest: string;
    completionResponse: string;
    streamed: boolean;
    statusCode: number;
}

export interface AnalyticsFilters {
    apiIds?: string[];
    subscriptionNames?: string[];
    modelNames?: string[];
    backends?: string[];
    timeRange: {
        start: Date;
        end: Date;
    };
}

export interface AnalyticsSummary {
    totalRequests: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    averageLatency: number;
    errorRate: number;
}

export interface PlaygroundRequest {
    apiId: string;
    modelName: string;
    subscriptionId: string;
    stream: boolean;
    trace: boolean;
    instructions?: string;
    prompt: string;
}

export interface PlaygroundResponse {
    content: string;
    rawRequest?: any;
    rawResponse?: any;
    traceInfo?: any;
    latency: number;
    tokens?: {
        prompt: number;
        completion: number;
    };
}

export interface WebviewMessage {
    type: string;
    data?: any;
}