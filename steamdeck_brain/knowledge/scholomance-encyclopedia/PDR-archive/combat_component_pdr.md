Component-by-Component PDR

Project: Scholomance Combat UI Modernization
Layer: Tactical Combat Screen
Reference Blend: Scholomance identity + modern strategy UX + Final Fantasy Tactics readability + MUD speed

Summary

This PDR breaks the combat screen into composable UI modules so the redesign can be implemented without turning the codebase into cursed spaghetti. The architecture shifts from static page layout to mode-aware tactical shell.

What

Define each combat UI component, its purpose, states, inputs, outputs, and interaction rules.

Why

This reduces refactor chaos, keeps responsibilities clean, and makes future features like initiative, previews, macros, status effects, and accessibility easier to add.

Risk Reduced
Prevents shared-state drift
Prevents visual logic from being duplicated across panels
Prevents “one giant combat component” collapse
Makes FFT-style previews and MUD-style input flow easier to test
Why

The current UI has good bones, but it behaves like a static dashboard. A tactics combat screen needs to behave more like a living instrument panel. Different moments need different levels of density.

A player deciding where to move should not be reading the same UI density as a player composing a verse.
A player in downtime should not see the same wall of metrics as a player targeting a lethal cast.

This component plan creates:

clear ownership
predictable layout behavior
mode-based rendering
future-safe extensibility
Architecture Overview
Root Structure
CombatShell
├── TopCombatBar
├── CombatMainLayout
│   ├── LeftCommandRail
│   │   ├── ActionContextHeader
│   │   ├── InscriptionPanel
│   │   ├── CastPredictionCard
│   │   └── SavedWeavesPanel
│   ├── TacticalBoardStage
│   │   ├── TacticalBoard
│   │   ├── GridOverlayLayer
│   │   ├── PathPreviewLayer
│   │   ├── RangeOverlayLayer
│   │   ├── TargetPreviewLayer
│   │   ├── TileCursor
│   │   └── FloatingCombatTextLayer
│   └── RightTacticalRail
│       ├── EncounterCard
│       ├── InitiativeQueue
│       ├── UnitDetailCard
│       ├── ThreatIntentPanel
│       └── TileInspector
├── BottomCommandBand
│   ├── ActionBar
│   ├── ActionHintStrip
│   └── ConfirmCancelBar
├── ScholarStatusPanel
└── CombatLogDrawer
State Model
Central Combat UI State

All components should derive from a central state source, likely a combat UI store or controller.

Required shared state
type CombatMode =
  | 'idle'
  | 'move'
  | 'inscribe'
  | 'targeting'
  | 'resolve'
  | 'inspect'
  | 'menu';

interface CombatUIState {
  mode: CombatMode;
  selectedAction: string | null;
  hoveredTile: GridCoord | null;
  selectedTile: GridCoord | null;
  selectedUnitId: string | null;
  activeUnitId: string | null;
  previewPayload: ActionPreview | null;
  turnState: 'player' | 'enemy' | 'neutral' | 'animating';
  visiblePanels: Record<string, boolean>;
  layoutPreset: 'immersive' | 'compact' | 'tactical';
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    screenFlashEnabled: boolean;
  };
}
Component PDRs
1. CombatShell
Purpose

The orchestration root for the entire combat screen.

Responsibilities
provides layout scaffold
connects combat state/store to child components
applies combat mode classes and theme tokens
suppresses non-combat global UI noise
owns responsive behavior rules
Must Do
lock screen into combat-specific layout
apply data-combat-mode
expose layout preset classes
coordinate panel visibility rules
Must Not Do
render business logic inline
own board mechanics directly
duplicate preview calculations
Inputs
combat state
encounter data
player data
layout settings
Outputs
renders child components with normalized props
Risk Reduced

Stops the screen from becoming a giant mixed-responsibility monolith.

2. TopCombatBar
Purpose

A minimal, high-priority header for current combat context.

