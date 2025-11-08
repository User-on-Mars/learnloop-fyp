import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import "./index.css";

// Pages (make sure these files exist)
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";

import { useAuth } from "./useAuth";

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

const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/dashboard", element: <Protected><Dashboard /></Protected> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
