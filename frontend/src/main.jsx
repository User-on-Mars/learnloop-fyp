import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";

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

import { useAuth } from "./useAuth";
import { ActiveSessionProvider } from "./context/ActiveSessionContext";
import ActiveSessionPopup from "./components/ActiveSessionPopup";

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

// Layout wrapper with ActiveSessionProvider
function AppLayout() {
  return (
    <ActiveSessionProvider>
      <Outlet />
      <ActiveSessionPopup />
    </ActiveSessionProvider>
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
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