Content
encounter/zone name
turn indicator
current mode
optional round count
settings/menu button
optional objective label
Design Rules
far less noisy than current full nav
site-wide navigation hidden or minimized during combat
turn state should be the main signal
FFT Influence

Like the top-of-screen contextual battle state layer. Brief. Legible. Tactical.

States
player turn
enemy turn
animation resolving
paused/menu
Example Content
SONIC THAUMATURGY ARENA
TURN 3 • PLAYER ACTING • TARGETING
Objective: Break the Hollow Echo
Risk Reduced

Prevents top-level website chrome from breaking battle immersion.

3. LeftCommandRail
Purpose

The ritual composition rail. Houses action context and inscription workflow.

Sections
ActionContextHeader
InscriptionPanel
CastPredictionCard
SavedWeavesPanel
Behavior
compact in idle/move
expanded in inscribe/targeting
can collapse saved/advanced sections in compact mode
Rules
composition should feel like a sequence, not just stacked form fields
clear flow: intent → verse → forecast → confirm
Risk Reduced

Prevents the left side from feeling like dead form acreage.

4. ActionContextHeader
Purpose

A small panel that explains what the player is currently doing.

Content
selected action name
action description
current phase instruction
hotkey reminder
Example
INSCRIBE
Compose an active verse to affect a target within range.
Hotkeys: [Tab] Cycle Target  [Enter] Confirm  [Esc] Cancel
Display Logic
always visible
minimal in idle
expands with richer helper text in inscribe mode
Risk Reduced

Reduces uncertainty during multi-step actions.

5. InscriptionPanel
Purpose

The heart of Scholomance identity. This is where the player composes magical intent.

Content Blocks
Concept / Intent field
Verse / Phoneme field
optional syntax helper
optional autocomplete / ritual prediction later
cost preview
cast type / action metadata
UX Requirements
strong visual focus state
preserve keyboard-first use
support command history
support macro insertion
support draft persistence during turn if canceled
Modes
Idle

Collapsed summary only

Inscribe

Expanded editor with helper metadata

Targeting after inscription

Readonly summary plus forecast

Dependencies
action selection
preview engine
input history
future spell prediction system
Risk Reduced

Makes inscription a real workflow instead of a decorative textarea.

6. CastPredictionCard
Purpose

Show likely action results before the player commits.

Content
projected damage/healing
MP cost
range
target type
statuses applied
interrupts/counters
special terrain interactions
certainty level if relevant
FFT Influence

This is the tactical preview spine. It tells the player what their decision means before they lock in.

Behavior
hidden in idle
active in move/targeting/inscribe when preview exists
updates live as tile/target changes
Risk Reduced

Prevents “I clicked and now regret my bloodline” moments.

7. SavedWeavesPanel
Purpose

Shortcut panel for saved verse patterns, macros, or repeated actions.

Features
pinned actions
recent inscriptions
favorite weaves
macro hotkeys
repeat last action
Design Rule

Hidden by default in immersive mode. Expandable by user or shown in compact/power-user mode.

Risk Reduced

Supports MUD-speed repeated play without cluttering the main composer.

8. TacticalBoardStage
Purpose

A visual container for the entire tactical board and its overlays.

Responsibilities
size management
board centering
scaling behavior
layer stacking order
focus and camera logic if any
Visual Priority

This must be the central crown jewel of the screen.

Rules
board should occupy more screen than it does now
surrounding negative space should reinforce focus
overlays should stack cleanly and predictably
Risk Reduced

Stops the battlefield from feeling like one widget among many.

9. TacticalBoard
Purpose

Render the core grid, units, tiles, and battle geometry.

Content
tile grid
unit tokens
coordinates
terrain markers
occupancy
Requirements
crisp tile visibility
high readability at a glance
clear selected tile and active unit states
responsive sizing without layout drift
clean keyboard cursor support
FFT Influence

Grid must feel intentional, tactical, inspectable, and stage-like.

