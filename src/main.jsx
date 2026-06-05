import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LandingPage from "./pages/Landing/LandingPage.jsx";
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
  GrimoireSpread,
  AuthPage,
  CollabPage,
  ProfilePage,
  CombatPage,
  NexusPage,
  PixelBrainPage,
  CareerPage,
  WandPage,
  DivWandPage,
  PhotonicBridgeLab,
  StudioUpload,
  PAGE_COMPONENTS,
} from "./lib/routes.js";

import { AdminRoute } from "./components/AdminRoute.jsx";

// DEV-ONLY de-risking spike (PDR-2026-06-04-GODOT-WASM-COMBAT-SPIKE).
// The guard `import.meta.env.DEV` is statically false in production, so the route is
// NEVER registered in prod (devSpikeRoutes stays []) — unreachable, never rendered,
// its lazy chunk never fetched. (Vite still lists the chunk name in its dep-map array,
// but no code path loads it.) Not wired into navigation; reachable only at
// /combat-godot-spike during `npm run dev`.
let devSpikeRoutes = [];
if (import.meta.env.DEV) {
  // Godot WASM spike retained as the documented fallback path. The Phaser 4 spike was
  // retired once its verdict (uplift = go) folded into the real ResonanceScene on 2026-06-05.
  const CombatGodotSpike = React.lazy(() =>
    import("./pages/CombatGodotSpike/CombatGodotSpike.jsx")
  );
  devSpikeRoutes = [
    {
      path: "combat-godot-spike",
      element: (
        <React.Suspense fallback={null}>
          <CombatGodotSpike />
        </React.Suspense>
      ),
    },
  ];
}

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      ...devSpikeRoutes,
      {
        element: <App />,
        children: [
          { path: "watch", element: <WatchPage /> },
          { path: "listen", element: <ListenPage /> },
          { path: "grimoire/:trackId", element: <GrimoireSpread /> },
          { path: "read", element: <ReadPage /> },
          { path: "auth", element: <AuthPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "combat", element: <CombatPage /> },
          { path: "nexus", element: <NexusPage /> },
          { path: "collab", element: <AdminRoute><CollabPage /></AdminRoute> },
          { path: "pixelbrain", element: <AdminRoute><PixelBrainPage /></AdminRoute> },
          { path: "career", element: <AdminRoute><CareerPage /></AdminRoute> },
          { path: "wand", element: <AdminRoute><WandPage /></AdminRoute> },
          { path: "div-wand", element: <AdminRoute><DivWandPage /></AdminRoute> },
          { path: "internal/photonic-bridge", element: <AdminRoute><PhotonicBridgeLab /></AdminRoute> },
          { path: "internal/studio", element: <AdminRoute><StudioUpload /></AdminRoute> },
        ],
      },
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
