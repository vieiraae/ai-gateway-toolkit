import React from 'react';
import { createRoot } from 'react-dom/client';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './analytics.css';

const container = document.getElementById('analytics-root');
if (container) {
    const root = createRoot(container);
    root.render(<AnalyticsDashboard />);
}