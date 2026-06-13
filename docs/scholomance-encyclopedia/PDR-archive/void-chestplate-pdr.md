PDR: VOID Chestplate
High-Fantasy Deterministic Armor Artifact for PixelBrain Item Foundry

Status: Implemented
Classification: Item Foundry + Armor Archetype + Material/Shader Integration + PixelBrain
Priority: High
Primary Goal: Define a fully featured VOID chestplate artifact spec and implementation plan that demonstrates the full power of ChestplateAMP, material slot binding, heraldry, gem sockets, shader export, glow behavior, and deterministic PixelBrain output.

1. Executive Summary

This PDR defines a flagship armor artifact:

VOID Chestplate

The VOID Chestplate is intended to be a premium Foundry-grade equipment asset that proves PixelBrain can generate more than weapons and shields. It should read as:

dark
regal
otherworldly
defensive
intelligent
void-infused
high-rarity
game-ready

This is not a generic steel cuirass recolored black. This is a fully authored equipment-class artifact with:

torso silhouette
collar and chest structure
pauldrons
trim
center void core
runic or harmonic glyphs
gemstone sockets
layered plate behavior
shader-reactive void accents
export-ready asset metadata

The purpose of this item is twofold:

As an individual asset: create an impressive VOID chestplate.
As a foundry proof: prove that a richly detailed armor item can be generated from a deterministic structured spec.

This chestplate should become the seed artifact for future branches:

Void Chestplate
→ Void Battlemage Plate
→ Void Paladin Plate
→ Void Assassin Vestplate
→ Void Royal Chestguard
→ Void Corrupted Breastplate
→ Void Sonic Resonance Plate
2. Product Identity
2.1 Item Name

VOID Chestplate

Optional flavor variants:

Voidsteel Sovereign Chestplate
Hollow Will Chestplate
Abyssal Resonance Plate
Voidborne Aegis Plate
Black Star Cuirass
2.2 Visual Identity

The VOID Chestplate should visually communicate:

void core energy
obsidian/voidsteel body
elegant but ominous silhouette
high-status fantasy armor
mystic engineered intelligence
subtle glow rather than loud cartoon glow
contained power
2.3 Moodboard Language
obsidian
voidsteel
black enamel
deep indigo undertones
amethyst resonance
gold or pale void-gold trim
sternum core
arcane crest
harmonic runes
dim starfield reflections
3. Problem Statement

Chestplates are more complex than shields or weapons because they must read as wearable armor rather than a flat icon.

For the VOID Chestplate specifically, the challenges are:

Void materials can become muddy if value separation is weak.
Dark armor needs controlled highlights or it disappears into itself.
The chestplate must still read as armor, not just a dark shield shape.
Decorative features must not overpower the base silhouette.
Void identity must feel premium and intentional, not simply “black with purple.”
Emissive and shader features must enhance, not replace, readability.
All bells and whistles must remain deterministic.
4. Product Goal

Produce a deterministic Foundry-generated chestplate that includes:

readable armor silhouette
neck gap/collar
pauldrons
center chest identity
controlled trim
clear material separation
void-infused visual effects
export bundle and metadata
future animation/shader extensibility

Canonical target pipeline:

ITEM-SPEC-v1
  -> ChestplateAMP
  -> armor part map
  -> material slot binder
  -> heraldry / glyph
  -> gem socket placement
  -> volume / shadow / trim logic
  -> render packet
  -> shader packet
  -> PNG / .pbrain / diagnostics
5. Non-Goals
Do not build a full humanoid sprite sheet in v1.
Do not animate the armor in v1.
Do not support every armor style at once.
Do not allow uncontrolled randomness.
Do not flatten all detail into one material layer.
Do not make the void effects so bright that the item stops reading as armor.
Do not replace ChestplateAMP; this PDR uses it as the underlying archetype engine.
6. Core Fantasy Brief

The VOID Chestplate should feel like:

A regal chestplate forged from voidsteel and obsidian, carrying a sternum-mounted void core, flanked by disciplined shoulder plates, lined with subtle gold or pale auric trim, and inscribed with harmonic runes that imply deep willpower and resonant control over emptiness.

Design pillars:

Power containment
Authority
Mysticism
Negative-space beauty
Darkness with disciplined highlights
Abyssal elegance
Rarity
7. Feature Set: “All the Bells and Whistles”

This item should support the following feature stack.

