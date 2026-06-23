TRANSITIONS = {
    "cut": {
        "label": "Cut",
        "ffmpeg": None,
        "description": "Instant cut (no transition filter needed).",
    },
    "fade": {
        "label": "Fade",
        "ffmpeg": "fade=t=in:st={start}:d={duration}",
        "description": "Fade from black at the start of the second clip.",
    },
    "crossfade": {
        "label": "Crossfade",
        "ffmpeg": "xfade=transition=fade:duration={duration}:offset={offset}",
        "description": "Crossfade between two clips.",
    },
    "dip_to_black": {
        "label": "Dip to Black",
        "ffmpeg": "xfade=transition=fadeblack:duration={duration}:offset={offset}",
        "description": "Dip to black between clips.",
    },
    "wipe_left": {
        "label": "Wipe Left",
        "ffmpeg": "xfade=transition=wipeleft:duration={duration}:offset={offset}",
        "description": "Wipe from right to left.",
    },
    "wipe_right": {
        "label": "Wipe Right",
        "ffmpeg": "xfade=transition=wiperight:duration={duration}:offset={offset}",
        "description": "Wipe from left to right.",
    },
    "slide": {
        "label": "Slide",
        "ffmpeg": "xfade=transition=slideright:duration={duration}:offset={offset}",
        "description": "Slide the next clip in from the right.",
    },
    "zoom_blur": {
        "label": "Zoom Blur",
        "ffmpeg": "xfade=transition=zoomin:duration={duration}:offset={offset}",
        "description": "Zoom-in blur transition.",
    },
    "pixel_dissolve": {
        "label": "Pixel Dissolve",
        "ffmpeg": "xfade=transition=pixelize:duration={duration}:offset={offset}",
        "description": "Dissolve through pixelation.",
    },
    "lattice_wipe": {
        "label": "Lattice Wipe",
        "ffmpeg": "xfade=transition=squeeze:duration={duration}:offset={offset}",
        "description": "Squeeze/lattice-style transition.",
    },
}
