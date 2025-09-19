import * as vscode from 'vscode';
import { ApiManagementClient } from '@azure/arm-apimanagement';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { LogsQueryClient } from '@azure/monitor-query-logs';
import { TokenCredential, AccessToken } from '@azure/core-auth';
import { 
    AzureConnection, 
    ApiManagementApi, 
    ApiManagementSubscription, 
    ModelUsage, 
    BackendUsage,
    LogAnalyticsResult,
    AnalyticsFilters,
    AnalyticsSummary
} from '../types';

export class AzureService {
    private connection: AzureConnection | null = null;
    private apiManagementClient: ApiManagementClient | null = null;
    private subscriptionClient: SubscriptionClient | null = null;
    private logsClient: LogsQueryClient | null = null;
    private credential: TokenCredential | null = null;
    private logsCredential: TokenCredential | null = null;

    // Token management
    private managementToken: AccessToken | null = null;
    private logsToken: AccessToken | null = null;
    private currentTenantId: string | null = null;
    private isRefreshing = false;
    private managementSession: vscode.AuthenticationSession | null = null;
    private logsSession: vscode.AuthenticationSession | null = null;

    private readonly requiredScopes = [
        'https://management.azure.com/.default'
    ];

    async authenticate(): Promise<boolean> {
        try {
            // Get initial authentication session
            const session = await vscode.authentication.getSession('microsoft', this.requiredScopes, {
                createIfNone: true
            });

            if (!session) {
                return false;
            }

            // Store initial session
            this.managementSession = session;
            this.managementToken = this.createTokenFromSession(session);

            // Create credential with automatic refresh
            this.credential = {
                getToken: async (scopes?: string | string[]) => {
                    return await this.getManagementToken();
                }
            };

            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Authentication failed: ${error}`);
            return false;
        }
    }

    private async refreshManagementToken(): Promise<void> {
        if (this.isRefreshing) {
            // Wait for ongoing refresh to complete
            while (this.isRefreshing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isRefreshing = true;
        try {
            console.log('[AzureService] Refreshing management token...');
            
            const scopes = [...this.requiredScopes];
            if (this.currentTenantId) {
                scopes.push(`VSCODE_TENANT:${this.currentTenantId}`);
            }

            // First try to get session silently (this may return a refreshed token)
            let session = await vscode.authentication.getSession('microsoft', scopes, {
                createIfNone: false,
                silent: true
            });

            // If no session or we detect the session is the same as our cached one,
            // request a fresh session (VS Code handles refresh internally)
            if (!session || (this.managementSession && session.accessToken === this.managementSession.accessToken)) {
                console.log('[AzureService] Requesting fresh session...');
                session = await vscode.authentication.getSession('microsoft', scopes, {
                    createIfNone: true,
                    clearSessionPreference: true // This clears VS Code's cached preference and may trigger refresh
                });
            }

            if (!session) {
                throw new Error('Failed to get authentication session');
            }

            this.managementSession = session;
            this.managementToken = this.createTokenFromSession(session);
            
            // Update the credential with the new token
            this.credential = {
                getToken: async (scopes?: string | string[]) => {
                    return await this.getManagementToken();
                }
            };

            // Recreate Azure SDK clients to use the refreshed credential
            await this.recreateAzureClients();
            
            console.log('[AzureService] Management token refreshed successfully');
        } catch (error) {
            console.error('[AzureService] Failed to refresh management token:', error);
            this.managementToken = null;
            this.managementSession = null;
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    private async recreateAzureClients(): Promise<void> {
        if (this.connection && this.credential) {
            console.log('[AzureService] Recreating Azure SDK clients with fresh credentials...');
            
            // Recreate API Management client
            this.apiManagementClient = new ApiManagementClient(this.credential, this.connection.subscriptionId);
            
            // Recreate Subscription client
            this.subscriptionClient = new SubscriptionClient(this.credential);
            
            console.log('[AzureService] Azure SDK clients recreated');
        }
    }

    private async getManagementToken(): Promise<AccessToken> {
        const now = Date.now();

        // Check if token needs refresh - be more aggressive about refreshing
        const needsRefresh = !this.managementToken || 
                           (this.managementToken.refreshAfterTimestamp && now >= this.managementToken.refreshAfterTimestamp);
        
        if (needsRefresh) {
            try {
                await this.refreshManagementToken();
            } catch (error) {
                console.error('[AzureService] Token refresh failed, trying to get fresh session:', error);
                // If refresh fails, try to get a completely fresh session
                await this.getFreshManagementSession();
            }
        }

        // Check if token is still valid after refresh
        if (!this.managementToken) {
            throw new Error('Management token is null after refresh');
        }

        if (now >= this.managementToken.expiresOnTimestamp) {
            throw new Error('Management token expired and refresh failed. Please retry.');
        }

        return this.managementToken;
    }

    private async getFreshManagementSession(): Promise<void> {
        console.log('[AzureService] Getting fresh management session...');
        
        const scopes = [...this.requiredScopes];
        if (this.currentTenantId) {
            scopes.push(`VSCODE_TENANT:${this.currentTenantId}`);
        }

        const session = await vscode.authentication.getSession('microsoft', scopes, {
            createIfNone: true
        });

        if (!session) {
            throw new Error('Failed to get fresh authentication session');
        }

        this.managementSession = session;
        this.managementToken = this.createTokenFromSession(session);
        
        // Update credential and recreate clients
        this.credential = {
            getToken: async (scopes?: string | string[]) => {
                return await this.getManagementToken();
            }
        };

        await this.recreateAzureClients();
        console.log('[AzureService] Fresh management session obtained');
    }

    private createTokenFromSession(session: vscode.AuthenticationSession): AccessToken {
        const now = Date.now();
        const token = {
            token: session.accessToken,
            expiresOnTimestamp: now + (60 * 60 * 1000), // 1 hour from now
            refreshAfterTimestamp: now + (30 * 60 * 1000) // 30 minutes from now (refresh more aggressively)
        };
        
        console.log(`[AzureService] Created token - expires in ${Math.round((token.expiresOnTimestamp - now) / 60000)} minutes, refresh in ${Math.round((token.refreshAfterTimestamp - now) / 60000)} minutes`);
        return token;
    }

    // Debug method to check token status
    public getTokenStatus(): { management: any, logs: any } {
        const now = Date.now();
        return {
            management: this.managementToken ? {
                hasToken: !!this.managementToken,
                expiresIn: Math.round((this.managementToken.expiresOnTimestamp - now) / 60000),
                refreshIn: this.managementToken.refreshAfterTimestamp ? Math.round((this.managementToken.refreshAfterTimestamp - now) / 60000) : 0,
                needsRefresh: this.managementToken.refreshAfterTimestamp ? now >= this.managementToken.refreshAfterTimestamp : true
            } : null,
            logs: this.logsToken ? {
                hasToken: !!this.logsToken,
                expiresIn: Math.round((this.logsToken.expiresOnTimestamp - now) / 60000),
                refreshIn: this.logsToken.refreshAfterTimestamp ? Math.round((this.logsToken.refreshAfterTimestamp - now) / 60000) : 0,
                needsRefresh: this.logsToken.refreshAfterTimestamp ? now >= this.logsToken.refreshAfterTimestamp : true
            } : null
        };
    }

    // Helper method to execute operations with automatic token refresh retry
    private async executeWithTokenRefresh<T>(
        operation: () => Promise<T>, 
        tokenType: 'management' | 'logs' = 'management'
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || '';
            
            // Check if this is a token expiry error
            if (errorMessage.includes('EvolvedSecurityTokenService') || 
                errorMessage.includes('access token expiry') ||
                errorMessage.includes('401') ||
                errorMessage.includes('403')) {
                
                console.log(`[AzureService] Detected token expiry error for ${tokenType} token, refreshing and retrying...`);
                
                // Refresh the appropriate token
                if (tokenType === 'management') {
                    await this.getFreshManagementSession();
                } else if (this.currentTenantId) {
                    await this.refreshLogsToken(this.currentTenantId);
                }
                
                // Retry the operation once
                console.log(`[AzureService] Retrying operation after token refresh...`);
                return await operation();
            }
            
            // If not a token error, re-throw
            throw error;
        }
    }

    private async getAvailableTenants(): Promise<{ tenantId: string, displayName?: string }[]> {
        try {
            if (!this.credential) {
                throw new Error('Not authenticated');
            }

            // Get access token for Azure Management API
            const tokenResponse = await this.credential.getToken(['https://management.azure.com/.default']);
            if (!tokenResponse) {
                throw new Error('Failed to get access token');
            }

            // Call the tenants API directly
            const response = await fetch('https://management.azure.com/tenants?api-version=2020-01-01', {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get tenants: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value.map((tenant: any) => ({
                tenantId: tenant.tenantId,
                displayName: tenant.displayName || tenant.defaultDomain
            }));
        } catch (error) {
            console.error('Error getting tenants:', error);
            vscode.window.showErrorMessage(`Failed to get available tenants: ${error}`);
            return [];
        }
    }

    private async refreshLogsToken(tenantId: string): Promise<void> {
        if (this.isRefreshing) {
            // Wait for ongoing refresh to complete
            while (this.isRefreshing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isRefreshing = true;
        try {
            console.log(`[AzureService] Refreshing logs token for tenant: ${tenantId}`);
            
            const scopes = ['https://api.loganalytics.io/.default'];
            scopes.push(`VSCODE_TENANT:${tenantId}`);
            
            // First try to get session silently
            let session = await vscode.authentication.getSession('microsoft', scopes, {
                createIfNone: false,
                silent: true
            });

            // If no session or we detect the session is the same as our cached one,
            // request a fresh session
            if (!session || (this.logsSession && session.accessToken === this.logsSession.accessToken)) {
                console.log('[AzureService] Requesting fresh logs session...');
                session = await vscode.authentication.getSession('microsoft', scopes, {
                    createIfNone: true,
                    clearSessionPreference: true
                });
            }

            if (!session) {
                throw new Error('Failed to get logs authentication session');
            }

            this.logsSession = session;
            this.logsToken = this.createTokenFromSession(session);
            this.currentTenantId = tenantId;
            console.log(`[AzureService] Logs token refreshed successfully for tenant: ${tenantId}`);
        } catch (error) {
            console.error(`[AzureService] Failed to refresh logs token for tenant ${tenantId}:`, error);
            this.logsToken = null;
            this.logsSession = null;
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    private async getLogsSpecificToken(tenantId: string): Promise<string | null> {
        try {
            const token = await this.getLogsAccessToken(tenantId);
            return token.token;
        } catch (error) {
            console.error('Error getting logs-specific token:', error);
            return null;
        }
    }

    private async getLogsAccessToken(tenantId: string): Promise<AccessToken> {
        const now = Date.now();

        // Check if logs token needs refresh or tenant changed
        const needsRefresh = !this.logsToken || 
                           this.currentTenantId !== tenantId ||
                           (this.logsToken.refreshAfterTimestamp && now >= this.logsToken.refreshAfterTimestamp);
        
        if (needsRefresh) {
            await this.refreshLogsToken(tenantId);
        }

        // Check if token is still valid after refresh
        if (!this.logsToken) {
            throw new Error('Logs token is null after refresh');
        }

        if (now >= this.logsToken.expiresOnTimestamp) {
            throw new Error('Logs token expired and refresh failed. Please retry.');
        }

        return this.logsToken;
    }

    private async getTenantSpecificToken(tenantId: string): Promise<string | null> {
        try {
            console.log(`Getting tenant-specific token for tenant: ${tenantId}`);
            
            // First, try to get a new session by clearing existing preferences
            // This should prompt for re-authentication in the context of the specific tenant
            try {
                this.requiredScopes.push(`VSCODE_TENANT:${tenantId}`);
                const session = await vscode.authentication.getSession('microsoft', this.requiredScopes, {
                    //  clearSessionPreference: true, // This forces re-authentication
                    forceNewSession: true // VS Code API to force a new session
                });

                if (session) {
                    console.log(`Successfully obtained new authentication session`);
                    return session.accessToken;
                }
            } catch (sessionError) {
                console.log('New session approach failed, trying existing session:', sessionError);
            }

            // Fallback: Use existing credential but validate it works with the tenant
            if (!this.credential) {
                console.error('No credential available');
                return null;
            }

            const tokenResponse = await this.credential.getToken(['https://management.azure.com/.default']);
            if (!tokenResponse) {
                console.error('Failed to get token from existing credential');
                return null;
            }

            // Test the token by making a simple API call to the tenant-specific endpoint
            console.log(`Testing token`);
            const testResponse = await fetch(`https://management.azure.com/subscriptions?api-version=2020-01-01&$top=1`, {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (testResponse.ok) {
                console.log(`Token validation successful for tenant: ${tenantId}`);
                return tokenResponse.token;
            } else {
                console.log(`Token validation failed for tenant ${tenantId}: ${testResponse.status} ${testResponse.statusText}`);
                
                // If validation fails, try to get a completely new session
                const newSession = await vscode.authentication.getSession('microsoft', this.requiredScopes, {
                    createIfNone: true,
                    clearSessionPreference: true
                });

                if (newSession) {
                    console.log(`Got new session after validation failure`);
                    return newSession.accessToken;
                }
            }

            return null;

        } catch (error) {
            console.error('Error getting tenant-specific token:', error);
            return null;
        }
    }

    async selectTenantAndSubscription(): Promise<boolean> {
        try {
            if (!this.credential) {
                throw new Error('Not authenticated');
            }

            // First, get available tenants
            const availableTenants = await this.getAvailableTenants();
            if (availableTenants.length === 0) {
                vscode.window.showErrorMessage('No tenants found');
                return false;
            }

            // Show tenant selection
            const tenantOptions = availableTenants.map(tenant => ({
                label: tenant.displayName || tenant.tenantId,
                description: tenant.tenantId,
                tenantId: tenant.tenantId
            }));

            const selectedTenant = await vscode.window.showQuickPick(tenantOptions, {
                placeHolder: `Select an Azure tenant (${tenantOptions.length} available)`
            });

            if (!selectedTenant) {
                return false;
            }
            const selectedTenantId = selectedTenant.tenantId;

            // Get a new tenant-specific token
            vscode.window.showInformationMessage(`Authenticating for tenant: ${selectedTenant.label}...`);
            
            const tenantSpecificToken = await this.getTenantSpecificToken(selectedTenantId);
            if (!tenantSpecificToken) {
                vscode.window.showErrorMessage('Failed to get tenant-specific authentication token');
                return false;
            }

            // Update credential to use the tenant-specific token
            this.credential = {
                getToken: async () => ({
                    token: tenantSpecificToken,
                    expiresOnTimestamp: Date.now() + (60 * 60 * 1000), // 1 hour
                    refreshAfterTimestamp: Date.now() + (55 * 60 * 1000) // 55 minutes
                })
            };

            // Now get subscriptions for the selected tenant
            vscode.window.showInformationMessage(`Getting subscriptions for tenant: ${selectedTenant.label}...`);

            // Get subscriptions for the specific tenant 
            const subscriptions = [];
            try {
                // Get access token
                const tokenResponse = await this.credential.getToken(['https://management.azure.com/.default']);
                if (!tokenResponse) {
                    throw new Error('Failed to get access token');
                }

                // Use the tenant-specific endpoint to get subscriptions
                // This ensures we're querying in the context of the selected tenant
                const subscriptionsUrl = `https://management.azure.com/subscriptions?api-version=2020-01-01`;
                
                console.log(`Calling: ${subscriptionsUrl}`);
                
                const response = await fetch(subscriptionsUrl, {
                    headers: {
                        'Authorization': `Bearer ${tokenResponse.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.log(`Response status: ${response.status} ${response.statusText}`);
                    // If tenant-specific endpoint fails, fall back to the general endpoint and filter
                    console.log('Falling back to general subscriptions endpoint...');
                    
                    const fallbackResponse = await fetch(`https://management.azure.com/subscriptions?api-version=2020-01-01`, {
                        headers: {
                            'Authorization': `Bearer ${tokenResponse.token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!fallbackResponse.ok) {
                        throw new Error(`Failed to get subscriptions: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
                    }

                    const fallbackData = await fallbackResponse.json();
                    console.log(`Found ${fallbackData.value.length} total subscriptions via fallback`);

                    // Get unique tenant IDs to help with debugging
                    const availableTenantIds = new Set(fallbackData.value.map((sub: any) => sub.tenantId));
                    console.log(`Available tenant IDs in subscriptions: ${Array.from(availableTenantIds).join(', ')}`);
                    console.log(`Looking for subscriptions in tenant: ${selectedTenantId}`);

                    // Filter subscriptions by the selected tenant
                    for (const subscription of fallbackData.value) {
                        console.log(`Subscription: ${subscription.subscriptionId}, Tenant: ${subscription.tenantId}, Selected: ${selectedTenantId}`);
                        if (subscription.tenantId === selectedTenantId) {
                            subscriptions.push({
                                label: subscription.displayName || subscription.subscriptionId || '',
                                description: subscription.subscriptionId,
                                subscriptionId: subscription.subscriptionId,
                                tenantId: subscription.tenantId
                            });
                        }
                    }
                } else {
                    // Tenant-specific endpoint worked
                    const data = await response.json();
                    console.log(`Found ${data.value.length} subscriptions in tenant ${selectedTenantId}`);

                    for (const subscription of data.value) {
                        subscriptions.push({
                            label: subscription.displayName || subscription.subscriptionId || '',
                            description: subscription.subscriptionId,
                            subscriptionId: subscription.subscriptionId,
                            tenantId: subscription.tenantId
                        });
                    }
                }

                // Initialize subscription client for later use
                this.subscriptionClient = new SubscriptionClient(this.credential);

            } catch (error) {
                console.error('Error getting subscriptions:', error);
                vscode.window.showErrorMessage(`Error getting subscriptions: ${error}`);
                return false;
            }

            console.log(`Found ${subscriptions.length} subscriptions in tenant ${selectedTenantId}`);

            if (subscriptions.length === 0) {
                // Try to get information about which tenants have subscriptions
                let hasSubscriptionsElsewhere = false;
                try {
                    const tokenResponse = await this.credential.getToken(['https://management.azure.com/.default']);
                    if (tokenResponse) {
                        const fallbackResponse = await fetch('https://management.azure.com/subscriptions?api-version=2020-01-01', {
                            headers: {
                                'Authorization': `Bearer ${tokenResponse.token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            hasSubscriptionsElsewhere = fallbackData.value && fallbackData.value.length > 0;
                        }
                    }
                } catch (error) {
                    console.log('Could not check for subscriptions in other tenants:', error);
                }

                // Show a more helpful error message with options
                let message = `No subscriptions found in tenant "${selectedTenant.label}". This could mean:\n` +
                    `• You don't have access to any subscriptions in this tenant\n` +
                    `• The tenant doesn't have any subscriptions\n` +
                    `• You need additional permissions`;

                if (hasSubscriptionsElsewhere) {
                    message += `\n\nNote: You appear to have subscriptions in other tenants.`;
                }

                message += `\n\nWould you like to select a different tenant?`;

                const choice = await vscode.window.showWarningMessage(
                    message,
                    'Select Different Tenant',
                    'Cancel'
                );

                if (choice === 'Select Different Tenant') {
                    // Restart the tenant selection process
                    return this.selectTenantAndSubscription();
                }
                return false;
            }

            // Let user select subscription
            const selectedSub = await vscode.window.showQuickPick(subscriptions, {
                placeHolder: 'Select an Azure subscription'
            });

            if (!selectedSub) {
                return false;
            }

            // Initialize API Management client
            this.apiManagementClient = new ApiManagementClient(this.credential, selectedSub.subscriptionId);

            // Get API Management services in the subscription
            const apimServices = [];
            for await (const service of this.apiManagementClient.apiManagementService.list()) {
                // Extract resource group from the service ID
                const resourceGroup = service.id?.split('/')[4] || '';
                apimServices.push({
                    label: service.name || '',
                    description: `${service.location} - ${resourceGroup}`,
                    serviceName: service.name!,
                    resourceGroupName: resourceGroup
                });
            }

            if (apimServices.length === 0) {
                vscode.window.showErrorMessage('No API Management services found in the selected subscription');
                return false;
            }

            // Let user select API Management service
            const selectedApim = await vscode.window.showQuickPick(apimServices, {
                placeHolder: 'Select an API Management service'
            });

            if (!selectedApim) {
                return false;
            }

            // Fetch actual gateway URL from APIM service properties
            const actualGatewayUrl = await this.fetchApimGatewayUrl(selectedSub.subscriptionId, selectedApim.resourceGroupName, selectedApim.serviceName);

            // Store connection details
            this.connection = {
                tenantId: selectedSub.tenantId,
                subscriptionId: selectedSub.subscriptionId,
                resourceGroupName: selectedApim.resourceGroupName,
                serviceName: selectedApim.serviceName,
                accessToken: (await this.credential.getToken(this.requiredScopes))!.token,
                gatewayUrl: actualGatewayUrl || undefined
            };

            // Initialize Log Analytics client with automatic token refresh
            await this.refreshLogsToken(selectedSub.tenantId);

            // Create credential with automatic refresh
            this.logsCredential = {
                getToken: async (scopes?: string | string[]) => {
                    return await this.getLogsAccessToken(selectedSub.tenantId);
                }
            };

            this.logsClient = new LogsQueryClient(this.logsCredential);

            vscode.window.showInformationMessage(`Connected to ${selectedApim.serviceName}`);
            return true;

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error}`);
            return false;
        }
    }

    private async fetchApimGatewayUrl(subscriptionId: string, resourceGroupName: string, serviceName: string): Promise<string | null> {
        try {
            if (!this.credential) {
                throw new Error('Not authenticated');
            }

            // Get access token for management API
            const tokenResponse = await this.credential.getToken(this.requiredScopes);
            if (!tokenResponse) {
                throw new Error('Failed to get access token');
            }

            // Construct the Azure Management REST API URL to get APIM service details
            const apiUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}?api-version=2021-08-01`;

            console.log(`[AzureService] Fetching APIM service details from: ${apiUrl}`);

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`[AzureService] Failed to fetch APIM service details: ${response.status} ${response.statusText}`);
                return null;
            }

            const serviceDetails = await response.json();
            console.log(`[AzureService] APIM service details:`, JSON.stringify(serviceDetails, null, 2));

            // Extract gateway URL from properties.gatewayUrl
            if (serviceDetails.properties && serviceDetails.properties.gatewayUrl) {
                const gatewayUrl = serviceDetails.properties.gatewayUrl;
                console.log(`[AzureService] Extracted gateway URL: ${gatewayUrl}`);
                return gatewayUrl;
            }

            // Fallback to default construction if gatewayUrl is not available
            console.log(`[AzureService] Gateway URL not found in service properties, using default construction`);
            return `https://${serviceName}.azure-api.net`;

        } catch (error) {
            console.error('[AzureService] Error fetching APIM gateway URL:', error);
            // Return fallback URL on error
            return `https://${serviceName}.azure-api.net`;
        }
    }

    disconnect(): void {
        this.connection = null;
        this.apiManagementClient = null;
        this.subscriptionClient = null;
        this.logsClient = null;
        this.credential = null;
    }

    isConnected(): boolean {
        return this.connection !== null && this.apiManagementClient !== null;
    }

    getConnection(): AzureConnection | null {
        return this.connection;
    }

    async getApis(): Promise<ApiManagementApi[]> {
        if (!this.apiManagementClient || !this.connection) {
            throw new Error('Not connected to Azure API Management');
        }

        return await this.executeWithTokenRefresh(async () => {
            const apis: ApiManagementApi[] = [];
            
            for await (const api of this.apiManagementClient!.api.listByService(
                this.connection!.resourceGroupName,
                this.connection!.serviceName
            )) {
                // Only include inference APIs (you might want to filter based on naming convention or tags)
                if (api.name && this.isInferenceApi(api)) {
                    // Get the actual gateway URL from connection or fallback to constructed URL
                    const actualGatewayUrl = this.connection!.gatewayUrl || `https://${this.connection!.serviceName}.azure-api.net`;
                    const apiPath = api.path || '';
                    const fullGatewayUrl = `${actualGatewayUrl}/${apiPath}`;
                    
                    console.log(`[AzureService] API: ${api.name}, Path: ${apiPath}, Gateway: ${actualGatewayUrl}, Full URL: ${fullGatewayUrl}`);
                    
                    apis.push({
                        id: api.name,
                        name: api.name,
                        displayName: api.displayName || api.name,
                        description: api.description,
                        serviceUrl: api.serviceUrl,
                        path: apiPath,
                        protocols: api.protocols || [],
                        subscriptionRequired: api.subscriptionRequired || false,
                        gatewayUrl: fullGatewayUrl,
                        baseGatewayUrl: actualGatewayUrl
                    });
                }
            }
            
            return apis;
        }, 'management');
    }

    async getSubscriptions(): Promise<ApiManagementSubscription[]> {
        if (!this.apiManagementClient || !this.connection) {
            throw new Error('Not connected to Azure API Management');
        }

        return await this.executeWithTokenRefresh(async () => {
            const subscriptions: ApiManagementSubscription[] = [];
            
            for await (const sub of this.apiManagementClient!.subscription.list(
                this.connection!.resourceGroupName,
                this.connection!.serviceName
            )) {
                if (sub.name) {
                    // Get subscription keys
                    const keys = await this.apiManagementClient!.subscription.listSecrets(
                        this.connection!.resourceGroupName,
                        this.connection!.serviceName,
                        sub.name
                    );

                    subscriptions.push({
                        id: sub.name,
                        name: sub.name,
                        displayName: sub.displayName || sub.name,
                        state: sub.state || 'unknown',
                        primaryKey: keys.primaryKey || '',
                        secondaryKey: keys.secondaryKey || '',
                        scope: sub.scope || '',
                        createdDate: sub.createdDate || new Date()
                    });
                }
            }
            
            return subscriptions;
        }, 'management');
    }

    async getModelsFromLogs(filters?: AnalyticsFilters): Promise<ModelUsage[]> {
        if (!this.logsClient || !this.connection) {
            console.log('Not connected to Azure API Management - returning empty models');
            return [];
        }

        try {
            const query = this.buildModelsQuery(filters);
            console.log("query: ", query);
            const resourceId = `/subscriptions/${this.connection.subscriptionId}/resourceGroups/${this.connection.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.connection.serviceName}`;
            
            const result = await this.logsClient.queryResource(
                resourceId,
                query,
                { 
                    // Use the time range from filters or default to last 30 days
                    startTime: filters?.timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endTime: filters?.timeRange?.end || new Date()
                }
            );
            console.log("result: ", result);

            // Parse the results and return model usage data
            const table = 'tables' in result ? result.tables[0] : null;
            const models = this.parseModelUsageResults(table?.rows || []);
            
            // Return models array (empty or populated) - let the UI handle empty state
            return models;
        } catch (error) {
            console.log(`Failed to fetch models from Azure Monitor: ${error}`);
            // Return empty array instead of throwing error
            return [];
        }
    }

    async getBackendsFromLogs(filters?: AnalyticsFilters): Promise<BackendUsage[]> {
        if (!this.logsClient || !this.connection) {
            console.log('Not connected to Azure API Management - returning empty backends');
            return [];
        }

        try {
            const query = this.buildBackendsQuery(filters);
            console.log("backend query: ", query);
            const resourceId = `/subscriptions/${this.connection.subscriptionId}/resourceGroups/${this.connection.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.connection.serviceName}`;
            
            const result = await this.logsClient.queryResource(
                resourceId,
                query,
                { 
                    // Use the time range from filters or default to last 30 days
                    startTime: filters?.timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endTime: filters?.timeRange?.end || new Date()
                }
            );
            console.log("backend result: ", result);

            // Parse the results and return backend usage data
            const table = 'tables' in result ? result.tables[0] : null;
            const backends = this.parseBackendUsageResults(table?.rows || []);
            
            // Return backends array (empty or populated) - let the UI handle empty state
            return backends;
        } catch (error) {
            console.log(`Failed to fetch backends from Azure Monitor: ${error}`);
            // Return empty array instead of throwing error
            return [];
        }
    }

    async getAnalyticsSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
        if (!this.logsClient || !this.connection) {
            console.log('Not connected to Azure API Management - returning empty summary');
            return this.parseAnalyticsSummary([]);
        }

        try {
            const query = this.buildSummaryQuery(filters);
            const resourceId = `/subscriptions/${this.connection.subscriptionId}/resourceGroups/${this.connection.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.connection.serviceName}`;
            
            const result = await this.logsClient.queryResource(
                resourceId,
                query,
                { 
                    startTime: filters.timeRange.start,
                    endTime: filters.timeRange.end
                }
            );
            console.log("result: ", result);

            const table = 'tables' in result ? result.tables[0] : null;
            return this.parseAnalyticsSummary(table?.rows[0] || []);
        } catch (error) {
            console.log(`Failed to fetch analytics summary from Azure Monitor: ${error}`);
            // Return empty summary instead of throwing error
            return this.parseAnalyticsSummary([]);
        }
    }

    async getLogs(filters: AnalyticsFilters, limit: number = 100): Promise<LogAnalyticsResult[]> {
        if (!this.logsClient || !this.connection) {
            console.log('Not connected to Azure API Management - returning empty logs');
            return [];
        }

        try {
            const query = this.buildLogsQuery(filters, limit);
            const resourceId = `/subscriptions/${this.connection.subscriptionId}/resourceGroups/${this.connection.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.connection.serviceName}`;
            
            const result = await this.logsClient.queryResource(
                resourceId,
                query,
                { 
                    startTime: filters.timeRange.start,
                    endTime: filters.timeRange.end
                }
            );

            const table = 'tables' in result ? result.tables[0] : null;
            return this.parseLogResults(table?.rows || []);
        } catch (error) {
            console.log(`Failed to fetch logs from Azure Monitor: ${error}`);
            // Return empty logs instead of throwing error
            return [];
        }
    }

    async createSubscription(name: string, displayName: string, scope: string): Promise<void> {
        if (!this.apiManagementClient || !this.connection) {
            throw new Error('Not connected to Azure API Management');
        }

        try {
            await this.apiManagementClient.subscription.createOrUpdate(
                this.connection.resourceGroupName,
                this.connection.serviceName,
                name,
                {
                    displayName,
                    scope,
                    state: 'active'
                }
            );
        } catch (error) {
            throw new Error(`Failed to create subscription: ${error}`);
        }
    }

    private isInferenceApi(api: any): boolean {
        // You can customize this logic based on your API naming convention
        // For example, check if the API name contains 'inference', 'ai', 'ml', etc.
        const inferenceKeywords = ['inference', 'ai', 'ml', 'openai', 'cognitive', 'chat', 'completion'];
        const apiName = (api.displayName || api.name || '').toLowerCase();
        return inferenceKeywords.some(keyword => apiName.includes(keyword));
    }

    private buildModelsQuery(filters?: AnalyticsFilters): string {
        let query = `
                let llmHeaderLogs = ApiManagementGatewayLlmLog 
                | where DeploymentName != ''; 
                let llmLogsWithSubscriptionId = llmHeaderLogs 
                | join kind=leftouter ApiManagementGatewayLogs on CorrelationId 
                | project 
                    TimeGenerated, 
                    SubscriptionId = ApimSubscriptionId, 
                    DeploymentName, 
                    PromptTokens, 
                    CompletionTokens, 
                    TotalTokens,
                    ResponseCode,
                    TotalTime,
                    ApiId,
                    OperationId,
                    Region,
                    Backend = parse_url(BackendUrl).Host,
                    CorrelationId;
                llmLogsWithSubscriptionId
                | where 1 == 1
                | summarize 
                    TotalTokens = sum(PromptTokens + CompletionTokens),
                    PromptTokens = sum(PromptTokens),
                    CompletionTokens = sum(CompletionTokens),
                    RequestCount = count(),
                    AvgLatency = avg(TotalTime),
                    ErrorRate = countif(ResponseCode >= 400) * 100.0 / count(),
                    SuccessRate = countif(ResponseCode < 400) * 100.0 / count()
                by DeploymentName
                | order by TotalTokens desc 
        `;

        if (filters) {
            const whereConditions = this.buildWhereConditions(filters);

            if (whereConditions.length > 0) {
                query = query.replace('| where 1 == 1', `| where ${whereConditions.join(' and ')}`);
            }
        }

        return query;
    }

    private buildBackendsQuery(filters?: AnalyticsFilters): string {
        let query = `
                let llmHeaderLogs = ApiManagementGatewayLlmLog 
                | where DeploymentName != ''; 
                let llmLogsWithSubscriptionId = llmHeaderLogs 
                | join kind=leftouter ApiManagementGatewayLogs on CorrelationId 
                | project 
                    TimeGenerated, 
                    SubscriptionId = ApimSubscriptionId, 
                    DeploymentName, 
                    PromptTokens, 
                    CompletionTokens, 
                    TotalTokens,
                    ResponseCode,
                    TotalTime,
                    ApiId,
                    OperationId,
                    Region,
                    Backend = parse_url(BackendUrl).Host,
                    CorrelationId;
                llmLogsWithSubscriptionId
                | where 1 == 1
                | summarize 
                    TotalTokens = sum(PromptTokens + CompletionTokens),
                    PromptTokens = sum(PromptTokens),
                    CompletionTokens = sum(CompletionTokens),
                    RequestCount = count(),
                    AvgLatency = avg(TotalTime),
                    ErrorRate = countif(ResponseCode >= 400) * 100.0 / count(),
                    SuccessRate = countif(ResponseCode < 400) * 100.0 / count()
                by tostring(Backend)
                | order by TotalTokens desc 
        `;

        if (filters) {
            const whereConditions = this.buildWhereConditions(filters);

            if (whereConditions.length > 0) {
                query = query.replace('| where 1 == 1', `| where ${whereConditions.join(' and ')}`);
            }
        }

        return query;
    }


    private buildSummaryQuery(filters?: AnalyticsFilters): string {
        let query = `
                let llmHeaderLogs = ApiManagementGatewayLlmLog 
                | where DeploymentName != ''; 
                let llmLogsWithSubscriptionId = llmHeaderLogs 
                | join kind=leftouter ApiManagementGatewayLogs on CorrelationId 
                | project 
                    TimeGenerated, 
                    SubscriptionId = ApimSubscriptionId, 
                    DeploymentName, 
                    PromptTokens, 
                    CompletionTokens, 
                    TotalTokens,
                    ResponseCode,
                    TotalTime,
                    ApiId,
                    OperationId,
                    Region,
                    Backend = parse_url(BackendUrl).Host,
                    CorrelationId;
                llmLogsWithSubscriptionId
                | where 1 == 1
                | summarize 
                    TotalTokens = sum(PromptTokens + CompletionTokens),
                    PromptTokens = sum(PromptTokens),
                    CompletionTokens = sum(CompletionTokens),
                    RequestCount = count(),
                    AvgLatency = avg(TotalTime),
                    ErrorRate = countif(ResponseCode >= 400) * 100.0 / count(),
                    SuccessRate = countif(ResponseCode < 400) * 100.0 / count()
                | order by TotalTokens desc 
        `;

        if (filters) {
            const whereConditions = this.buildWhereConditions(filters);

            if (whereConditions.length > 0) {
                query = query.replace('| where 1 == 1', `| where ${whereConditions.join(' and ')}`);
            }
        }

        return query;
    }

    private buildLogsQuery(filters: AnalyticsFilters, limit: number): string {
        let query = `
            ApiManagementGatewayLlmLog
            | extend RequestArray = parse_json(RequestMessages)
            | extend ResponseArray = parse_json(ResponseMessages)
            | mv-expand RequestArray
            | mv-expand ResponseArray
            | project
                CorrelationId, 
                DeploymentName,
                Region,
                PromptTokens,
                CompletionTokens,
                Streamed = IsStreamCompletion,
                RequestContent = tostring(RequestArray.content), 
                ResponseContent = tostring(ResponseArray.content)
            | summarize 
                PromptRequest = strcat_array(make_list(RequestContent), ""), 
                CompletionResponse = strcat_array(make_list(ResponseContent), "")
                by CorrelationId 
            | where isnotempty(PromptRequest) and isnotempty(CompletionResponse)
            | join kind=leftouter ApiManagementGatewayLogs on CorrelationId 
            | project CorrelationId, SubscriptionId = ApimSubscriptionId, Backend = parse_url(BackendUrl).Host, PromptRequest, CompletionResponse, ApiId, StatusCode = ResponseCode
            | join kind=leftouter ApiManagementGatewayLlmLog on CorrelationId 
            | project Timestamp = TimeGenerated, CorrelationId, ApiId, SubscriptionId, DeploymentName, Backend, Region, PromptRequest, CompletionResponse, PromptTokens, CompletionTokens, Streamed = IsStreamCompletion, StatusCode
            | where PromptTokens > 0
            | where 1 == 1
            | order by Timestamp desc
            | limit ${limit}
        `;

        const whereConditions = this.buildWhereConditions(filters);
        if (whereConditions.length > 0) {
            query = query.replace('| where 1 == 1', `| where ${whereConditions.join(' and ')}`);
        }

        return query;
    }

    private buildWhereConditions(filters: AnalyticsFilters): string[] {
        const conditions = [];
 
        if (filters.apiIds && filters.apiIds.length > 0) {
            conditions.push(`ApiId in (${filters.apiIds.map(id => `"${id}"`).join(', ')})`);
        }
        if (filters.subscriptionNames && filters.subscriptionNames.length > 0) {
            conditions.push(`SubscriptionId in (${filters.subscriptionNames.map(name => `"${name}"`).join(', ')})`);
        }
        if (filters.backends && filters.backends.length > 0) {
            conditions.push(`Backend in (${filters.backends.map(name => `"${name}"`).join(', ')})`);
        }
        if (filters.modelNames && filters.modelNames.length > 0) {
            conditions.push(`DeploymentName in (${filters.modelNames.map(name => `"${name}"`).join(', ')})`);
        }
        
        return conditions;
    }

    private parseModelUsageResults(rows: any[]): ModelUsage[] {
        return rows.map(row => ({
            modelName: row[0] || 'Unknown',
            totalTokens: Number(row[1]) || 0,
            promptTokens: Number(row[2]) || 0,
            completionTokens: Number(row[3]) || 0,
            requestCount: Number(row[4]) || 0,
            averageLatency: Number(row[5]) || 0,
            errorRate: Number(row[6]) || 0,
            successRate: Number(row[7]) || 0
        }));
    }

    private parseBackendUsageResults(rows: any[]): BackendUsage[] {
        return rows.map(row => ({
            backendName: row[0] || 'Unknown',
            totalTokens: Number(row[1]) || 0,
            promptTokens: Number(row[2]) || 0,
            completionTokens: Number(row[3]) || 0,
            requestCount: Number(row[4]) || 0,
            averageLatency: Number(row[5]) || 0,
            errorRate: Number(row[6]) || 0,
            successRate: Number(row[7]) || 0
        }));
    }

    private parseAnalyticsSummary(row: any[]): AnalyticsSummary {
        return {
            totalTokens: Number(row[0]) || 0,
            promptTokens: Number(row[1]) || 0,
            completionTokens: Number(row[2]) || 0,
            totalRequests: Number(row[3]) || 0,
            averageLatency: Number(row[4]) || 0,
            errorRate: Number(row[5]) || 0
        };
    }

    private parseLogResults(rows: any[]): LogAnalyticsResult[] {
        return rows.map(row => ({
            timestamp: new Date(row[0]),
            correlationId: row[1],
            apiName: row[2],
            subscriptionName: row[3],
            modelName: row[4],
            backend: row[5],
            region: row[6],
            promptRequest: row[7],
            completionResponse: row[8],
            promptTokens: row[9],
            completionTokens: row[10],
            streamed: row[11],
            statusCode: row[12]
        }));
    }

    async getUsageTrend(filters?: AnalyticsFilters): Promise<Array<{time: string, prompts: number, completions: number, totalTokens: number}>> {
        if (!this.logsClient || !this.connection) {
            console.log('Not connected to Azure API Management - returning empty trend data');
            return this.generateEmptyTrendData(filters);
        }

        try {
            // Log the time range for debugging
            if (filters?.timeRange) {
                console.log(`Usage trend time range: ${filters.timeRange.start.toISOString()} to ${filters.timeRange.end.toISOString()}`);
                const diffMs = filters.timeRange.end.getTime() - filters.timeRange.start.getTime();
                const diffMinutes = diffMs / (1000 * 60);
                console.log(`Time range difference: ${diffMinutes.toFixed(1)} minutes`);
            }
            
            const query = this.buildUsageTrendQuery(filters);
            console.log("Usage trend query: ", query);
            const resourceId = `/subscriptions/${this.connection.subscriptionId}/resourceGroups/${this.connection.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.connection.serviceName}`;
            
            const queryOptions = { 
                startTime: filters?.timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000),
                endTime: filters?.timeRange?.end || new Date()
            };

            const result = await this.logsClient.queryResource(
                resourceId,
                query,
                queryOptions
            );

            const table = 'tables' in result ? result.tables[0] : null;
            console.log('Usage trend query result structure:', {
                hasTable: !!table,
                columnNames: table?.columnDescriptors?.map((c: any) => c.name),
                columnTypes: table?.columnDescriptors?.map((c: any) => c.type),
                rowCount: table?.rows?.length || 0
            });
            
            const trendData = this.parseUsageTrendResults(table?.rows || [], filters);
            console.log(`Usage trend data: ${table?.rows?.length || 0} raw rows -> ${trendData.length} data points`);
            
            return trendData;
        } catch (error) {
            console.log(`Failed to fetch usage trend from Azure Monitor: ${error}`);
            // Return empty trend data if query fails
            return this.generateEmptyTrendData(filters);
        }
    }

    private buildUsageTrendQuery(filters?: AnalyticsFilters): string {
        const timeRange = filters?.timeRange;
        let binSize = '1h'; // Default to hourly for 24h range
        let timeLabelFormat = 'HH:mm';
        let timeRangeAgo = '24h';
        if (timeRange) {
            const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            const diffHours = diffMinutes / (60);
            const diffDays = diffHours / 24;
            
            console.log(`Usage trend - Time range: ${diffHours.toFixed(1)}h, using ${diffHours <= 24 ? '1h' : '1d'} binSize`);

            if (diffMinutes <= 30) {
                binSize = '1m'; // Second intervals for 30 minutes or less
                timeLabelFormat = 'HH:mm';
                timeRangeAgo = '30m';
            } else if (diffMinutes <= 60) {
                binSize = '1m'; // Minute intervals for 60 minutes or less
                timeLabelFormat = 'HH:mm';
                timeRangeAgo = '1h';
            } else if (diffHours <= 24) {
                binSize = '1h'; // Hourly intervals for 24 hours or less
                timeLabelFormat = 'MM-dd HH:mm';
                timeRangeAgo = '24h';
            } else if (diffDays <= 7) {
                binSize = '1d'; // Daily intervals for 7 days or less
                timeLabelFormat = 'MM-dd';
                timeRangeAgo = '7d';
            } else if (diffDays <= 30) {
                binSize = '1d'; // Daily intervals for 30 days or less
                timeLabelFormat = 'MM-dd';
                timeRangeAgo = '30d';
            } else {
                binSize = '1d'; // Daily intervals for longer periods
                timeLabelFormat = 'MM-dd';
                timeRangeAgo = '30d';
            }
        }

        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('User timezone:', userTimezone); // e.g., "America/Los_Angeles"

        let query = `
                let startTime = ago(${timeRangeAgo});
                let endTime = now();
                let dateRange = range TimeGenerated from bin(startTime, ${binSize}) to bin(endTime, ${binSize}) step ${binSize};
                let llmLogsWithSubscription = ApiManagementGatewayLlmLog 
                | where DeploymentName != ''
                | where TimeGenerated between (startTime .. endTime)
                | join kind=leftouter ApiManagementGatewayLogs on CorrelationId
                | project TimeGenerated, PromptTokens, CompletionTokens, SubscriptionId = ApimSubscriptionId, DeploymentName, ApiId, Backend = parse_url(BackendUrl).Host
                | where 1 == 1;
                let aggregatedData = llmLogsWithSubscription
                | extend DayBin = bin(TimeGenerated, ${binSize})
                | summarize 
                    Prompts = sum(PromptTokens),
                    Completions = sum(CompletionTokens),
                    TotalTokens = sum(PromptTokens + CompletionTokens)
                    by DayBin;
                dateRange
                | join kind=leftouter aggregatedData on $left.TimeGenerated == $right.DayBin
                | project 
                    TimeGenerated,
                    TimeLabel = format_datetime(TimeGenerated, '${timeLabelFormat}'),
                    Prompts = toint(coalesce(Prompts, 0)),
                    Completions = toint(coalesce(Completions, 0)), 
                    TotalTokens = toint(coalesce(TotalTokens, 0))
                | order by TimeGenerated asc
        `;

        if (filters) {
            const whereConditions = this.buildWhereConditions(filters);
            if (whereConditions.length > 0) {
                query = query.replace('| where 1 == 1', `| where ${whereConditions.join(' and ')}`);
            }
        }

        return query;
    }

    private parseUsageTrendResults(rows: any[], filters?: AnalyticsFilters): Array<{time: string, prompts: number, completions: number, totalTokens: number}> {
        if (rows.length === 0) {
            return this.generateEmptyTrendData(filters);
        }

        const results: Array<{time: string, prompts: number, completions: number, totalTokens: number}> = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                // Log the first few rows for debugging
                if (i < 3) {
                    console.log(`Usage trend row ${i}:`, row);
                }
                
                // Try to parse the time value - it should be in row[0] (TimeGenerated)
                let timeValue = row[0]; // TimeGenerated is typically the first column
                if (timeValue === null || timeValue === undefined) {
                    console.warn(`Skipping row ${i}: null/undefined time value`);
                    continue;
                }
                
                // Handle different time formats that might come from KQL
                let parsedTime: Date;
                if (typeof timeValue === 'string') {
                    parsedTime = new Date(timeValue);
                } else if (timeValue instanceof Date) {
                    parsedTime = timeValue;
                } else {
                    // Try to convert to string first
                    parsedTime = new Date(String(timeValue));
                }
                
                // Check if the parsed time is valid
                if (isNaN(parsedTime.getTime())) {
                    console.warn(`Skipping row ${i}: invalid time value '${timeValue}'`);
                    continue;
                }
                
                results.push({
                    time: parsedTime.toISOString(),
                    prompts: Number(row[2]) || 0,      // Prompts column
                    completions: Number(row[3]) || 0,  // Completions column  
                    totalTokens: Number(row[4]) || 0   // TotalTokens column
                });
            } catch (error) {
                console.warn(`Error parsing usage trend row ${i}:`, error, 'Row data:', row);
                continue;
            }
        }
        
        // If no valid results were parsed, return empty data
        if (results.length === 0) {
            console.log('No valid usage trend data parsed, returning empty trend data');
            return this.generateEmptyTrendData(filters);
        }
        
        return results;
    }

    private generateEmptyTrendData(filters?: AnalyticsFilters): Array<{time: string, prompts: number, completions: number, totalTokens: number}> {
        const timeRange = filters?.timeRange;
        if (!timeRange) {
            // Default to last 24 hours
            const now = new Date();
            const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return this.generateTimeSeriesData(start, now);
        }
        
        return this.generateTimeSeriesData(timeRange.start, timeRange.end);
    }

    private generateTimeSeriesData(start: Date, end: Date): Array<{time: string, prompts: number, completions: number, totalTokens: number}> {
        const diffMs = end.getTime() - start.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        let intervalMs: number;
        let count: number;
        
        if (diffHours <= 1) {
            // 1-minute intervals for 1 hour or less
            intervalMs = 1 * 60 * 1000;
            count = Math.ceil(diffMs / intervalMs);
        } else if (diffHours <= 24) {
            // 1-hour intervals for 24 hours
            intervalMs = 60 * 60 * 1000;
            count = Math.ceil(diffMs / intervalMs);
        } else if (diffHours <= 7 * 24) {
            // 1-day intervals for 7 days (to match the query binning)
            intervalMs = 24 * 60 * 60 * 1000;
            count = Math.ceil(diffMs / intervalMs);
        } else {
            // 1-day intervals for longer periods
            intervalMs = 24 * 60 * 60 * 1000;
            count = Math.ceil(diffMs / intervalMs);
        }

        const data = [];
        for (let i = 0; i < count; i++) {
            const time = new Date(start.getTime() + i * intervalMs);
            data.push({
                time: time.toISOString(),
                prompts: 0,
                completions: 0,
                totalTokens: 0
            });
        }
        
        return data;
    }


}