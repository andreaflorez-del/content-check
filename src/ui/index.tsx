import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Error boundary catches any render-time crash and shows it visibly
// (React 18 unmounts the whole tree silently without one)
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
          <p style={{ color: '#c62828', fontWeight: 'bold', marginBottom: '8px' }}>
            Plugin error — copia esto y repórtalo:
          </p>
          <pre style={{
            background: '#fff0f0',
            padding: '12px',
            borderRadius: '6px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#333',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  document.body.innerHTML = '<p style="color:red;padding:20px;font-family:sans-serif">Error: #root element not found</p>';
} else {
  createRoot(container).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