Future-Ready Hooks
elevation
cover
terrain modifiers
aura fields
summon zones
Risk Reduced

Ensures all tactical logic has a visually stable home.

10. GridOverlayLayer
Purpose

Render neutral overlays that annotate the board without changing board data.

Content
coordinate labels
subtle danger tint
tile state ornamentation
terrain icons
aura boundaries
Rules
should never overpower selected/target overlays
can be thinned in compact mode
hidden or simplified in reduced visual density mode
Risk Reduced

Avoids cramming board annotations into the base grid renderer.

11. PathPreviewLayer
Purpose

Display projected movement route.

Content
path line
step count
movement cost
endpoint emphasis
FFT Influence

Movement should feel staged and deliberate, not guessed.

States
active in move mode
hidden otherwise
Risk Reduced

Prevents movement ambiguity and accidental misreads.

12. RangeOverlayLayer
Purpose

Display actionable zones for current selection.

Content
move range
cast range
danger zones
ally support radius
enemy threat range if known
Rules
each overlay type must have distinct styling
support layer toggles if multiple are active
never produce unreadable glow soup
Risk Reduced

Makes tactical geometry comprehensible.

13. TargetPreviewLayer
Purpose

Shows target-specific outcome directly on the board.

Content
target highlight
AoE area
impacted units
effect glyphs
projected damage markers
Behavior
active only when a valid preview exists
must update instantly when target changes
Risk Reduced

Keeps preview grounded in the battlefield instead of trapped in side panels.

14. TileCursor
Purpose

Represent current focus tile for keyboard/mouse targeting.

Requirements
precise, crisp, unmistakable
distinct from selected tile
animated subtly
supports hover and keyboard focus separately if needed
Risk Reduced

Avoids cursor ambiguity during keyboard-heavy play.

15. FloatingCombatTextLayer
Purpose

Provide lightweight event feedback on the board.

Content
damage numbers
healing
resist
crit
status applied
interrupted
missed
Design Rule

Readable, restrained, non-cartoonish. More grim oracle than slot machine.

Accessibility

Can be reduced or replaced with simplified notifications in reduced motion mode.

Risk Reduced

Lets outcome land immediately without forcing log reading.

16. RightTacticalRail
Purpose

The tactical knowledge rail. Holds enemy, initiative, unit, and tile information.

Sections
EncounterCard
InitiativeQueue
UnitDetailCard
ThreatIntentPanel
TileInspector
Behavior
collapses some modules in idle mode
expands relevant module based on selection
Risk Reduced

Keeps tactical intelligence modular instead of mashed into one card.

17. EncounterCard
Purpose

Display current primary enemy or encounter summary.

Content
portrait/icon
name
type/school
HP/MP or relevant core resources
major passive traits
flavor line
boss flags if applicable
Current Problem Solved

Right now the enemy card is atmospheric but under-informative for its footprint.

New Requirement

It should blend lore and mechanics without hiding the mechanics.

Risk Reduced

Makes encounter identity memorable and actionable.

18. InitiativeQueue
Purpose

Display upcoming turn order.

Content
current actor
next 3 to 6 units
statuses affecting timing
delayed casts or interrupts
FFT Influence

One of the most important borrowed principles. Players need to know the next beat of the drum.

Display Options
vertical ribbon on desktop
compact horizontal strip on narrower screens
Risk Reduced

Improves planning and reduces surprise frustration.

19. UnitDetailCard
Purpose

Provide detailed info about the selected unit.

Content
unit name
faction
HP/MP/shield
statuses
affinities/resistances
recent action
threat level
movement type
special behavior flags
Behavior
updates when unit is selected or hovered
can pin selected target
fallback to active unit in idle mode
Risk Reduced

Keeps deep combat info on-demand instead of always-on clutter.

20. ThreatIntentPanel
Purpose

Display enemy intent or tactical threat estimates.

Content
known or predicted target
likely action type
danger rating
threatened tiles
“aggro” style indicators if relevant
Design Direction

