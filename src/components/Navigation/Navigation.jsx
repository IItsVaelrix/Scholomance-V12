import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { LINKS } from "../../data/library";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useScrolls } from "../../hooks/useScrolls.jsx";
import { useProgression } from "../../hooks/useProgression.jsx";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion.js";
import { preloadRoute } from "../../lib/routes.js";

import { triggerHapticPulse, UI_HAPTICS } from "../../lib/platform/haptics.js";

// ... (rest of the helper functions remain the same)
function normalizeAdminList(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}
function isAdminUser(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (String(user.role || "").toLowerCase() === "admin") return true;
  const adminAllowlist = normalizeAdminList(import.meta.env.VITE_ADMIN_USERNAMES || "admin");
  const username = String(user.username || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  return adminAllowlist.includes(username) || adminAllowlist.includes(email);
}

const MOBILE_ROUTE_COPY = {
  watch: "Witness the live arena and current ritual signal.",
  listen: "Tune stations, broadcasts, and ambient transmission.",
  read: "Compose scrolls and inspect their hidden anatomy.",
  combat: "Cast verses into live conflict and scoring.",
  nexus: "Survey unlocked paths, schools, and progression.",
  pixelbrain: "Neural network visualization and metadata mapping.",
  career: "Transmute professional experience into high-acuity sigils.",
  collab: "Coordinate agent work and active pipelines.",
  profile: "Review account standing and inner-sanctum access.",
  auth: "Enter the portal and secure your chamber.",
};

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const activeSection = location.pathname.replace("/", "") || "watch";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navigatingPath, setNavigatingPath] = useState(null);
  const navTimeoutRef = useRef(null);
  const { user } = useAuth();
  const { refreshScrolls } = useScrolls();
  const { refreshProgression } = useProgression(); // We might need to add this to useProgression
  const prefersReducedMotion = usePrefersReducedMotion();
  const canAccessCollab = true;
  const navLinks = LINKS.filter((link) => link.id !== "collab" || canAccessCollab);

  const handlePrefetch = useCallback((path) => {
    preloadRoute(path);
    if (path === "/read") {
      refreshScrolls();
    }
    if (path === "/nexus" || path === "/profile") {
      if (typeof refreshProgression === 'function') refreshProgression();
    }
  }, [refreshScrolls, refreshProgression]);

  const allLinks = [
    ...navLinks,
    {
      id: user ? "profile" : "auth",
      path: user ? "/profile" : "/auth",
      label: user ? user.username : "Portal",
    },
  ];

  const handleNav = useCallback((path) => {
    if (location.pathname === path) {
      setIsMenuOpen(false);
      setNavigatingPath(null);
      return;
    }
    
    setNavigatingPath(path);
    startTransition(() => {
      navigate(path);
    });
  }, [navigate, location.pathname]);

  // ... (rest of the handlers and effects remain the same)
  useEffect(() => {
    setNavigatingPath(null);
    setIsMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);
  useEffect(() => {
    const timeoutId = navTimeoutRef.current;
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, []);
  const handleToggle = useCallback(() => {
    triggerHapticPulse(UI_HAPTICS.MEDIUM);
    setIsMenuOpen((prev) => !prev);
    setNavigatingPath(null);
  }, []);
  const handleMobileNavClick = useCallback((e, linkPath) => {
    e.preventDefault();
    triggerHapticPulse(UI_HAPTICS.TICK);
    if (navigatingPath) return; // already transitioning
    handleNav(linkPath);
  }, [navigatingPath, handleNav]);

  const overlayTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.26, ease: "easeOut" };

  return (
    <>
      <nav className="primary-nav" aria-label="Primary navigation">
        <div className="nav-inner">
          <motion.button
            className="nav-brand font-bold"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            onClick={handleToggle}
            whileTap={{ scale: 0.96 }}
            animate={{ 
              textShadow: isMenuOpen 
                ? "0 0 20px var(--active-school-color)" 
                : "0 0 0px var(--active-school-color)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            SCHOLOMANCE
          </motion.button>

          {/* Desktop nav links */}
          <div id="nav-links" className="nav-links">
            {allLinks.map((l) => (
              <div key={l.id} className="relative">
                <NavLink
                  to={l.path}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}${isPending && navigatingPath === l.path ? " is-navigating" : ""}`
                  }
                  onMouseEnter={() => handlePrefetch(l.path)}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(l.path);
                  }}
                >
                  {l.label}
                </NavLink>
                {activeSection === l.id && (
                  <motion.div
                    layoutId="nav-highlight"
                    className="absolute bottom-0 left-0 w-full h-0.5"
                    style={{ backgroundColor: "var(--active-school-color)" }}
                    transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="nav-controls">
            {/* Mobile menu button */}
            <button
              className="nav-toggle"
              aria-expanded={isMenuOpen}
              aria-controls="nav-mobile-menu"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={handleToggle}
            >
              <span aria-hidden="true">
                <div className={`hamburger-bar${isMenuOpen ? " hamburger-bar--open-top" : ""}`} />
                <div className={`hamburger-bar${isMenuOpen ? " hamburger-bar--open-mid" : ""}`} />
                <div className={`hamburger-bar${isMenuOpen ? " hamburger-bar--open-bot" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="nav-mobile-menu"
            className="nav-mobile-overlay"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={overlayTransition}
          >
            <motion.div
              className="nav-mobile-shell"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={overlayTransition}
            >
              <div className="nav-mobile-header">
                <p className="nav-mobile-eyebrow">Wayfinding</p>
                <h2 className="nav-mobile-title">Traverse the Scholomance</h2>
                <p className="nav-mobile-copy">
                  Move between chambers without dropping the ritual thread or losing your place.
                </p>
              </div>

              <div className="nav-mobile-links">
                {allLinks.map((l, i) => {
                  const isSelected = navigatingPath === l.path;
                  const isOther = navigatingPath && !isSelected;
                  const isActive = location.pathname === l.path;
                  return (
                    <motion.div
                      key={l.id}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{
                        opacity: isOther ? 0.35 : 1,
                        y: 0,
                        scale: isSelected && !prefersReducedMotion ? 1.02 : 1,
                      }}
                      transition={{
                        delay: navigatingPath || prefersReducedMotion ? 0 : i * 0.04,
                        duration: prefersReducedMotion ? 0 : 0.24,
                        ease: "easeOut",
                      }}
                    >
                      <NavLink
                        to={l.path}
                        onClick={(e) => handleMobileNavClick(e, l.path)}
                        onTouchStart={() => handlePrefetch(l.path)}
                        className={`nav-mobile-link${isActive ? " active" : ""}${isSelected ? " nav-mobile-link--selected" : ""}`}
                      >
                        <span className="nav-mobile-link-copy">
                          <span className="nav-mobile-link-label">{l.label}</span>
                          <span className="nav-mobile-link-meta">
                            {MOBILE_ROUTE_COPY[l.id] || "Open chamber."}
                          </span>
                        </span>
                        <span className="nav-mobile-link-state">
                          {isSelected ? "Opening" : isActive ? "Current" : "Open"}
                        </span>
                        {isSelected && (
                          <motion.span
                            className="nav-mobile-link__glow"
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            transition={overlayTransition}
                            aria-hidden="true"
                          />
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
