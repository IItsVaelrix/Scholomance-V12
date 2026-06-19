import type { TypographyLayout } from "../schemas/videoScene";
import type React from "react";

export function resolveTypographyAlignItems(
  layout: TypographyLayout
): "center" | "flex-start" | "flex-end" {
  if (layout === "flood") return "flex-end";
  return "center";
}

export function resolveTypographyFontSize(
  layout: TypographyLayout,
  itemCount: number
): string {
  if (layout === "emblem") return itemCount > 2 ? "64px" : "96px";
  if (layout === "impactStack") return itemCount > 2 ? "56px" : "80px";
  if (layout === "splitPolarity") return "72px";
  if (layout === "flood") return "64px";
  if (layout === "orbit") return "72px";
  if (layout === "arena") return "68px";
  // centerPulse default
  return "76px";
}

// Full React CSS properties for the line/word container
export function resolveLineLayoutStyles(
  layout: TypographyLayout,
  lineCount: number
): React.CSSProperties {
  switch (layout) {
    case "emblem":
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: lineCount > 2 ? "64px" : "96px",
      };
    case "impactStack":
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3em",
        fontSize: lineCount > 2 ? "56px" : "80px",
      };
    case "splitPolarity":
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5em",
        fontSize: "72px",
        padding: "0 8vw",
      };
    case "flood":
      return {
        display: "flex",
        flexDirection: "column",
        alignContent: "flex-end",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: "64px",
        padding: "0 6vw 10vh",
      };
    case "orbit":
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5em",
        fontSize: "72px",
      };
    case "arena":
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-around",
        gap: "0.4em",
        fontSize: "68px",
        padding: "8vh 10vw",
      };
    default:
      return {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4em",
        fontSize: "76px",
      };
  }
}
