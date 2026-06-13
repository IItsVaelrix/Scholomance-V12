import wave
import struct
import json
import math
import re

wav_path = "/home/deck/Desktop/Scholomance-V12-main/music/Empty Dreams.wav"

lyrics_raw = """
Injury in a melody
imagery weaved in symphonies
wicked schemes drip acidic heat
let it be, let it be...

Monotony turns economy
prophecy seen as comedy
Logically, I just got to be.
Let it be, let it be.

Emptiness is serenity
maybe this is the remedy
the abyss and the entropy
let me see, let me see...

The void is an energy
avoid is the tendency
enjoy making enemies
let them bleed, let them bleed

Sorrow stained, so it's rest in peace
bottles came, now identity
split in half and the rest of me
empty dreams, empty dreams.

Let it be, Let it be,
Let it be, Let it be,
Let me see, let me see,
empty dreams, empty dreams.
Let it be, Let it be,
Let it be, Let it be,
Let me see, let me see,
empty dreams, empty dreams.
empty dreams, empty dreams.
empty dreams, empty dreams.
"""

# Extract words
words = [w for w in re.split(r'\s+', lyrics_raw) if w.strip()]
num_words = len(words)

try:
    with wave.open(wav_path, 'rb') as wf:
        nchannels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        nframes = wf.getnframes()
        
        window_size = framerate // 5  # 200ms window
        
        energy_levels = []
        frames_read = 0
        
        while frames_read < nframes:
            frames = wf.readframes(window_size)
            if not frames:
                break
            frames_read += window_size
            
            samples = struct.unpack(f"<{len(frames)//sampwidth}h", frames)
            energy = math.sqrt(sum(s*s for s in samples) / len(samples))
            energy_levels.append((frames_read / framerate, energy))

    # detect local peaks
    local_peaks = []
    for i in range(1, len(energy_levels)-1):
        t, e = energy_levels[i]
        if e > energy_levels[i-1][1] and e > energy_levels[i+1][1]:
            local_peaks.append((t, e))

    # sort local peaks by energy descending to pick the strongest ones
    local_peaks.sort(key=lambda x: x[1], reverse=True)
    
    # pick the top `num_words` peaks
    top_peaks = local_peaks[:num_words]
    
    # sort them back by time chronologically
    top_peaks.sort(key=lambda x: x[0])
    
    beats = []
    for i, (t, e) in enumerate(top_peaks):
        # We can map energy to a relative 0.0 - 1.0 scale
        max_e = local_peaks[0][1]
        rel_e = e / max_e if max_e > 0 else 0.5
        
        beats.append({
            "time": round(t, 2),
            "label": words[i],
            "energy": round(rel_e, 2),
            "style": "kinetic"
        })
    
    beatmap = {
        "title": "Empty Dreams",
        "beats": beats
    }
    
    with open("empty_dreams_beatmap.json", "w") as f:
        json.dump(beatmap, f, indent=2)

    print(f"Successfully mapped {num_words} words to audio peaks.")
except Exception as e:
    print(e)
