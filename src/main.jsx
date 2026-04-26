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

// Eagerly preload all page chunks after a short delay to prioritize initial app render
const IS_PROD = typeof import.meta !== "undefined" && import.meta.env.PROD;
setTimeout(() => {
  Object.values(PAGE_COMPONENTS).forEach(c => c.preload?.());
}, 500);

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
      ...(IS_PROD ? [] : [
        { path: "collab", element: <CollabPage /> },
        { path: "pixelbrain", element: <PixelBrainPage /> },
        { path: "career", element: <CareerPage /> },
      ]),
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