7.1 Base Armor Form
primary torso plate
left/right pauldrons
collar or neck guard
sternum centerplate
waist taper
lower plate flare or fauld hint
subtle side plating
7.2 Material Complexity
voidsteel / obsidian body
pale gold or auric trim
amethyst or deep sapphire secondary highlights
optional central gemstone or void orb
leather or dark cloth underlayer if visible
7.3 Void Identity
central void core
negative-space style inner darkness
harmonic rings, runes, or void channels
faint violet or indigo resonance
subtle glow cracks or channel lines
7.4 Prestige Detailing
premium pauldron edges
sternum gem/socket
rune sigils
beveled trim
ornamental chest emblem
small crown/eye/star/moon insignia options
7.5 Shader/FX Hooks
void shimmer
restrained emissive pulse
resonance ripple
starfield fleck hints
low-intensity glyph glow
optional energy breathing effect
7.6 Export and Foundry Integration
PNG export
.pbrain metadata
deterministic hash
material slot manifest
shader packet
optional Phaser/Godot-ready metadata
8. Proposed Item Spec
8.1 Canonical VOID Chestplate Spec
{
  "contract": "ITEM-SPEC-v1",
  "id": "void.chestplate.sovereign.v1",
  "class": "armor",
  "archetype": "chestplate",
  "rarity": "legendary",
  "theme": ["void", "will", "resonance"],
  "canvas": { "width": 64, "height": 80 },
  "seed": 110731,
  "bytecode": "VW-VOID-WILL-SONIC-TRANSCENDENT",
  "symmetry": {
    "axis": "vertical",
    "mode": "strict"
  },
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.void_royal",
      "fill": { "material": "voidsteel" },
      "trim": { "material": "void_gold" },
      "outline": { "material": "blacksteel" }
    },
    {
      "id": "collar",
      "profile": "armor.collar.high_void",
      "attach": { "parent": "body", "at": "top" },
      "fill": { "material": "obsidian" }
    },
    {
      "id": "left_pauldron",
      "profile": "armor.pauldron.angular_royal",
      "attach": { "parent": "body", "at": "leftShoulder" },
      "fill": { "material": "voidsteel" },
      "trim": { "material": "void_gold" }
    },
    {
      "id": "right_pauldron",
      "mirrorOf": "left_pauldron"
    },
    {
      "id": "center_core",
      "profile": "gem.socket.void_orb",
      "attach": { "parent": "body", "at": "centerChest" },
      "fill": { "material": "void_core" },
      "outline": { "material": "void_gold" }
    },
    {
      "id": "emblem",
      "profile": "heraldry.void_eye",
      "attach": { "parent": "body", "at": "safeZone.center" },
      "fill": { "material": "amethyst_resonance" }
    },
    {
      "id": "rune_channels",
      "profile": "motif.harmonic_channels",
      "attach": { "parent": "body", "at": "safeZone.upperLower" },
      "fill": { "material": "void_rune_glow" }
    }
  ],
  "shader": {
    "kind": "void-armor-breath",
    "resonanceDefault": 0.34,
    "pulseSpeed": 0.7,
    "flicker": 0.0
  }
}
9. Material Slot Plan
9.1 Primary Material Slots
Slot	Material	Purpose
body	voidsteel	main armor mass
outline	blacksteel	structural definition
trim	void_gold	prestige detailing
collar	obsidian	neck authority
shadowPlate	deep_indigo_steel	tonal depth
9.2 Secondary Slots
Slot	Material	Purpose
center_core	void_core	sternum focal point
emblem	amethyst_resonance	symbolic identity
rune_channels	void_rune_glow	subtle magical detail
underlayer	void_cloth	optional interior backing
socket_rim	void_gold	gem containment
9.3 Recommended Material Definitions
voidsteel
dark indigo-black base
cool metallic midtone
restrained highlight
elegant, high-density feel
obsidian
near-black body
glossy highlight accent
used for dense shadow or high-drama surfaces
void_gold
pale auric metal
slightly muted
premium trim without becoming holy-bright
void_core
black center
purple/indigo glow ring
subtle inner star or negative-space effect
amethyst_resonance
deep violet
cool spectral highlight
used for glyphs/emblems
void_rune_glow
faint indigo/violet line glow
low dominance
should never overpower the item
10. Part Layout
10.1 Required Parts
body
collar
left_pauldron
right_pauldron
center_core
10.2 Optional Premium Parts
waist_guard
sternum_frame
side_straps
chest_emblem
void_spikes
aura_channels
crown_notch
underlayer
10.3 Safe Zone Planning
Upper Safe Zone
collar accent
top glyph lines
not too bright
Center Safe Zone
core
emblem
sternum frame
Lower Safe Zone
tapered motif
lower rune channel
waist plate identity
11. Chestplate Profile Recommendation

