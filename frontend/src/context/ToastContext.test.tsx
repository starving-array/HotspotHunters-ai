import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToasts } from './ToastContext';

function Counter() {
  const { toasts, pushToast, dismissToast } = useToasts();
  return (
    <>
      <button type="button" onClick={() => pushToast({ type: 'info', title: 'a-title', message: 'm', durationMs: 0 })}>
        add
      </button>
      <button type="button" onClick={() => dismissToast('x1')}>
        dismiss
      </button>
      <div data-testid="count">{toasts.length}</div>
      <ul>
        {toasts.map((tst) => (
          <li key={tst.id} data-testid="toast">{tst.title}</li>
        ))}
      </ul>
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('pushes a toast with custom id (no auto-dismiss) into the visible list', () => {
    function Labeled() {
      const { toasts, pushToast } = useToasts();
      return (
        <>
          <button type="button" onClick={() => pushToast({ id: 'x1', type: 'info', title: 'special', message: 'm', durationMs: 0 })}>
            add
          </button>
          <div data-testid="count">{toasts.length}</div>
          <ul>
            {toasts.map((tst) => (
              <li key={tst.id}>{tst.title}</li>
            ))}
          </ul>
        </>
      );
    }

    render(
      <ToastProvider>
        <Labeled />
      </ToastProvider>,
    );

    act(() => screen.getByText('add').click());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByText('special')).toBeTruthy();
  });

  it('caps the visible toast stack at 5 entries', () => {
    render(
      <ToastProvider>
        <Counter />
      </ToastProvider>,
    );

    const btn = screen.getByText('add');
    for (let i = 0; i < 7; i++) {
      act(() => btn.click());
    }
    expect(screen.getByTestId('count').textContent).toBe('5');
  });

  it('dismissing a toast by id removes it from the stack', () => {
    function WithId() {
      const { toasts, pushToast, dismissToast } = useToasts();
      return (
        <>
          <button type="button" onClick={() => pushToast({ id: 'x1', type: 'info', title: 't', message: 'm', durationMs: 0 })}>
            add
          </button>
          <button type="button" onClick={() => dismissToast('x1')}>
            dismiss
          </button>
          <div data-testid="count">{toasts.length}</div>
        </>
      );
    }

    render(
      <ToastProvider>
        <WithId />
      </ToastProvider>,
    );

    act(() => screen.getByText('add').click());
    expect(screen.getByTestId('count').textContent).toBe('1');

    act(() => screen.getByText('dismiss').click());
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
