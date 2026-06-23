from dataclasses import dataclass
from typing import Optional


PIXELBRAIN_PRESETS = {
    "void_crystal": {
        "label": "Void Crystal",
        "font_size": 48,
        "font_color": "#FFD700",
        "shadow": True,
        "outline": True,
        "outline_color": "#4B0082",
        "bg_color": "black@0.6",
        "font_file": None,
    },
    "golden_lattice": {
        "label": "Golden Lattice",
        "font_size": 42,
        "font_color": "#FFD700",
        "shadow": True,
        "outline": False,
        "bg_color": "#1A1100@0.7",
        "font_file": None,
    },
    "neon_rune": {
        "label": "Neon Rune",
        "font_size": 52,
        "font_color": "#00FFCC",
        "shadow": True,
        "outline": True,
        "outline_color": "#003366",
        "bg_color": "black@0.5",
        "font_file": None,
    },
    "vhs_pixel": {
        "label": "VHS Pixel",
        "font_size": 36,
        "font_color": "#FFFFFF",
        "shadow": False,
        "outline": True,
        "outline_color": "#000000",
        "bg_color": "#0000AA@0.3",
        "font_file": None,
    },
    "gameboy_terminal": {
        "label": "GameBoy Terminal",
        "font_size": 32,
        "font_color": "#306230",
        "shadow": False,
        "outline": False,
        "bg_color": "#9BBC0F@0.8",
        "font_file": None,
    },
    "mirrorborne_lyric": {
        "label": "Mirrorborne Lyric Card",
        "font_size": 44,
        "font_color": "#E8D5B7",
        "shadow": True,
        "outline": True,
        "outline_color": "#4A2C2A",
        "bg_color": "#1A0A1E@0.7",
        "font_file": None,
    },
}


@dataclass
class TextCardDef:
    text: str
    style: str
    duration_secs: float
    font_size: int
    font_color: str
    shadow: bool
    outline: bool
    outline_color: str
    bg_color: str
    font_file: Optional[str]
    position: str = "center"
    card_type: str = "title"


def resolve_preset(preset_name: str, text: str, duration_secs: float = 5.0) -> TextCardDef:
    preset = PIXELBRAIN_PRESETS.get(preset_name)
    if preset is None:
        preset = PIXELBRAIN_PRESETS["void_crystal"]
    return TextCardDef(
        text=text,
        style=preset_name,
        duration_secs=duration_secs,
        font_size=preset["font_size"],
        font_color=preset["font_color"],
        shadow=preset["shadow"],
        outline=preset["outline"],
        outline_color=preset.get("outline_color", "black"),
        bg_color=preset["bg_color"],
        font_file=preset.get("font_file"),
        position="center",
        card_type="title",
    )
