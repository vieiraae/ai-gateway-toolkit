import React from 'react';
import { createRoot } from 'react-dom/client';
import Playground from './components/Playground';
import './playground.css';

console.log('Playground script loaded');

const container = document.getElementById('playground-root');
console.log('Container element:', container);

if (container) {
    console.log('Creating React root');
    const root = createRoot(container);
    root.render(<Playground />);
    console.log('Playground component rendered');
} else {
    console.error('Could not find playground-root element');
}