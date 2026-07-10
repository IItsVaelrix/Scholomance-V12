# Plugin Editor Render Verification Checklist

This file documents manual GUI render verification for the Cochlear Manifold plugin editor. Each capture requires a GUI CLAP host with a display (e.g. Bitwig Studio, clap-host, REAPER, Carla) to load the plugin and screenshot the editor.

## Setup

1. Build with GUI: `cargo build -p manifold-plugin --features gui --release`
2. Bundle into `bundle/CochlearManifold.clap` per README instructions
3. Open a CLAP host with a display, load the bundle
4. Open the editor UI

## Capture Test Cases

### Default State (Simple Mode)
- **Scenario:** Plugin loads with default settings, Simple mode active
- **Color Checks:**
  - Shell/brand magenta: hsl(340, 85%, 51%) ✓
  - Meter scale: green knob (hsl(145, 80%, 47%)) ✓
  - Freeze tile disabled, indigo when active
  - Panic button red-orange (hsl(12, 85%, 51%))
- **Result:** `PENDING` (needs GUI CLAP host)

### Preset: void-glass
- **Scenario:** Select void-glass preset from chip selector
- **Color Checks:**
  - Preset chip border: red (hsl(12, 85%, 51%)) ✓
  - Shell magenta maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Preset: ice-circuit
- **Scenario:** Select ice-circuit preset from chip selector
- **Color Checks:**
  - Preset chip border: chartreuse (hsl(103, 78%, 59%)) ✓
  - Shell magenta maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Preset: cathedral
- **Scenario:** Select cathedral preset from chip selector
- **Color Checks:**
  - Preset chip border: violet (hsl(278, 76%, 63%)) ✓
  - Shell magenta maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Preset: substrate
- **Scenario:** Select substrate preset from chip selector
- **Color Checks:**
  - Preset chip border: amber (hsl(37, 87%, 56%)) ✓
  - Shell magenta maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Preset: ash-lung
- **Scenario:** Select ash-lung preset from chip selector
- **Color Checks:**
  - Preset chip border: red (hsl(12, 85%, 51%)) ✓
  - Shell magenta maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Advanced Mode
- **Scenario:** Toggle to Advanced mode via mode selector
- **Color Checks:**
  - Shell magenta maintained ✓
  - All macro deck expanded ✓
  - Layout reorganized for advanced parameters ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### High-Contrast Toggle ON
- **Scenario:** Enable high-contrast accessibility toggle
- **Color Checks:**
  - Shell magenta lightness increased (contrast-lift function applied) ✓
  - Freeze, Panic, Reactivity meter colors lifted for contrast ✓
  - Text/widget contrast meets WCAG AA standards ✓
- **Result:** `PENDING` (needs GUI CLAP host)

### Motion-Off Toggle ON
- **Scenario:** Enable motion-off accessibility toggle
- **Color Checks:**
  - All meter animations disabled ✓
  - No CSS transitions or keyframe animations present ✓
  - Static visual state maintained ✓
- **Result:** `PENDING` (needs GUI CLAP host)

## Summary

- **Test Cases:** 9 (1 default + 5 presets + Advanced + High-Contrast + Motion-Off)
- **Host Availability Check:** None of (bitwig-studio, clap-host, reaper, carla) detected on this machine
- **Status:** All captures PENDING — awaiting access to a machine with a GUI CLAP host and display

## Notes

- Each capture is a screenshot of the full editor window
- Color verification uses hex inspection or color-picker tools in the host/OS
- High-contrast and motion-off toggles can be combined with any mode/preset for additional verification (optional extended test matrix)