Use a dedicated profile:

armor.chestplate.void_royal
11.1 Profile Characteristics
broader shoulders than default
high but not sealed collar
strong center chest authority
elegant waist taper
slight lower point or segmented fauld hint
premium symmetry
subtle angular severity

This profile should feel:

royal
contained
ominous
disciplined
artifact-class
12. Visual Hierarchy

The chestplate should read in this order:

1. Silhouette

“that is a chestplate”

2. Material body

“that is dark void armor”

3. Center focal point

“there is a void core / chest gem / sternum power source”

4. Trim and accents

“this is high rarity / premium / ceremonial”

5. Glyph detail

“this armor has intelligence and arcane identity”

If glow detail becomes more noticeable than silhouette or body, the hierarchy has failed.

13. Heraldry / Emblem Design

The VOID Chestplate should support emblem variants.

13.1 Preferred Emblem Types
void eye
crescent eclipse
black star
harmonic sigil
downturned crown
vertical abyss rune
resonance iris
13.2 Default Emblem for v1

Void Eye

Why:

symbolic
readable
thematically perfect
works with center sternum structure
scales well
13.3 Heraldry Rules
emblem must remain inside center safe zone
emblem must not swallow the core
emblem must preserve material contrast
emblem must not touch the outer rim
emblem must remain readable at 1x scale
14. Gem / Core Design

This item should feature a premium center focal point.

14.1 Center Core Type

Recommended:

gem.socket.void_orb

Visual logic:

black or near-black center
thin violet halo
pale glint or star pin
metallic rim containment
sternum placement
14.2 Alternative Core Variants
amethyst diamond core
star iris core
sonic resonance eye
abyss tear socket
15. Trim Design

Trim is mandatory for prestige.

15.1 Trim Goals
define armor edges
reinforce shoulder authority
increase readability against dark body
imply rarity
frame the core and emblem
15.2 Trim Placement
shoulder/pauldron edges
collar edge
outer torso contour
sternum frame
lower point edge
optional waist plate seams
15.3 Trim Tone

Avoid bright holy gold. Use:

muted auric
void-gold
shadow-gold
pale brass with abyssal restraint
16. Volume and Lighting Model

The VOID Chestplate must not be flat.

16.1 Required Volume Zones
center plate lift
upper chest light catch
side shadow
pauldron highlight
collar shadow
lower taper shadow
rim shadow
16.2 Lighting Intent

Preferred lighting read:

subtle top-left highlight
deep right-side / lower shadow
center core faint emission
16.3 Volume Rule

The armor must read as curved worn metal, not a shield icon.

17. Shader and FX Design

This item deserves a premium shader hook.

17.1 Shader Kind
void-armor-breath
17.2 Shader Responsibilities
very subtle central pulse
low-intensity rune shimmer
occasional micro star speckle
restrained edge sheen
optional resonance ripple from the core
17.3 Shader Non-Goals
no random flicker
no noisy particle chaos
no saturated neon flooding
no loss of pixel readability
17.4 Shader Metadata Example
{
  "kind": "void-armor-breath",
  "targetParts": ["center_core", "emblem", "rune_channels"],
  "resonanceDefault": 0.34,
  "pulseSpeed": 0.7,
  "amplitude": 0.18,
  "sparkleDensity": 0.03
}
18. Optional Variant Features

These are the “bells and whistles” toggles the Foundry should support.

18.1 Corruption Toggle
{
  "damage": {
    "kind": "corrupted",
    "density": 0.12,
    "material": "void_rune_glow"
  }
}

Effect:

fractures
tiny void fissures
stronger corruption identity
18.2 Sonic Variant Toggle

Add resonance ring motifs around the core.

Theme:

VOID / WILL / SONIC
18.3 Royal Variant Toggle
more trim
cleaner symmetry
crown-like collar
premium gem bezel
18.4 Battle-Damaged Variant Toggle
scratches
chips
bent trim
minor core instability
18.5 Elite Boss Variant Toggle
double pauldron ornamentation
multi-socket chest crest
enhanced shader packet
upgraded heraldry
19. Processor Stack

Recommended processing sequence:

