import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Provider } from 'react-redux';

import "./index.css";

// Pages (make sure these files exist)
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import LogPractice from "./pages/LogPractice";
import ReflectPage from "./pages/ReflectPage";
import ReflectionHistory from "./components/ReflectionHistory";
import SkillMapList from "./pages/SkillMapList";
import SkillCanvas from "./pages/SkillCanvas";

import { useAuth } from "./useAuth";
import { ActiveSessionProvider } from "./context/ActiveSessionContext";
import { ToastProvider } from "./context/ToastContext";
import { SessionProvider } from "./context/SessionProvider";
import { WebSocketProvider } from "./context/WebSocketProvider";
import { store } from "./store";
import ActiveSessionPopup from "./components/ActiveSessionPopup";
import ErrorBoundary from "./components/ErrorBoundary";

// Protect routes that require auth
function Protected({ children }) {
  const user = useAuth();
  if (user === undefined) return null; // could render a spinner
  return user ? children : <Navigate to="/login" replace />;
}

// Root path: if logged in → dashboard; else → home
function RootRedirect() {
  const user = useAuth();
  if (user === undefined) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
}

// Layout wrapper with Redux Provider, WebSocketProvider, ActiveSessionProvider, ToastProvider, SessionProvider, and ErrorBoundary
function AppLayout() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <WebSocketProvider>
          <ToastProvider>
            <ActiveSessionProvider>
              <SessionProvider>
                <Outlet />
                <ActiveSessionPopup />
              </SessionProvider>
            </ActiveSessionProvider>
          </ToastProvider>
        </WebSocketProvider>
      </ErrorBoundary>
    </Provider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <RootRedirect /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/forgot", element: <ForgotPassword /> },
      { path: "/dashboard", element: <Protected><Dashboard /></Protected> },
      { path: "/profile", element: <Protected><Profile /></Protected> },
      { path: "/log-practice", element: <Protected><LogPractice /></Protected> },
      { path: "/reflect", element: <Protected><ReflectPage /></Protected> },
      { path: "/reflections", element: <Protected><ReflectionHistory /></Protected> },
      { path: "/skill-map", element: <Protected><SkillMapList /></Protected> },
      { path: "/skill-map/:id", element: <Protected><SkillCanvas /></Protected> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);