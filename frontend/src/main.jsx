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
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FeaturesPage from "./pages/FeaturesPage";
import MarketingLayout from "./layout/MarketingLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import LogPractice from "./pages/LogPractice";
import ReflectPage from "./pages/ReflectPage";
import ReflectionHistory from "./components/ReflectionHistory";

import { useAuth } from "./useAuth";
import { ToastProvider } from "./context/ToastContext";
import { ActiveSessionProvider } from "./context/ActiveSessionContext";
import { SkillMapProvider } from "./context/SkillMapContext";
import { store } from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import SkillMapPage from "./pages/SkillMapPage";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import { SkillMapTsProvider } from "./context/SkillMapTsContext";
import SkillMapScreen from "./screens/SkillMapScreen";
import NodeDetailScreen from "./screens/NodeDetailScreen";
import SessionScreen from "./screens/SessionScreen";
import ReflectionScreen from "./screens/ReflectionScreen";
import NodeCompleteScreen from "./screens/NodeCompleteScreen";
import WeeklySummary from "./pages/WeeklySummary";

// Protect routes that require auth
function Protected({ children }) {
  const user = useAuth();
  if (user === undefined) return <div>Loading...</div>; // Show loading instead of null
  return user ? children : <Navigate to="/login" replace />;
}

/** Logged-in users skip marketing; logged-out users see nested public pages. */
function PublicMarketingGate() {
  const user = useAuth();
  if (user === undefined) return <div>Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <MarketingLayout />;
}

// Simplified layout wrapper - adding providers one by one
function AppLayout() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ToastProvider>
          <ActiveSessionProvider>
            <SkillMapProvider>
              <Outlet />
              <MobileNav />
            </SkillMapProvider>
          </ActiveSessionProvider>
        </ToastProvider>
      </ErrorBoundary>
    </Provider>
  );
}

/** Gamified map screens: same sidebar shell as Skill Maps, shared TS context. */
function MapsShellLayout() {
  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <SkillMapTsProvider>
          <Outlet />
        </SkillMapTsProvider>
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <PublicMarketingGate />,
        children: [
          { index: true, element: <Home /> },
          { path: "features", element: <FeaturesPage /> },
          { path: "about", element: <AboutPage /> },
          { path: "contact", element: <ContactPage /> },
        ],
      },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/forgot", element: <ForgotPassword /> },
      { path: "/dashboard", element: <Protected><Dashboard /></Protected> },
      { path: "/profile", element: <Protected><Profile /></Protected> },
      { path: "/log-practice", element: <Protected><LogPractice /></Protected> },
      { path: "/reflect", element: <Protected><ReflectPage /></Protected> },
      { path: "/reflections", element: <Protected><ReflectionHistory /></Protected> },
      { path: "/weekly-summary", element: <Protected><WeeklySummary /></Protected> },
      { path: "/skills", element: <Protected><SkillMapPage /></Protected> },
      { path: "/skills/:skillId", element: <Protected><SkillMapPage /></Protected> },
      {
        path: "/maps",
        element: <Protected><MapsShellLayout /></Protected>,
        children: [
          { path: ":mapId", element: <SkillMapScreen /> },
          { path: ":mapId/nodes/:nodeId", element: <NodeDetailScreen /> },
          { path: ":mapId/nodes/:nodeId/session", element: <SessionScreen /> },
          {
            path: ":mapId/nodes/:nodeId/session/:sessionId/reflect",
            element: <ReflectionScreen />,
          },
          { path: ":mapId/complete", element: <NodeCompleteScreen /> },
        ],
      },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
