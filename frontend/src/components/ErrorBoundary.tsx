import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0f1e',
            color: '#dee1f7',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              background: '#0f172a',
              border: '1px solid #1e3a5f',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              ✕
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              Telemetry Failure
            </h1>
            <p
              style={{
                color: '#94a3b8',
                fontSize: '14px',
                margin: '0 0 8px 0',
              }}
            >
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <p
              style={{
                color: '#64748b',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                margin: '0 0 24px 0',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.stack?.split('\n')[0]}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: '#06b6d4',
                color: '#003640',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
