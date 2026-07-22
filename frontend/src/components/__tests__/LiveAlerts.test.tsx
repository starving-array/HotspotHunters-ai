import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LiveAlerts from '../LiveAlerts';
import { vi } from 'vitest';

// Simple mock for EventSource
class MockEventSource {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {}
  // Helper to emit a message event
  emit(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
  // Helper to emit an error event
  error() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global EventSource with a mock constructor that returns a shared instance
let mockInstance: MockEventSource;
// @ts-ignore – override EventSource for test environment
global.EventSource = vi.fn(() => {
  mockInstance = new MockEventSource('http://test');
  return mockInstance;
}) as any;

describe('LiveAlerts', () => {
  it('receives alerts via SSE and displays them', async () => {
    render(<LiveAlerts />);
    const alert = { type: 'alert', message: 'test' };
    mockInstance.emit(alert);
    await waitFor(() => expect(screen.getByText(JSON.stringify(alert))).toBeInTheDocument());
  });

  it('shows error message on connection error', async () => {
    render(<LiveAlerts />);
    mockInstance.error();
    await waitFor(() => expect(screen.getByText(/Connection lost to alerts stream/i)).toBeInTheDocument());
  });
});