This can be exact or partially obscured depending on game rules.

Example
Intent Detected:
Likely to channel Sonic Collapse
Threat Zone: C2–F4
Priority: Scholar
Risk Reduced

Creates meaningful anticipation, a core tactics pleasure loop.

21. TileInspector
Purpose

Display data about the currently hovered or selected tile.

Content
coordinate
terrain type
occupant
tile effects
movement cost
range relevance
magical residue / field status
Behavior
lightweight by default
expands if the tile has significant data
Risk Reduced

Makes tile information inspectable without covering the board in icons.

22. BottomCommandBand
Purpose

The main interaction spine. This replaces the plain text action console with a modern tactical command rail.

Children
ActionBar
ActionHintStrip
ConfirmCancelBar
Design Rules
always visible
keyboard and mouse equivalent
high clarity, no guesswork
command labels and hotkeys both visible
Risk Reduced

This is the single largest UX modernization lever.

23. ActionBar
Purpose

Primary action selection.

Actions
Move
Inscribe
Channel
Wait
Examine
Items
Flee
Each action shows
icon
label
hotkey
disabled state
hover description
selected styling
FFT Influence

Action choice should feel immediate and official, like selecting command verbs in a tactics game.

Risk Reduced

Turns the action console from a text list into a tactical command surface.

24. ActionHintStrip
Purpose

Show contextual metadata for the selected action.

Content
range
MP cost
cast time
target rules
status caveats
quick reminder text
Example
INSCRIBE • Range 2 • MP 1 • Single Target • Requires line of effect
Risk Reduced

Reduces panel-hopping for basic decision data.

25. ConfirmCancelBar
Purpose

Standardize commit/back behavior.

Content
confirm key
cancel key
alternate preview key
cycle target key
action-specific confirm warnings if needed
Rule

This must behave identically across all modes unless there is a very good reason not to.

Risk Reduced

Creates predictable interaction grammar.

26. ScholarStatusPanel
Purpose

Persistent player state display.

Content
HP
MP
shields/ward if relevant
statuses
action points or turn resources if used
class/school resonance state if relevant
Design Rules
always visible
compact
high-contrast bars
severe-state feedback for low HP/low MP
Behavior
richer details on hover/focus
downtime mode can simplify nonessential secondary metrics
Risk Reduced

Ensures critical survival info never gets buried.

27. CombatLogDrawer
Purpose

Preserve MUD soul without letting text flood the battlefield.

Modes
collapsed
compact stream
expanded full chronicle
Categories
combat
system
narrative
communication/whisper
loot/reward
Features
category filters
scrollback
fade older entries
pin important events
hotkey to expand/collapse
Design Rule

The log should support density, not impose it constantly.

Risk Reduced

Maintains MUD richness while preventing text-overload suffocation.

Layout Behavior by Mode
idle

Visible:

board
compact right rail
compact left rail
action bar
scholar status
compact log

Hidden/minimized:

path preview
target preview
expanded cast prediction
move

Visible:

path preview
move range overlay
tile inspector
action hints
danger overlays

Minimized:

inscription editor
inscribe

Visible:

expanded inscription panel
cost preview
selected action context
targetable range if applicable

Minimized:

nonessential tile detail
targeting

Visible:

target preview layer
cast prediction card
unit detail
threat/intention
confirm/cancel bar emphasized
resolve

Visible:

floating combat text
concise log event burst
HP/MP updates
initiative shift animation

Suppressed:

edit-heavy interfaces
Styling / Visual System PDR
Design Language

Keep Scholomance’s occult-terminal DNA, but sharpen the signal.

UI Surface Rules
dark obsidian base
subtle gold dividers
limited accent colors by semantic type
stronger spacing than current build
fewer hard rectangles stacked endlessly
more deliberate modular cards and rails
Typography Hierarchy
Tier 1: turn state / action
Tier 2: module headings
Tier 3: core values and labels
Tier 4: secondary metadata
Visual Tone

