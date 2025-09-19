import React, { useState, useEffect } from 'react';
import { 
    LineChart, 
    Line, 
    BarChart,
    Bar,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface AnalyticsData {
    summary: {
        totalRequests: number;
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
        averageLatency: number;
        errorRate: number;
    };
    usageTrend: Array<{
        time: string;
        prompts: number;
        completions: number;
        totalTokens: number;
    }>;
    modelUsage: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    topModels: Array<{
        model: string;
        totalTokens: number;
        avgLatency: number;
        errorRate: number;
        successRate: number;
    }>;
    logs: Array<{
        timestamp: string;
        correlationId: string;
        api: string;
        subscription: string;
        model: string;
        backend: string;
        region: string;
        promptRequest: string;
        completionResponse: string;
        promptTokens: number;
        completionTokens: number;
        streamed: boolean;
        statusCode: number;
    }>;
}

interface Filters {
    apiIds?: string[];
    subscriptionNames?: string[];
    backends?: string[];
    modelNames?: string[];
    timeRange: {
        start: Date;
        end: Date;
    };
}

// Helper function to safely format numbers
const safeNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
};

const AnalyticsDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({
        timeRange: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            end: new Date()
        }
    });
    const [expandedLog, setExpandedLog] = useState<number | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<string>('24h');
    const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(true);
    
    // Available filter options (would be populated from backend)
    const [filterOptions, setFilterOptions] = useState({
        apiIds: [] as string[],
        subscriptionNames: [] as string[],
        backends: [] as string[],
        modelNames: [] as string[]
    });

    useEffect(() => {
        // Listen for messages from the extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'analyticsData':
                    console.log(`Analytics data received: ${message.data.usageTrend?.length || 0} usage trend points`);
                    setData(message.data);
                    setLoading(false);
                    break;
                case 'filterOptions':
                    setFilterOptions(message.data);
                    break;
                case 'setFilters':
                    console.log('Setting filters from tree selection:', message.data);
                    const newFilters = { ...filters, ...message.data };
                    console.log('Updated filters:', newFilters);
                    setFilters(newFilters);
                    // Automatically refresh data with new filters
                    setLoading(true);
                    vscode.postMessage({
                        type: 'getAnalyticsData',
                        data: newFilters
                    });
                    break;
                case 'dataChanged':
                    console.log(`Data changed from source: ${message.data.source}`);
                    // Refresh the analytics data and filter options
                    setLoading(true);
                    vscode.postMessage({
                        type: 'getAnalyticsData',
                        data: filters
                    });
                    vscode.postMessage({
                        type: 'getFilterOptions'
                    });
                    break;
                case 'error':
                    console.error('Analytics error:', message.data.message);
                    setLoading(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Request initial data and filter options
        vscode.postMessage({
            type: 'getAnalyticsData',
            data: filters
        });
        
        vscode.postMessage({
            type: 'getFilterOptions'
        });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleFiltersChange = (newFilters: Partial<Filters>) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        setLoading(true);
        
        vscode.postMessage({
            type: 'getAnalyticsData',
            data: updatedFilters
        });
    };

    const handleRefresh = () => {
        setLoading(true);
        
        // Refresh analytics data with current filters
        vscode.postMessage({
            type: 'getAnalyticsData',
            data: filters
        });
        
        // Refresh filter options as well
        vscode.postMessage({
            type: 'getFilterOptions'
        });
    };

    const handleLogExpand = (index: number) => {
        setExpandedLog(expandedLog === index ? null : index);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading analytics data...</p>
            </div>
        );
    }

    // Handle empty data gracefully - show dashboard with zero values
    const safeData = data ? {
        summary: {
            totalRequests: safeNumber(data.summary?.totalRequests),
            totalTokens: safeNumber(data.summary?.totalTokens),
            promptTokens: safeNumber(data.summary?.promptTokens),
            completionTokens: safeNumber(data.summary?.completionTokens),
            averageLatency: safeNumber(data.summary?.averageLatency),
            errorRate: safeNumber(data.summary?.errorRate)
        },
        usageTrend: data.usageTrend || [],
        modelUsage: data.modelUsage || [],
        topModels: data.topModels || [],
        logs: data.logs || []
    } : {
        summary: {
            totalRequests: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            averageLatency: 0,
            errorRate: 0
        },
        usageTrend: [],
        modelUsage: [],
        topModels: [],
        logs: []
    };

    console.log('Rendering AnalyticsDashboard, loading:', loading);
    
    return (
        <div className="analytics-dashboard">
            <header className="dashboard-header">
                <h1>AI Gateway Analytics Dashboard</h1>
                <div className="header-controls">
                    <div className="time-range-selector">
                        <label htmlFor="headerTimeRange">Time Range:</label>
                        <select 
                            id="headerTimeRange"
                            title="Time Range"
                            onChange={(e) => {
                                const newTimeRange = e.target.value;
                                setSelectedTimeRange(newTimeRange);
                                handleFiltersChange({ 
                                    timeRange: getTimeRange(newTimeRange) 
                                });
                            }}
                            value={selectedTimeRange}
                        >
                            <option value="30m">Last 30 minutes</option>
                            <option value="1h">Last hour</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                        </select>
                    </div>
                    <div className="header-buttons">
                        <button 
                            className="refresh-btn"
                            onClick={() => {
                                console.log('Refresh button clicked');
                                handleRefresh();
                            }}
                            title="Refresh Dashboard"
                            disabled={loading}
                            style={{ backgroundColor: '#007acc', color: 'white' }}
                        >
                            {loading ? '⟳' : '🔄'} Refresh
                        </button>
                        <button 
                            className="filters-toggle-btn"
                            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                            title={filtersCollapsed ? 'Show Filters' : 'Hide Filters'}
                        >
                            {filtersCollapsed ? '◀ Filters' : 'Filters ▶'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Show notification when no data is available */}
            {safeData.summary.totalRequests === 0 && safeData.usageTrend.length === 0 && (
                <div className="no-data-notification">
                    <div className="notification-content">
                        <span className="notification-icon">ℹ️</span>
                        <span>No data available for the selected time range. Try adjusting your filters or selecting a different time period.</span>
                    </div>
                </div>
            )}

            <div className="dashboard-layout">
                {/* Main Content Area */}
                <div className={`main-content ${filtersCollapsed ? 'filters-collapsed' : 'filters-expanded'}`}>
                    {/* Summary Cards */}
                    <div className="summary-row">
                        <div className="summary-card">
                            <h3>Total Requests</h3>
                            <div className="metric">{safeData.summary.totalRequests.toLocaleString()}</div>
                            <div className="sub-metrics">
                                <span>Average Latency: {safeData.summary.averageLatency.toFixed(0)}ms</span>
                                <span>Error Rate: {safeData.summary.errorRate.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <h3>Total Tokens</h3>
                            <div className="metric">{safeData.summary.totalTokens.toLocaleString()}</div>
                            <div className="sub-metrics">
                                <span>Prompt: {safeData.summary.promptTokens.toLocaleString()}</span>
                                <span>Completion: {safeData.summary.completionTokens.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Usage Trend Chart */}
                    <div className="chart-container">
                        <h3>Token Usage Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={safeData.usageTrend}>
                                <XAxis 
                                    dataKey="time" 
                                    tickFormatter={(value) => formatXAxisTick(value, selectedTimeRange)}
                                    interval={'preserveStartEnd'}
                                    type="category"
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={(value) => formatXAxisTick(value, selectedTimeRange)}
                                />
                                <Legend />
                                <Bar dataKey="prompts" stackId="tokens" fill="#8884d8" name="Prompt Tokens" />
                                <Bar dataKey="completions" stackId="tokens" fill="#82ca9d" name="Completion Tokens" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="charts-row">
                        {/* Model Usage Distribution */}
                        <div className="chart-container half-width">
                            <h3>Model Usage Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={safeData.modelUsage}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {safeData.modelUsage.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Model Performance */}
                        <div className="table-container half-width">
                            <h3>Top Model Performance</h3>
                            <table className="performance-table">
                                <thead>
                                    <tr>
                                        <th>Model</th>
                                        <th>Total Tokens</th>
                                        <th>Avg Latency</th>
                                        <th>Error Rate</th>
                                        <th>Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeData.topModels.map((model, index) => (
                                        <tr key={index}>
                                            <td>{model.model}</td>
                                            <td>{model.totalTokens.toLocaleString()}</td>
                                            <td>{model.avgLatency.toFixed(0)}ms</td>
                                            <td>{model.errorRate.toFixed(1)}%</td>
                                            <td>{model.successRate.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="logs-container">
                        <h3>Recent Logs</h3>
                        <div className="logs-table-container">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>API</th>
                                        <th>Subscription</th>
                                        <th>Model</th>
                                        <th>Backend</th>
                                        <th>Prompt Tokens</th>
                                        <th>Completion Tokens</th>
                                        <th>Streamed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeData.logs.map((log, index) => (
                                        <React.Fragment key={index}>
                                            <tr 
                                                className={`log-row ${log.statusCode >= 400 ? 'error' : 'success'}`}
                                                onClick={() => handleLogExpand(index)}
                                            >
                                                <td>{new Date(log.timestamp).toLocaleString()}</td>
                                                <td>{log.api}</td>
                                                <td>{log.subscription}</td>
                                                <td>{log.model}</td>
                                                <td>{log.backend}</td>
                                                <td>{log.promptTokens}</td>
                                                <td>{log.completionTokens}</td>
                                                <td>{log.streamed ? 'Yes' : 'No'}</td>
                                            </tr>
                                            {expandedLog === index && (
                                                <tr className="expanded-log">
                                                    <td colSpan={12}>
                                                        <div className="log-details">
                                                            <div className="log-detail-section">
                                                                <h4>Prompt Request</h4>
                                                                <pre>{log.promptRequest}</pre>
                                                            </div>
                                                            <div className="log-detail-section">
                                                                <h4>Completion Response</h4>
                                                                <pre>{log.completionResponse}</pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Side Filters Panel */}
                <div className={`filters-sidebar ${filtersCollapsed ? 'collapsed' : 'expanded'}`}>
                    <div className="filters-section">
                        <div className="filters-header">
                            <h3>Filters</h3>
                            <button 
                                className="filters-close-btn"
                                onClick={() => setFiltersCollapsed(true)}
                                title="Hide Filters"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label htmlFor="apiIds">APIs</label>
                                <select 
                                    id="apiIds"
                                    multiple
                                    title="APIs"
                                    value={filters.apiIds || []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleFiltersChange({ apiIds: selected.length > 0 ? selected : undefined });
                                    }}
                                >
                                    {filterOptions.apiIds.map(apiId => (
                                        <option key={apiId} value={apiId}>{apiId}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label htmlFor="subscriptions">Subscriptions</label>
                                <select 
                                    id="subscriptions"
                                    multiple
                                    title="Subscription Names"
                                    value={filters.subscriptionNames || []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleFiltersChange({ subscriptionNames: selected.length > 0 ? selected : undefined });
                                    }}
                                >
                                    {filterOptions.subscriptionNames.map(subscription => (
                                        <option key={subscription} value={subscription}>{subscription}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label htmlFor="backends">Backends</label>
                                <select 
                                    id="backends"
                                    multiple
                                    title="Backend Names"
                                    value={filters.backends || []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleFiltersChange({ backends: selected.length > 0 ? selected : undefined });
                                    }}
                                >
                                    {filterOptions.backends.map(backend => (
                                        <option key={backend} value={backend}>{backend}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label htmlFor="models">Models</label>
                                <select 
                                    id="models"
                                    multiple
                                    title="Model Names"
                                    value={filters.modelNames || []}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        handleFiltersChange({ modelNames: selected.length > 0 ? selected : undefined });
                                    }}
                                >
                                    {filterOptions.modelNames.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>







                            <div className="filter-group">
                                <button 
                                    className="clear-filters-btn"
                                    onClick={() => {
                                        setSelectedTimeRange('24h');
                                        handleFiltersChange({
                                            timeRange: getTimeRange('24h'),
                                            apiIds: undefined,
                                            subscriptionNames: undefined,
                                            backends: undefined,
                                            modelNames: undefined
                                        });
                                    }}
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getTimeRange = (value: string) => {
    const now = new Date();
    let start: Date;

    switch (value) {
        case '30m':
            start = new Date(now.getTime() - 30 * 60 * 1000);
            break;
        case '1h':
            start = new Date(now.getTime() - 60 * 60 * 1000);
            break;
        case '24h':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start, end: now };
};

const formatXAxisTick = (tickItem: string | number, timeRange: string) => {
    // Handle different input types and validate date
    let date: Date;
    
    if (typeof tickItem === 'number') {
        date = new Date(tickItem);
    } else if (typeof tickItem === 'string') {
        // Try parsing as ISO string first, then as timestamp
        date = new Date(tickItem);
        if (isNaN(date.getTime())) {
            // If string parsing fails, try as timestamp
            const timestamp = parseInt(tickItem);
            if (!isNaN(timestamp)) {
                date = new Date(timestamp);
            }
        }
    } else {
        date = new Date();
    }
    
    // If date is still invalid, return the original value
    if (isNaN(date.getTime())) {
        return String(tickItem);
    }
    
    switch (timeRange) {
        case '30m':
            return date.toLocaleString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        case '1h':
            // Show minutes with seconds for 1-minute granularity in short ranges
            return date.toLocaleString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        case '24h':
            // Show hours for 24h range (hourly granularity)
            return date.toLocaleString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        case '7d':
            // Show date for 7 days (daily granularity)
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        case '30d':
            // Show date for 30 days (daily granularity)
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        default:
            return date.toLocaleString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
    }
};

// Make vscode available globally for the webview
declare const vscode: {
    postMessage(message: any): void;
};

export default AnalyticsDashboard;