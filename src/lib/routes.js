import { lazyWithRetry } from "./lazyWithRetry.js";
import { isAdminUser } from "../components/Navigation/Navigation.jsx";

export const WatchPage = lazyWithRetry(() => import("../pages/Watch/WatchPage.jsx"), "watch-page");
export const ListenPage = lazyWithRetry(() => import("../pages/Listen/ListenPage"), "listen-page");
export const ReadPage = lazyWithRetry(() => import("../pages/Read/ReadPage.jsx"), "read-page");
export const AuthPage = lazyWithRetry(() => import("../pages/Auth/AuthPage.jsx"), "auth-page");
export const CollabPage = lazyWithRetry(() => import("../pages/Collab/CollabPage.jsx"), "collab-page");
export const ProfilePage = lazyWithRetry(() => import("../pages/Profile/ProfilePage.jsx"), "profile-page");
export const CombatPage = lazyWithRetry(() => import("../pages/Combat/CombatPage.jsx"), "combat-page");
export const NexusPage = lazyWithRetry(() => import("../pages/Nexus/NexusPage.jsx"), "nexus-page");
export const PixelBrainPage = lazyWithRetry(() => import("../pages/PixelBrain/PixelBrainPage.jsx"), "pixelbrain-page");
export const CareerPage = lazyWithRetry(() => import("../pages/Career/CareerPage"), "career-page");

const IS_PROD = typeof import.meta !== "undefined" && import.meta.env.PROD;
const INTERNAL_MODULES = ["/collab", "/pixelbrain", "/career"];

const ALL_COMPONENTS = {
  "/watch": WatchPage,
  "/listen": ListenPage,
  "/read": ReadPage,
  "/auth": AuthPage,
  "/collab": CollabPage,
  "/profile": ProfilePage,
  "/combat": CombatPage,
  "/nexus": NexusPage,
  "/pixelbrain": PixelBrainPage,
  "/career": CareerPage,
};

/**
 * PAGE_COMPONENTS is now a function that accepts the current user to resolve 
 * available routes dynamically based on environment and role.
 */
export function getAvailablePageComponents(user) {
  const isInternalAdmin = isAdminUser(user);
  
  return Object.fromEntries(
    Object.entries(ALL_COMPONENTS).filter(([path]) => {
      if (IS_PROD) {
        if (INTERNAL_MODULES.includes(path)) {
          return isInternalAdmin;
        }
      }
      return true;
    })
  );
}

// Backward compatibility for static usages (defaults to non-admin view)
export const PAGE_COMPONENTS = getAvailablePageComponents(null);

/**
 * Trigger pre-fetching of a page chunk.
 * @param {string} path 
 */
export function preloadRoute(path) {
  const component = PAGE_COMPONENTS[path];
  if (component && typeof component.preload === "function") {
    void component.preload();
  }
}