Not neon cyber sludge.
Not generic clean SaaS strategy UI.
Think ritual tactics apparatus.

Motion Rules
Good Motion
command focus transitions
initiative queue slide
tile select pulse
board overlay fade
HP/MP bar change
cast ignition burst
Bad Motion
excessive border pulsing
constant idle animation on every panel
blurry heavy bloom
dramatic shake on low-value events
Timing Guidance
small UI transitions: 120 to 180ms
panel transitions: 180 to 240ms
tactical previews: 200 to 300ms
resolution emphasis: brief and readable
Input / Interaction Requirements
Keyboard
WASD / arrows move cursor
Enter confirm
Esc cancel/back
number keys select action
Tab cycle target
Q/E cycle units
` opens quick command line
Up recalls previous verse
hotkeys always visible in UI
Mouse
hover tile inspect
click action to select
click tile to target
right click cancel
wheel optional zoom/layer cycling
Macro Support
save inscription templates
bind to action slots
repeat last action
recent action history
Dependency Check
Shared Systems Likely Touched
combat state/store
board renderer
action resolution preview engine
typography/theme tokens
accessibility settings
keyboard input manager
animation/motion layer
future ritual prediction/autocomplete system
Shared Consumer Risk

If you redesign ActionBar, InscriptionPanel, or TacticalBoard in isolation without central mode/state cleanup, the UI will fragment fast.

Suggested Implementation Order
Phase 1: Structural Foundation

Build:

CombatShell
TopCombatBar
BottomCommandBand
ScholarStatusPanel
Why

Creates the new stable skeleton before deeper tactical work.

Phase 2: Board Priority Pass

Build/refactor:

TacticalBoardStage
TacticalBoard
TileCursor
TileInspector
Why

Makes battlefield the visual and interaction center.

Phase 3: Tactical Intelligence

Build:

RangeOverlayLayer
PathPreviewLayer
TargetPreviewLayer
InitiativeQueue
UnitDetailCard
ThreatIntentPanel
Why

This is where the FFT blood starts circulating.

Phase 4: Scholomance Ritual Layer

Build/refactor:

LeftCommandRail
ActionContextHeader
InscriptionPanel
CastPredictionCard
SavedWeavesPanel
Why

Lets your unique verse-combat system sing instead of mumble in a corner.

Phase 5: MUD Density Control

Build/refactor:

CombatLogDrawer
compact/immersive/tactical presets
panel collapse rules
customization settings
Why

This preserves information richness without burying the board alive.

QA Checklist
Core Readability
Can the player identify current turn state instantly?
Is the board visually dominant?
Are HP/MP and selected action always easy to find?
Tactical Clarity
Does move mode clearly show path and destination?
Does targeting mode clearly show affected tiles and units?
Can the player understand forecasted outcome before confirming?
Input Flow
Can one complete turn be performed keyboard-only?
Do cancel/back actions behave consistently?
Are hotkeys always visible for the active context?
Density Control
Are nonessential panels minimized during decision-heavy moments?
Does idle mode feel calmer than targeting mode?
Does the log support depth without demanding attention constantly?
Identity
Does it still feel like Scholomance?
Does inscription still feel sacred and central?
Does the UI feel modern without becoming generic?
Accessibility
Is everything still readable at larger font sizes?
Are warnings visible without relying only on color?
Does reduced motion preserve usability?
Next Risks
1. State explosion

A mode-aware interface can rot if state ownership is fuzzy.

Mitigation: centralize combat UI mode and preview state early.

2. Overlay clutter

Range, path, tile, threat, and target overlays can become visual soup.

Mitigation: strict overlay priority rules and density presets.

3. Ritual panel overgrowth

The inscription system could slowly re-inflate into another giant text slab.

Mitigation: keep the workflow segmented and progressive.

4. Half-modernization

If only visuals change and interaction grammar stays old, the UI will look newer but still feel ancient.

Mitigation: prioritize command flow and preview logic, not just styling.
