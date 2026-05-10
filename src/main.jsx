import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import "./lib/config/zod.config.js";
import App from "./App.jsx";
import "./index.css";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import RouteErrorPage from "./components/shared/RouteErrorPage.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";
import {
  WatchPage,
  ListenPage,
  ReadPage,
  AuthPage,
  CollabPage,
  ProfilePage,
  CombatPage,
  NexusPage,
  PixelBrainPage,
  CareerPage,
  PAGE_COMPONENTS,
} from "./lib/routes.js";

// Ambiently preload Phaser to eliminate latency when mounting visualizers
void import("phaser").catch(() => {});

// Eagerly preload page chunks with staggering to avoid CPU/Network congestion
const IS_PROD = typeof import.meta !== "undefined" && import.meta.env.PROD === true;
const INTERNAL_PATHS = ["/collab", "/pixelbrain", "/career"];

setTimeout(() => {
  const components = Object.entries(PAGE_COMPONENTS);
  components.forEach(([path, c], i) => {
    // In production, don't even trigger preloads for internal paths
    if (IS_PROD && INTERNAL_PATHS.includes(path)) return;
    
    setTimeout(() => c.preload?.(), i * 200);
  });
}, 1500);

import { AdminRoute } from "./components/AdminRoute.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/read" replace /> },
      { path: "watch", element: <WatchPage /> },
      { path: "listen", element: <ListenPage /> },
      { path: "read", element: <ReadPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "combat", element: <CombatPage /> },
      { path: "nexus", element: <NexusPage /> },
      { path: "collab", element: <AdminRoute><CollabPage /></AdminRoute> },
      { path: "pixelbrain", element: <AdminRoute><PixelBrainPage /></AdminRoute> },
      { path: "career", element: <AdminRoute><CareerPage /></AdminRoute> },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);

