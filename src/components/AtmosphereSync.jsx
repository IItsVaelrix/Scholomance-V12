import { useEffect } from "react";
import { useAnimationSubmitter } from "../ui/animation/hooks/useAnimationSubmitter.ts";
import { useLocation } from "react-router-dom";

export default function AtmosphereSync() {
  const { submitIntent } = useAnimationSubmitter();
  const location = useLocation();

  useEffect(() => {
    // Initial global atmosphere initialization
    submitIntent({
      version: "v1.0",
      targetId: "global:atmosphere",
      trigger: "mount",
    });
  }, [submitIntent]);

  useEffect(() => {
    // Route-based atmosphere sync (e.g. pausing audio on specific routes)
    submitIntent({
      version: "v1.0",
      targetId: "global:atmosphere",
      trigger: "route-change",
      state: { pathname: location.pathname },
    });
  }, [location.pathname, submitIntent]);

  return null;
}
