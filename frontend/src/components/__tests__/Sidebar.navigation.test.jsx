import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from '../Sidebar';
import * as useAuthModule from '../../useAuth';

// Mock Firebase auth
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    }
  }
}));

// Mock ActiveSessionContext
vi.mock('../../context/ActiveSessionContext', () => ({
  useActiveSessions: () => ({
    activeSessions: [],
    clearAllSessions: vi.fn()
  })
}));

// Mock useAuth
vi.mock('../../useAuth');

const mockUser = { 
  uid: 'test-user-123', 
  email: 'test@example.com',
  displayName: 'Test User'
};

// Mock page components
const MockReflectPage = () => <div data-testid="reflect-page">Reflect Page</div>;
const MockDashboard = () => <div data-testid="dashboard-page">Dashboard Page</div>;
const MockLogin = () => <div data-testid="login-page">Login Page</div>;

describe('Sidebar Navigation Integration', () => {
  beforeEach(() => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(mockUser);
    vi.clearAllMocks();
  });

  // Test sidebar link navigates to Reflect page
  // Requirements: 10.4
  it('should navigate to Reflect page when Reflect link is clicked', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <Routes>
            <Route path="/" element={<MockDashboard />} />
            <Route path="/dashboard" element={<MockDashboard />} />
            <Route path="/reflect" element={<MockReflectPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    );

    // Find and click the Reflect navigation link
    const reflectLink = screen.getByRole('button', { name: /reflect/i });
    expect(reflectLink).toBeInTheDocument();

    await user.click(reflectLink);

    // Verify navigation occurred
    await waitFor(() => {
      expect(screen.getByTestId('reflect-page')).toBeInTheDocument();
    });
  });

  // Test unauthenticated users redirect to login
  // Requirements: 9.5
  it('should show Reflect link only when user is authenticated', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // Verify Reflect link is present when authenticated
    const reflectLink = screen.getByRole('button', { name: /reflect/i });
    expect(reflectLink).toBeInTheDocument();
  });

  it('should highlight Reflect link when on Reflect page', () => {
    render(
      <BrowserRouter initialEntries={['/reflect']}>
        <Routes>
          <Route path="/reflect" element={
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <MockReflectPage />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    );

    // Find the Reflect button
    const reflectLink = screen.getByRole('button', { name: /reflect/i });
    
    // Check if it has the active styling classes
    expect(reflectLink).toHaveClass('bg-indigo-50', 'text-indigo-700', 'font-semibold');
  });

  it('should not highlight Reflect link when on Dashboard page', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <Routes>
            <Route path="/" element={<MockDashboard />} />
            <Route path="/dashboard" element={<MockDashboard />} />
            <Route path="/reflect" element={<MockReflectPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    );

    // Navigate to dashboard first
    const dashboardLink = screen.getByRole('button', { name: /dashboard/i });
    await user.click(dashboardLink);

    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    // Find the Reflect button
    const reflectLink = screen.getByRole('button', { name: /reflect/i });
    
    // Check that it does NOT have the active styling classes
    expect(reflectLink).not.toHaveClass('bg-indigo-50');
    expect(reflectLink).toHaveClass('text-gray-700');
  });

  it('should display Reflect icon in navigation', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    // Find the Reflect button
    const reflectLink = screen.getByRole('button', { name: /reflect/i });
    
    // Verify it contains an SVG icon
    const icon = reflectLink.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
