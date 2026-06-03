import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import WatercolorDissolve from "./WatercolorDissolve.jsx";
import GrimoireTitle from "../../components/grimoire/GrimoireTitle.jsx";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [dissolving, setDissolving] = useState(false);
  const enteredRef = useRef(false);

  const handleEnter = useCallback(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    setDissolving(true);
  }, []);

  const handleDissolveComplete = useCallback(() => {
    navigate("/read");
  }, [navigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleEnter();
    }
  }, [handleEnter]);

  return (
    <div className="portal-scene" aria-label="Scholomance — enter the portal">
      <div className="portal-lightning" aria-hidden="true" />
      
      <div className="portal-smoke-container" aria-hidden="true">
        <div className="portal-smoke portal-smoke--1" />
        <div className="portal-smoke portal-smoke--2" />
        <div className="portal-smoke portal-smoke--3" />
      </div>

      <div className="portal-halo" aria-hidden="true" />

      <WatercolorDissolve dissolving={dissolving} onDissolveComplete={handleDissolveComplete}>
        <div
          className="portal-gate"
          role="button"
          tabIndex={0}
          aria-label="Enter Scholomance"
          onClick={handleEnter}
          onKeyDown={handleKeyDown}
        >
          <span className="portal-ring portal-ring--energy" aria-hidden="true" />
          <span className="portal-ring portal-ring--edge" aria-hidden="true" />
          <span className="portal-aperture" aria-hidden="true" />

          <div className="portal-content">
            <GrimoireTitle />
            <p className="portal-tagline">Where words become weapons</p>
            <p className="portal-hint" aria-hidden="true">
              <span className="portal-hint-beacon" />
              Step through
            </p>
          </div>
        </div>
      </WatercolorDissolve>
    </div>
  );
}
