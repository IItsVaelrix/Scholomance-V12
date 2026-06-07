import { useContext } from "react";
import { ScrollsContext } from "../context/ScrollsContext.jsx";

export function useScrolls() {
  const context = useContext(ScrollsContext);
  if (!context) throw new Error("useScrolls must be used within ScrollsProvider");
  return context;
}
