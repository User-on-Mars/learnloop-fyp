import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
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
import { AvatarProvider } from "./context/AvatarContext";
import { SubscriptionProvider } from "./context/SubscriptionContext";
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
import NodeDetailPage from "./pages/NodeDetailPage";
import Leaderboard from "./pages/Leaderboard";
import RoomSpace from "./pages/RoomSpace";
import RoomDetail from "./pages/RoomDetail";
import RoomSkillMapDetail from "./pages/RoomSkillMapDetail";
import RoomNodeDetail from "./pages/RoomNodeDetail";
import Subscription from "./pages/Subscription";
import EsewaSuccess from "./pages/EsewaSuccess";
import EsewaFailure from "./pages/EsewaFailure";

import ActiveSessionPopup from "./components/ActiveSessionPopup";
import AppShell from "./layout/AppShell";
import AdminLayout from "./layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminAlerts from "./pages/admin/AdminAlerts";
import AdminXpLeagues from "./pages/admin/AdminXpLeagues";
import AdminSkillMaps from "./pages/admin/AdminSkillMaps";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminReflections from "./pages/admin/AdminReflections";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminPublishRequests from "./pages/admin/AdminPublishRequests";

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

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Simplified layout wrapper - adding providers one by one
function AppLayout() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ToastProvider>
          <AvatarProvider>
            <SubscriptionProvider>
            <ActiveSessionProvider>
              <SkillMapProvider>
                <ScrollToTop />
                <Outlet />
                <ActiveSessionPopup />
              </SkillMapProvider>
            </ActiveSessionProvider>
            </SubscriptionProvider>
          </AvatarProvider>
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
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14 pb-20 md:pb-0">
        <SkillMapTsProvider>
          <Outlet />
        </SkillMapTsProvider>
      </main>
      <MobileNav />
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
      {
        element: <Protected><AppShell /></Protected>,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/profile", element: <Profile /> },
          { path: "/subscription", element: <Subscription /> },
          { path: "/subscription/esewa/success", element: <EsewaSuccess /> },
          { path: "/subscription/esewa/failure", element: <EsewaFailure /> },
          { path: "/log-practice", element: <LogPractice /> },
          { path: "/reflect", element: <ReflectPage /> },
          { path: "/reflections", element: <ReflectionHistory /> },
          { path: "/weekly-summary", element: <WeeklySummary /> },
          { path: "/leaderboard", element: <Leaderboard /> },
          { path: "/roomspace", element: <RoomSpace /> },
          { path: "/roomspace/:roomId", element: <RoomDetail /> },
          { path: "/roomspace/:roomId/skill-maps/:roomSkillMapId", element: <RoomSkillMapDetail /> },
          { path: "/roomspace/:roomId/skill-maps/:roomSkillMapId/nodes/:nodeId", element: <RoomNodeDetail /> },
          { path: "/skills", element: <SkillMapPage /> },
          { path: "/skills/:skillId", element: <SkillMapPage /> },
          { path: "/skills/:skillId/nodes/:nodeId", element: <NodeDetailPage /> },
        ],
      },
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
      {
        path: "/admin",
        element: <Protected><AdminLayout /></Protected>,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "alerts", element: <AdminAlerts /> },
          { path: "users", element: <AdminUsers /> },
          { path: "users/:userId", element: <AdminUserDetail /> },
          { path: "activity", element: <AdminActivity /> },
          { path: "xp-leagues", element: <AdminXpLeagues /> },
          { path: "skill-maps", element: <AdminSkillMaps /> },
          { path: "templates", element: <AdminTemplates /> },
          { path: "publish-requests", element: <AdminPublishRequests /> },
          { path: "reflections", element: <AdminReflections /> },
          { path: "audit-log", element: <AdminAuditLog /> },
          { path: "subscriptions", element: <AdminSubscriptions /> },
          { path: "settings", element: <AdminSettings /> },
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