ITEM-SPEC-v1
  -> ChestplateAMP
  -> Armor Slot Material Binder
  -> HeraldryAMP
  -> GemSocketAMP
  -> ArmorVolumeAMP
  -> ShadowAMP
  -> TonationAMP
  -> SquareSharpnessContrastAMP
  -> Shader Packet Builder
  -> PixelBrainRenderPacket
  -> Export
20. Diagnostics

The VOID Chestplate should emit rich diagnostics.

20.1 Required Diagnostics
VOID_CHESTPLATE_SPEC_NORMALIZED
VOID_CHESTPLATE_PROFILE_RESOLVED
VOID_CHESTPLATE_SYMMETRY_OK
VOID_CHESTPLATE_CORE_PLACED
VOID_CHESTPLATE_EMBLEM_PLACED
VOID_CHESTPLATE_TRIM_APPLIED
VOID_CHESTPLATE_RUNE_CHANNELS_APPLIED
VOID_CHESTPLATE_MATERIAL_BINDINGS_OK
VOID_CHESTPLATE_SHADER_PACKET_OK
VOID_CHESTPLATE_EXPORT_READY
20.2 Useful Metadata
cell count
outline count
trim count
emblem count
rune channel count
core cell count
symmetry mode
material slot map
export hash
21. QA Requirements
21.1 Silhouette
 reads as a chestplate at a glance
 neck gap preserved
 shoulders read distinctly
 waist taper exists
 lower taper or plate continuation reads properly
 silhouette remains connected
21.2 Material Read
 body reads as voidsteel/obsidian
 trim reads separately from body
 core reads as a distinct focal point
 emblem is visible
 rune glow is visible but controlled
 dark zones do not collapse into one blob
21.3 Detail Hierarchy
 trim does not overpower body
 core remains strongest focal point
 emblem remains readable
 runes remain secondary
 shoulders do not overpower center
21.4 Shader QA
 shader enhances, does not replace, readability
 pulse is subtle
 no flicker chaos
 no artifacting at 1x
 export matches preview intent
21.5 Determinism
 same spec gives same output
 same seed gives same micro-details
 no hidden randomness
 artifact hash stable across runs
22. Acceptance Criteria

The VOID Chestplate is considered successful when a teammate can provide a structured spec and PixelBrain produces:

a readable chestplate
clear void identity
premium armor presentation
proper part separation
strong center focal point
controlled trim and glyph detail
shader-compatible metadata
deterministic artifact bundle

without requiring new per-item engine code.

23. Regression Risks
Risk	Mitigation
chestplate reads like a shield	enforce collar + shoulders + torso taper
dark materials become muddy	strict value separation + trim highlights
core overwhelms the item	dominance cap on center focal point
runes become noise	low-intensity channel rules
trim feels holy instead of void	muted auric / void-gold palette
emblem unreadable	HeraldryAMP safe-zone rules
shader overpowers sprite	low amplitude / deterministic restraint
premium details reduce readability	hierarchy testing at 1x
24. Implementation Phases
Phase 0 — Spec and Slot Planning
define VOID chestplate item spec
define material bindings
define profile selection
define shader metadata contract
Phase 1 — Base Geometry
generate armor.chestplate.void_royal
validate collar / shoulders / waist taper
establish silhouette
Phase 2 — Materials and Trim
bind body/trim/outline materials
apply voidsteel and void-gold rules
ensure dark readability
Phase 3 — Core and Heraldry
place sternum void core
place emblem
validate safe zone and contrast
Phase 4 — Rune Channels and Volume
add channel motifs
apply volume model
refine shadow hierarchy
Phase 5 — Shader and Export
build shader packet
validate preview/export parity
emit final bundle and diagnostics
25. Final Contract
ChestplateAMP owns the armor torso skeleton.
Armor profile library owns the void_royal silhouette.
Material slot binder owns body/trim/core/emblem assignments.
HeraldryAMP owns the chest emblem.
GemSocketAMP owns the sternum core.
ArmorVolumeAMP owns torso mass and readable metal shape.
ShadowAMP owns depth.
TonationAMP owns dark-material balance.
SquareSharpnessContrastAMP owns final pixel clarity.
Shader packet builder owns the restrained void shimmer layer.
PixelBrainAssetPacket remains source truth.
PixelBrainRenderPacket remains visual truth.
Export bundle remains target truth.
26. Final Vision Statement

The VOID Chestplate should feel like:

A legendary suit component forged from abyssal metal, lined with disciplined auric trim, centered on a breathing void core, carrying the authority of will, the silence of emptiness, and the elegance of a rare artifact that belongs to a ruler, a final boss, or a transcendent knight.
