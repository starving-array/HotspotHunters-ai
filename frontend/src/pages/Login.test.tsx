import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import Login from './Login';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function wrapLogin() {
  return render(
    <AuthProvider>
      <LanguageProvider>
        <Login />
      </LanguageProvider>
    </AuthProvider>,
  );
}

describe('Login form', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  it('renders username field + sign-in button (no password field is editable, per U-plan)', () => {
    wrapLogin();
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
    // Password field is disabled and present (placeholder Password)
    const pwd = screen.getByPlaceholderText('Password') as HTMLInputElement;
    expect(pwd.disabled).toBe(true);
  });

  it('keeps Sign In disabled until username has content', async () => {
    const user = userEvent.setup();
    wrapLogin();
    const btn = screen.getByRole('button', { name: 'Sign In' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    const input = screen.getByPlaceholderText('Username');
    await user.type(input as HTMLElement, 'io_anita');
    expect(btn.disabled).toBe(false);
  });

  it('calls /api/v1/auth/login on submit and persists token to localStorage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'mock-jwt-123' }),
    } as Response);

    const user = userEvent.setup();
    wrapLogin();

    await user.type(screen.getByPlaceholderText('Username'), 'dsp_murali');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(localStorage.getItem('jwt_token')).toBe('mock-jwt-123');
      expect(localStorage.getItem('jwt_username')).toBe('dsp_murali');
    });
  });

  it('renders an error banner when the login request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);

    const user = userEvent.setup();
    wrapLogin();

    await user.type(screen.getByPlaceholderText('Username'), 'bad_user');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeTruthy();
    });
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });
});
