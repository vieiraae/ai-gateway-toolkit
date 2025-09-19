import React, { useState, useEffect, useRef } from 'react';
import OpenAI, { AzureOpenAI } from "openai";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

// Declare global vscode API (provided by webview)
declare global {
    interface Window {
        vscode: {
            postMessage(message: any): void;
        };
    }
    const vscode: {
        postMessage(message: any): void;
    };
}

interface PlaygroundMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokens?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    latency?: number;
    rawRequest?: any;
    rawResponse?: any;
    traceInfo?: any;
}

interface PlaygroundState {
    messages: PlaygroundMessage[];
    sdk: string;
    apiId: string;
    modelName: string;
    subscriptionId: string;
    apiVersion: string;
    inferenceApiType: 'Chat Completions' | 'Responses API';
    stream: boolean;
    trace: boolean;
    instructions: string;
    currentPrompt: string;
    isLoading: boolean;
    apis: Array<{ id: string; name: string; displayName: string }>;
    subscriptions: Array<{ id: string; name: string; displayName: string }>;
    models: Array<{ modelName: string; displayName: string; usage?: number }>;
}

const Playground: React.FC = () => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isSettingsPanelCollapsed, setIsSettingsPanelCollapsed] = useState(false);
    const [state, setState] = useState<PlaygroundState>({
        messages: [],
        sdk: 'azure-openai',
        apiId: '',
        modelName: '',
        subscriptionId: '',
        apiVersion: '2025-03-01-preview',
        inferenceApiType: 'Chat Completions',
        stream: false,
        trace: false,
        instructions: 'You are an AI assistant that helps developers use the AI Gateway in Azure API Management.',
        currentPrompt: '',
        isLoading: false,
        apis: [],
        subscriptions: [],
        models: []
    });
    const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

    // Function to scroll to the bottom of the messages container
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        // Listen for messages from the extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'messageResponse':
                    handleMessageResponse(message.data);
                    break;
                case 'apisData':
                    setState(prev => ({ 
                        ...prev, 
                        apis: message.data,
                        // Auto-select first API if none is selected
                        apiId: prev.apiId || (message.data.length > 0 ? message.data[0].id : '')
                    }));
                    break;
                case 'subscriptionsData':
                    setState(prev => ({ 
                        ...prev, 
                        subscriptions: message.data,
                        // Auto-select second subscription if none is selected and at least 2 subscriptions exist
                        subscriptionId: prev.subscriptionId || (message.data.length > 1 ? message.data[1].id : message.data.length > 0 ? message.data[0].id : '')
                    }));
                    break;
                case 'modelsData':
                    console.log('[Playground] Received modelsData:', message.data);
                    setState(prev => ({ 
                        ...prev, 
                        models: message.data,
                        // Auto-select first model if none is selected
                        modelName: prev.modelName || (message.data.length > 0 ? message.data[0].modelName : '')
                    }));
                    break;
                case 'setSelection':
                    console.log('[Playground] Received setSelection:', message.data);
                    setState(prev => ({
                        ...prev,
                        apiId: message.data.apiId || prev.apiId,
                        subscriptionId: message.data.subscriptionId || prev.subscriptionId,
                        modelName: message.data.modelName || prev.modelName
                    }));
                    break;
                case 'setFilters':
                    console.log('[Playground] Received setFilters:', message.data);
                    // Apply filters to playground state
                    setState(prev => ({
                        ...prev,
                        apiId: message.data.apiId || prev.apiId,
                        subscriptionId: message.data.subscriptionId || prev.subscriptionId,
                        modelName: message.data.modelName || prev.modelName
                    }));
                    break;
                case 'error':
                    console.error('Playground error:', message.data.message);
                    setState(prev => ({ ...prev, isLoading: false }));
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Request initial data
        vscode.postMessage({ type: 'getApis' });
        vscode.postMessage({ type: 'getSubscriptions' });
        vscode.postMessage({ type: 'getModels' });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Auto-scroll when messages change
    useEffect(() => {
        // Use setTimeout to ensure the DOM has updated before scrolling
        const timeoutId = setTimeout(() => {
            scrollToBottom();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [state.messages.length, state.isLoading]);

    const handleMessageResponse = (response: any) => {
        const assistantMessage: PlaygroundMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content: response.content,
            timestamp: new Date(),
            tokens: response.tokens,
            latency: response.latency,
            rawRequest: response.rawRequest,
            rawResponse: response.rawResponse,
            traceInfo: response.traceInfo
        };

        setState(prev => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
            isLoading: false
        }));
    };

    const sendMessage = () => {
        if (!state.currentPrompt.trim() || !state.sdk || !state.apiId || !state.subscriptionId || !state.modelName.trim()) {
            return;
        }

        const userMessage: PlaygroundMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: state.currentPrompt,
            timestamp: new Date()
        };

        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            isLoading: true,
            currentPrompt: ''
        }));

        const selectedApi = state.apis.find(api => api.id === state.apiId);
        if (selectedApi) {
            const apiAny = selectedApi as any;
            const serviceUrl =
                apiAny.serviceUrl

            if (serviceUrl) {
                console.log('[Playground] API Management Service URL:', serviceUrl);
            } else {
                console.warn('[Playground] Service URL not found on selected API object:', selectedApi);
            }
        } else {
            console.warn('[Playground] No API selected or API not found for id:', state.apiId);
        }

        // Send message to extension
        vscode.postMessage({
            type: 'sendMessage',
            data: {
                sdk: state.sdk,
                apiId: state.apiId,
                modelName: state.modelName,
                subscriptionId: state.subscriptionId,
                apiVersion: state.apiVersion,
                inferenceApiType: state.inferenceApiType,
                stream: state.stream,
                trace: state.trace,
                instructions: state.instructions,
                prompt: state.currentPrompt
            }
        });
    };

    const clearConversation = () => {
        setState(prev => ({ ...prev, messages: [] }));
    };

    const toggleMessageExpansion = (messageId: string) => {
        setExpandedMessage(expandedMessage === messageId ? null : messageId);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    console.log('Playground component rendering, state:', state);

    return (
        <div className="playground-container">
            <div className="main-content">
                <div className="playground-header">
                    <h1>AI Gateway Playground</h1>
                </div>
                <div className="conversation-area">
                    <div className="messages-container" ref={messagesContainerRef}>
                    {state.messages.length === 0 ? (
                        <div className="empty-state">
                            <p>Start a conversation by typing a message below.</p>
                        </div>
                    ) : (
                        state.messages.map(message => (
                            <div key={message.id} className={`message ${message.type}`}>
                                <div className="message-header">
                                    <span className="message-type">
                                        {message.type === 'user' ? 'You' : 'Assistant'}
                                    </span>
                                    <span className="message-timestamp">
                                        {message.timestamp.toLocaleTimeString()}
                                    </span>
                                    {message.type === 'assistant' && (
                                        <div className="message-stats">
                                            {message.tokens && (
                                                <span>Tokens: {message.tokens.total_tokens}</span>
                                            )}
                                            {message.latency && (
                                                <span>Latency: {message.latency}ms</span>
                                            )}
                                            <button
                                                onClick={() => toggleMessageExpansion(message.id)}
                                                className="expand-button"
                                            >
                                                {expandedMessage === message.id ? 'Hide Details' : 'Show Details'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="message-content">
                                    <pre>{message.content}</pre>
                                </div>
                                
                                {expandedMessage === message.id && message.type === 'assistant' && (
                                    <div className="message-details">
                                        {message.rawRequest && (
                                            <div className="detail-section">
                                                <h4>Raw Request</h4>
                                                <pre>{JSON.stringify(message.rawRequest, null, 2)}</pre>
                                            </div>
                                        )}
                                        
                                        {message.rawResponse && (
                                            <div className="detail-section">
                                                <h4>Raw Response</h4>
                                                <pre>{JSON.stringify(message.rawResponse, null, 2)}</pre>
                                            </div>
                                        )}
                                        
                                        {message.traceInfo && (
                                            <div className="detail-section">
                                                <h4>Trace Information</h4>
                                                <pre>{JSON.stringify(message.traceInfo, null, 2)}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    
                    {state.isLoading && (
                        <div className="message assistant loading">
                            <div className="message-header">
                                <span className="message-type">Assistant</span>
                            </div>
                            <div className="message-content">
                                <div className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="input-area">
                    <div className="input-container">
                        <textarea
                            value={state.currentPrompt}
                            onChange={(e) => setState(prev => ({ ...prev, currentPrompt: e.target.value }))}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message here... (Shift+Enter for new line, Enter to send)"
                            rows={3}
                            disabled={state.isLoading || !state.sdk || !state.apiId || !state.subscriptionId || !state.modelName.trim()}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={state.isLoading || !state.currentPrompt.trim() || !state.sdk || !state.apiId || !state.subscriptionId || !state.modelName.trim()}
                            className="send-button"
                        >
                            {state.isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </div>
                </div>
            </div>
            
            {/* Settings Panel */}
            <div className={`settings-panel ${isSettingsPanelCollapsed ? 'collapsed' : ''}`}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button 
                        className="toggle-button"
                        onClick={() => setIsSettingsPanelCollapsed(!isSettingsPanelCollapsed)}
                    >
                        {isSettingsPanelCollapsed ? '◀' : '▶'}
                    </button>
                </div>
                
                <div className="settings-content">
                    <div className="config-section">
                        <div className="config-group">
                            <label htmlFor="sdk-select">SDK:</label>
                            <select
                                id="sdk-select"
                                value={state.sdk}
                                onChange={(e) => setState(prev => ({ ...prev, sdk: e.target.value }))}
                            >
                                <option value="">Select SDK</option>
                                <option value="azure-openai">Azure OpenAI SDK</option>
                                <option value="azure-ai-inference">Azure AI Inference SDK</option>
                                <option value="openai-compatible">OpenAI SDK</option>
                            </select>
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="inference-api-type-select">Inference API Type:</label>
                            <select
                                id="inference-api-type-select"
                                value={state.inferenceApiType}
                                onChange={(e) => setState(prev => ({ ...prev, inferenceApiType: e.target.value as 'Chat Completions' | 'Responses API' }))}
                            >
                                <option value="Chat Completions">Chat Completions</option>
                                <option value="Responses API">Responses API</option>
                            </select>
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="api-version-input">API Version:</label>
                            <input
                                id="api-version-input"
                                type="text"
                                value={state.apiVersion}
                                onChange={(e) => setState(prev => ({ ...prev, apiVersion: e.target.value }))}
                                placeholder="2025-03-01-preview"
                            />
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="api-select">API:</label>
                            <select
                                id="api-select"
                                value={state.apiId}
                                onChange={(e) => setState(prev => ({ ...prev, apiId: e.target.value }))}
                            >
                                <option value="">Select API</option>
                                {state.apis.map(api => (
                                    <option key={api.id} value={api.id}>{api.displayName}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="model-select">Model:</label>
                            <select
                                id="model-select"
                                value={state.modelName}
                                onChange={(e) => setState(prev => ({ 
                                    ...prev, 
                                    modelName: e.target.value
                                }))}
                            >
                                <option value="">Select Model</option>
                                {state.models.map(model => (
                                    <option key={model.modelName} value={model.modelName}>
                                        {model.displayName} {model.usage ? `(${model.usage.toLocaleString()} tokens)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="subscription-select">Subscription:</label>
                            <select
                                id="subscription-select"
                                value={state.subscriptionId}
                                onChange={(e) => setState(prev => ({ ...prev, subscriptionId: e.target.value }))}
                            >
                                <option value="">Select Subscription</option>
                                {state.subscriptions.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.displayName}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="config-group checkbox">
                            <input
                                id="stream-checkbox"
                                type="checkbox"
                                checked={state.stream}
                                onChange={(e) => setState(prev => ({ ...prev, stream: e.target.checked }))}
                            />
                            <label htmlFor="stream-checkbox">Stream</label>
                        </div>
                        
                        <div className="config-group checkbox">
                            <input
                                id="trace-checkbox"
                                type="checkbox"
                                checked={state.trace}
                                onChange={(e) => setState(prev => ({ ...prev, trace: e.target.checked }))}
                            />
                            <label htmlFor="trace-checkbox">Trace (Debug the API)</label>
                        </div>
                        
                        <div className="config-group">
                            <label htmlFor="instructions-textarea">Model Instructions:</label>
                            <textarea
                                id="instructions-textarea"
                                value={state.instructions}
                                onChange={(e) => setState(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="Optional system instructions for the model..."
                                rows={3}
                            />
                        </div>
                        
                        <div className="config-group">
                            <button onClick={clearConversation} className="clear-button">
                                Clear Conversation
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Floating toggle button when panel is collapsed */}
            {isSettingsPanelCollapsed && (
                <button 
                    className="floating-toggle"
                    onClick={() => setIsSettingsPanelCollapsed(false)}
                >
                    ⚙️ Settings
                </button>
            )}
        </div>
    );
}

export default Playground;