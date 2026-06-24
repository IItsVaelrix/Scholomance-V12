"""Build music-videos.goldenpack — a curated pack of 250 top music videos.

Each title is registered as a Golden Curve (vectorized by the active TurboQuant
embedder) in an ISOLATED temporary registry, then exported as a portable
.goldenpack. Building in isolation guarantees the pack contains exactly these
250 curves and never touches your live registry. Because every curve stores its
originalText, the pack auto-re-indexes if you later switch embedders (e.g. to
Turbovec). Import it any time with:  /import-pack music-videos
"""
import json
import os
import shutil
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.join(ROOT, "turboquant_plugin.js")
PACK = os.path.join(ROOT, "music-videos.goldenpack")


def node_bin():
    cand = "/home/deck/.nvm/versions/node/v20.20.2/bin/node"
    return cand if os.path.exists(cand) else "node"


# 250 top music videos, grouped by lane. Slugs are unique dict keys.
MUSIC_VIDEOS = {
    # ── GLOBAL HITS (25) ────────────────────────────────────────────
    "mv-despacito": "Luis Fonsi - Despacito ft. Daddy Yankee",
    "mv-shape-of-you": "Ed Sheeran - Shape of You (Official Music Video)",
    "mv-see-you-again": "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack",
    "mv-uptown-funk": "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
    "mv-gangnam-style": "PSY - GANGNAM STYLE(강남스타일) M/V",
    "mv-blank-space": "Taylor Swift - Blank Space",
    "mv-roar": "Katy Perry - Roar (Official)",
    "mv-sugar": "Maroon 5 - Sugar (Official Music Video)",
    "mv-sorry": "Justin Bieber - Sorry (PURPOSE : The Movement)",
    "mv-counting-stars": "OneRepublic - Counting Stars",
    "mv-thinking-out-loud": "Ed Sheeran - Thinking Out Loud (Official Music Video)",
    "mv-dark-horse": "Katy Perry - Dark Horse (Official) ft. Juicy J",
    "mv-hello": "Adele - Hello",
    "mv-lean-on": "Major Lazer & DJ Snake - Lean On (feat. MØ) (Official Music Video)",
    "mv-blinding-lights": "The Weeknd - Blinding Lights (Official Audio)",
    "mv-bad-guy": "Billie Eilish - bad guy",
    "mv-hotline-bling": "Drake - Hotline Bling",
    "mv-without-me": "Eminem - Without Me (Official Music Video)",
    "mv-never-gonna-give-you-up": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    "mv-smells-like-teen-spirit": "Nirvana - Smells Like Teen Spirit (Official Music Video)",
    "mv-bohemian-rhapsody": "Queen - Bohemian Rhapsody (Official Video Remastered)",
    "mv-thriller": "Michael Jackson - Thriller (Official 4K Video)",
    "mv-take-on-me": "a-ha - Take On Me (Official Video) [Remastered in 4K]",
    "mv-sweet-child-o-mine": "Guns N' Roses - Sweet Child O' Mine (Official Music Video)",
    "mv-numb": "Linkin Park - Numb (Official Music Video)",

    # ── RAP & MODERN HIP-HOP (25) ───────────────────────────────────
    "mv-rap-humble": "Kendrick Lamar - HUMBLE.",
    "mv-rap-alright": "Kendrick Lamar - Alright",
    "mv-rap-no-role-modelz": "J. Cole - No Role Modelz",
    "mv-rap-middle-child": "J. Cole - MIDDLE CHILD",
    "mv-rap-gods-plan": "Drake - God's Plan",
    "mv-rap-sicko-mode": "Travis Scott - SICKO MODE ft. Drake",
    "mv-rap-goosebumps": "Travis Scott - goosebumps ft. Kendrick Lamar",
    "mv-rap-lucid-dreams": "Juice WRLD - Lucid Dreams (Directed by Cole Bennett)",
    "mv-rap-xo-tour-llif3": "Lil Uzi Vert - XO Tour Llif3 (Official Music Video)",
    "mv-rap-mask-off": "Future - Mask Off (Official Music Video)",
    "mv-rap-bodak-yellow": "Cardi B - Bodak Yellow [Official Music Video]",
    "mv-rap-rockstar": "Post Malone - rockstar ft. 21 Savage",
    "mv-rap-praise-the-lord": "A$AP Rocky - Praise The Lord (Da Shine) (Official Video) ft. Skepta",
    "mv-rap-dna": "Kendrick Lamar - DNA.",
    "mv-rap-rap-god": "Eminem - Rap God (Explicit)",
    "mv-rap-lose-yourself": "Eminem - Lose Yourself [HD]",
    "mv-rap-in-da-club": "50 Cent - In Da Club (Official Music Video)",
    "mv-rap-still-dre": "Dr. Dre - Still D.R.E. ft. Snoop Dogg",
    "mv-rap-california-love": "2Pac - California Love [Original Version]",
    "mv-rap-juicy": "The Notorious B.I.G. - Juicy (Official Video)",
    "mv-rap-hypnotize": "The Notorious B.I.G. - Hypnotize (Official Music Video)",
    "mv-rap-c-r-e-a-m": "Wu-Tang Clan - C.R.E.A.M. (Official Video)",
    "mv-rap-ms-jackson": "Outkast - Ms. Jackson (Official HD Video)",
    "mv-rap-hey-ya": "Outkast - Hey Ya! (Official HD Video)",
    "mv-rap-gold-digger": "Kanye West - Gold Digger ft. Jamie Foxx",

    # ── BOOM BAP & UNDERGROUND HIP-HOP (25) ─────────────────────────
    "mv-bb-ny-state-of-mind": "Nas - N.Y. State of Mind",
    "mv-bb-shook-ones-pt2": "Mobb Deep - Shook Ones, Pt. II (Official Video)",
    "mv-bb-survival-of-the-fittest": "Mobb Deep - Survival of the Fittest (Official Video)",
    "mv-bb-mass-appeal": "Gang Starr - Mass Appeal (Official Video)",
    "mv-bb-full-clip": "Gang Starr - Full Clip (Official Video)",
    "mv-bb-scenario": "A Tribe Called Quest - Scenario",
    "mv-bb-electric-relaxation": "A Tribe Called Quest - Electric Relaxation",
    "mv-bb-award-tour": "A Tribe Called Quest - Award Tour",
    "mv-bb-doomsday": "MF DOOM - Doomsday (Official Video)",
    "mv-bb-accordion": "Madvillain - Accordion",
    "mv-bb-all-caps": "Madvillain - All Caps (Official Video)",
    "mv-bb-rhymes-like-dimes": "MF DOOM - Rhymes Like Dimes",
    "mv-bb-troy": "Pete Rock & C.L. Smooth - They Reminisce Over You (T.R.O.Y.)",
    "mv-bb-kick-in-the-door": "The Notorious B.I.G. - Kick In The Door",
    "mv-bb-the-message": "Nas - The Message",
    "mv-bb-respiration": "Black Star - Respiration ft. Common",
    "mv-bb-definition": "Black Star - Definition",
    "mv-bb-simon-says": "Pharoahe Monch - Simon Says (Official Video)",
    "mv-bb-step-into-a-world": "KRS-One - Step Into A World (Rapture's Delight)",
    "mv-bb-dead-bent": "MF DOOM - Dead Bent",
    "mv-bb-auditorium": "Mos Def - Auditorium ft. Slick Rick",
    "mv-bb-mathematics": "Mos Def - Mathematics",
    "mv-bb-stakes-is-high": "De La Soul - Stakes Is High",
    "mv-bb-runnin": "The Pharcyde - Runnin'",
    "mv-bb-passin-me-by": "The Pharcyde - Passin' Me By (Official Video)",

    # ── PROGRESSIVE ELECTRONIC / IDM (25) ───────────────────────────
    "mv-elec-strobe": "deadmau5 - Strobe (Official Music Video)",
    "mv-elec-opus": "Eric Prydz - Opus (Official Video)",
    "mv-elec-around-the-world": "Daft Punk - Around the World (Official Music Video)",
    "mv-elec-harder-better": "Daft Punk - Harder, Better, Faster, Stronger (Official Audio)",
    "mv-elec-one-more-time": "Daft Punk - One More Time (Official Video)",
    "mv-elec-flim": "Aphex Twin - Flim",
    "mv-elec-windowlicker": "Aphex Twin - Windowlicker",
    "mv-elec-alberto-balsalm": "Aphex Twin - Alberto Balsalm",
    "mv-elec-roygbiv": "Boards of Canada - Roygbiv",
    "mv-elec-dayvan-cowboy": "Boards of Canada - Dayvan Cowboy",
    "mv-elec-the-model": "Kraftwerk - The Model (Official Video)",
    "mv-elec-autobahn": "Kraftwerk - Autobahn",
    "mv-elec-oxygene-pt4": "Jean-Michel Jarre - Oxygene, Pt. 4",
    "mv-elec-emerald-rush": "Jon Hopkins - Emerald Rush (Official Video)",
    "mv-elec-open-eye-signal": "Jon Hopkins - Open Eye Signal",
    "mv-elec-glue": "Bicep - Glue (Official Video)",
    "mv-elec-apricots": "Bicep - Apricots (Official Video)",
    "mv-elec-awake": "Tycho - Awake",
    "mv-elec-dictaphone": "Tycho - Dictaphone's Lament",
    "mv-elec-inspector-norse": "Todd Terje - Inspector Norse",
    "mv-elec-midnight-city": "M83 - 'Midnight City' (Official Video)",
    "mv-elec-innerbloom": "RÜFÜS DU SOL - Innerbloom (Official Video)",
    "mv-elec-intro": "The xx - Intro",
    "mv-elec-vordhosbn": "Aphex Twin - Vordhosbn",
    "mv-elec-xtal": "Aphex Twin - Xtal",

    # ── CLASSIC ROCK & LEGENDS (25) ─────────────────────────────────
    "mv-rock-stairway": "Led Zeppelin - Stairway to Heaven (Official Audio)",
    "mv-rock-another-brick": "Pink Floyd - Another Brick in the Wall, Pt. 2 (Official Music Video)",
    "mv-rock-hotel-california": "Eagles - Hotel California (Live 1977)",
    "mv-rock-thunderstruck": "AC/DC - Thunderstruck (Official Video)",
    "mv-rock-back-in-black": "AC/DC - Back In Black (Official Video)",
    "mv-rock-paint-it-black": "The Rolling Stones - Paint It, Black (Official Lyric Video)",
    "mv-rock-hey-jude": "The Beatles - Hey Jude",
    "mv-rock-heroes": "David Bowie - Heroes (Official Video)",
    "mv-rock-the-chain": "Fleetwood Mac - The Chain (Official Audio)",
    "mv-rock-baba-oriley": "The Who - Baba O'Riley (Promo Video)",
    "mv-rock-money-for-nothing": "Dire Straits - Money For Nothing (Official Music Video)",
    "mv-rock-livin-on-a-prayer": "Bon Jovi - Livin' On A Prayer (Official Music Video)",
    "mv-rock-dont-stop-believin": "Journey - Don't Stop Believin' (Official Audio)",
    "mv-rock-africa": "Toto - Africa (Official HD Video)",
    "mv-rock-every-breath": "The Police - Every Breath You Take (Official Video)",
    "mv-rock-dont-stop-me-now": "Queen - Don't Stop Me Now (Official Video)",
    "mv-rock-tears-in-heaven": "Eric Clapton - Tears in Heaven (Official Video)",
    "mv-rock-sweet-home-alabama": "Lynyrd Skynyrd - Sweet Home Alabama (Official Audio)",
    "mv-rock-dream-on": "Aerosmith - Dream On (Audio)",
    "mv-rock-born-to-run": "Bruce Springsteen - Born to Run (Official Audio)",
    "mv-rock-light-my-fire": "The Doors - Light My Fire (Official Audio)",
    "mv-rock-all-along-watchtower": "Jimi Hendrix - All Along the Watchtower (Official Audio)",
    "mv-rock-have-you-ever-seen-the-rain": "Creedence Clearwater Revival - Have You Ever Seen The Rain (Official)",
    "mv-rock-like-a-rolling-stone": "Bob Dylan - Like a Rolling Stone (Official Audio)",
    "mv-rock-free-fallin": "Tom Petty - Free Fallin' (Official Music Video)",

    # ── POP ANTHEMS (25) ────────────────────────────────────────────
    "mv-pop-billie-jean": "Michael Jackson - Billie Jean (Official Video)",
    "mv-pop-like-a-prayer": "Madonna - Like a Prayer (Official Video)",
    "mv-pop-i-wanna-dance": "Whitney Houston - I Wanna Dance with Somebody (Official Video)",
    "mv-pop-bad-romance": "Lady Gaga - Bad Romance (Official Music Video)",
    "mv-pop-poker-face": "Lady Gaga - Poker Face (Official Music Video)",
    "mv-pop-baby-one-more-time": "Britney Spears - ...Baby One More Time (Official Video)",
    "mv-pop-firework": "Katy Perry - Firework (Official Music Video)",
    "mv-pop-shake-it-off": "Taylor Swift - Shake It Off",
    "mv-pop-levitating": "Dua Lipa - Levitating (Official Music Video) ft. DaBaby",
    "mv-pop-dont-start-now": "Dua Lipa - Don't Start Now (Official Music Video)",
    "mv-pop-save-your-tears": "The Weeknd - Save Your Tears (Official Music Video)",
    "mv-pop-as-it-was": "Harry Styles - As It Was (Official Video)",
    "mv-pop-thank-u-next": "Ariana Grande - thank u, next",
    "mv-pop-cant-stop-the-feeling": "Justin Timberlake - CAN'T STOP THE FEELING! (Official Video)",
    "mv-pop-happy": "Pharrell Williams - Happy (Official Music Video)",
    "mv-pop-viva-la-vida": "Coldplay - Viva La Vida (Official Video)",
    "mv-pop-yellow": "Coldplay - Yellow (Official Video)",
    "mv-pop-believer": "Imagine Dragons - Believer (Official Music Video)",
    "mv-pop-radioactive": "Imagine Dragons - Radioactive (Official Music Video)",
    "mv-pop-apologize": "OneRepublic - Apologize ft. Timbaland (Official Music Video)",
    "mv-pop-wake-me-up": "Avicii - Wake Me Up (Official Video)",
    "mv-pop-chandelier": "Sia - Chandelier (Official Video)",
    "mv-pop-rolling-in-the-deep": "Adele - Rolling in the Deep (Official Music Video)",
    "mv-pop-someone-like-you": "Adele - Someone Like You (Official Music Video)",
    "mv-pop-just-give-me-a-reason": "P!nk - Just Give Me A Reason ft. Nate Ruess (Official Video)",

    # ── R&B & SOUL (25) ─────────────────────────────────────────────
    "mv-rnb-single-ladies": "Beyoncé - Single Ladies (Put a Ring on It) (Official Video)",
    "mv-rnb-halo": "Beyoncé - Halo (Official Video)",
    "mv-rnb-diamonds": "Rihanna - Diamonds (Official Music Video)",
    "mv-rnb-umbrella": "Rihanna - Umbrella (Official Music Video) ft. JAY-Z",
    "mv-rnb-thats-what-i-like": "Bruno Mars - That's What I Like (Official Music Video)",
    "mv-rnb-24k-magic": "Bruno Mars - 24K Magic (Official Music Video)",
    "mv-rnb-earned-it": "The Weeknd - Earned It (Fifty Shades Of Grey) (Official Video)",
    "mv-rnb-yeah": "Usher - Yeah! ft. Lil Jon, Ludacris (Official Video)",
    "mv-rnb-no-one": "Alicia Keys - No One (Official Video)",
    "mv-rnb-all-of-me": "John Legend - All of Me (Official Video)",
    "mv-rnb-thinkin-bout-you": "Frank Ocean - Thinkin Bout You (Official Video)",
    "mv-rnb-good-days": "SZA - Good Days (Official Video)",
    "mv-rnb-best-part": "Daniel Caesar - Best Part ft. H.E.R. (Official Audio)",
    "mv-rnb-superstition": "Stevie Wonder - Superstition (Live)",
    "mv-rnb-whats-going-on": "Marvin Gaye - What's Going On (Official Audio)",
    "mv-rnb-respect": "Aretha Franklin - Respect (Official Audio)",
    "mv-rnb-hit-the-road-jack": "Ray Charles - Hit the Road Jack (Official Audio)",
    "mv-rnb-dock-of-the-bay": "Otis Redding - (Sittin' On) The Dock of the Bay (Official Audio)",
    "mv-rnb-lets-stay-together": "Al Green - Let's Stay Together (Official Audio)",
    "mv-rnb-purple-rain": "Prince - Purple Rain (Official Video)",
    "mv-rnb-forever": "Chris Brown - Forever (Official HD Video)",
    "mv-rnb-my-girl": "The Temptations - My Girl (Official Audio)",
    "mv-rnb-doo-wop": "Lauryn Hill - Doo Wop (That Thing) (Official Video)",
    "mv-rnb-untitled": "D'Angelo - Untitled (How Does It Feel) (Official Video)",
    "mv-rnb-on-and-on": "Erykah Badu - On & On (Official Music Video)",

    # ── METAL & HARD ROCK (25) ──────────────────────────────────────
    "mv-metal-enter-sandman": "Metallica - Enter Sandman (Official Music Video)",
    "mv-metal-nothing-else-matters": "Metallica - Nothing Else Matters (Official Music Video)",
    "mv-metal-master-of-puppets": "Metallica - Master of Puppets (Official Music Video)",
    "mv-metal-chop-suey": "System Of A Down - Chop Suey! (Official Video)",
    "mv-metal-toxicity": "System Of A Down - Toxicity (Official Video)",
    "mv-metal-duality": "Slipknot - Duality (Official Video)",
    "mv-metal-psychosocial": "Slipknot - Psychosocial (Official Video)",
    "mv-metal-du-hast": "Rammstein - Du Hast (Official Video)",
    "mv-metal-sonne": "Rammstein - Sonne (Official Video)",
    "mv-metal-sound-of-silence": "Disturbed - The Sound of Silence (Official Music Video)",
    "mv-metal-down-with-the-sickness": "Disturbed - Down with the Sickness (Official Music Video)",
    "mv-metal-freak-on-a-leash": "Korn - Freak on a Leash (Official Video)",
    "mv-metal-schism": "Tool - Schism (Official Video)",
    "mv-metal-walk": "Pantera - Walk (Official Music Video)",
    "mv-metal-paranoid": "Black Sabbath - Paranoid (Official Video)",
    "mv-metal-the-trooper": "Iron Maiden - The Trooper (Official Video)",
    "mv-metal-painkiller": "Judas Priest - Painkiller (Official Video)",
    "mv-metal-symphony-of-destruction": "Megadeth - Symphony of Destruction (Official Video)",
    "mv-metal-bat-country": "Avenged Sevenfold - Bat Country (Official Music Video)",
    "mv-metal-drown": "Bring Me The Horizon - Drown (Official Video)",
    "mv-metal-stranded": "Gojira - Stranded (Official Music Video)",
    "mv-metal-laid-to-rest": "Lamb of God - Laid to Rest (Official Video)",
    "mv-metal-wrong-side-of-heaven": "Five Finger Death Punch - Wrong Side Of Heaven (Official Video)",
    "mv-metal-crazy-train": "Ozzy Osbourne - Crazy Train (Official Audio)",
    "mv-metal-november-rain": "Guns N' Roses - November Rain (Official Music Video)",

    # ── LATIN & REGGAETON (25) ──────────────────────────────────────
    "mv-latin-gasolina": "Daddy Yankee - Gasolina (Video Oficial)",
    "mv-latin-titi-me-pregunto": "Bad Bunny - Tití Me Preguntó (Video Oficial)",
    "mv-latin-yonaguni": "Bad Bunny - Yonaguni (Video Oficial)",
    "mv-latin-mi-gente": "J Balvin, Willy William - Mi Gente (Official Video)",
    "mv-latin-ginza": "J Balvin - Ginza (Official Video)",
    "mv-latin-hips-dont-lie": "Shakira - Hips Don't Lie (Official Video) ft. Wyclef Jean",
    "mv-latin-waka-waka": "Shakira - Waka Waka (This Time for Africa) (Official Video)",
    "mv-latin-felices-los-4": "Maluma - Felices los 4 (Official Video)",
    "mv-latin-se-preparo": "Ozuna - Se Preparó (Video Oficial)",
    "mv-latin-tusa": "KAROL G, Nicki Minaj - Tusa (Official Video)",
    "mv-latin-malamente": "ROSALÍA - Malamente (Official Video)",
    "mv-latin-bailando": "Enrique Iglesias - Bailando (Official Video) ft. Descemer Bueno, Gente De Zona",
    "mv-latin-echame-la-culpa": "Luis Fonsi, Demi Lovato - Échame La Culpa (Official Video)",
    "mv-latin-el-perdon": "Nicky Jam y Enrique Iglesias - El Perdón (Official Video)",
    "mv-latin-escapate-conmigo": "Wisin - Escápate Conmigo (Official Video) ft. Ozuna",
    "mv-latin-reggaeton-lento": "CNCO - Reggaetón Lento (Bailemos) (Official Video)",
    "mv-latin-robarte-un-beso": "Carlos Vives, Sebastián Yatra - Robarte un Beso (Official Video)",
    "mv-latin-la-bachata": "Manuel Turizo - La Bachata (Video Oficial)",
    "mv-latin-todo-de-ti": "Rauw Alejandro - Todo De Ti (Official Video)",
    "mv-latin-china": "Anuel AA, Daddy Yankee, Karol G, Ozuna, J Balvin - China (Video Oficial)",
    "mv-latin-pepas": "Farruko - Pepas (Official Video)",
    "mv-latin-danza-kuduro": "Don Omar - Danza Kuduro ft. Lucenzo (Official Video)",
    "mv-latin-vivir-mi-vida": "Marc Anthony - Vivir Mi Vida (Official Video)",
    "mv-latin-corre": "Jesse & Joy - Corre! (Video Oficial)",
    "mv-latin-rayando-el-sol": "Maná - Rayando el Sol (Official Video)",

    # ── K-POP & GLOBAL (25) ─────────────────────────────────────────
    "mv-kpop-dynamite": "BTS - Dynamite (Official MV)",
    "mv-kpop-butter": "BTS - Butter (Official MV)",
    "mv-kpop-dna": "BTS - DNA (Official MV)",
    "mv-kpop-boy-with-luv": "BTS - Boy With Luv ft. Halsey (Official MV)",
    "mv-kpop-ddu-du-ddu-du": "BLACKPINK - DDU-DU DDU-DU (Official MV)",
    "mv-kpop-kill-this-love": "BLACKPINK - Kill This Love (Official MV)",
    "mv-kpop-how-you-like-that": "BLACKPINK - How You Like That (Official MV)",
    "mv-kpop-pink-venom": "BLACKPINK - Pink Venom (Official MV)",
    "mv-kpop-what-is-love": "TWICE - What Is Love? (Official MV)",
    "mv-kpop-fancy": "TWICE - FANCY (Official MV)",
    "mv-kpop-love-shot": "EXO - Love Shot (Official MV)",
    "mv-kpop-gods-menu": "Stray Kids - God's Menu (Official MV)",
    "mv-kpop-hot": "SEVENTEEN - HOT (Official MV)",
    "mv-kpop-super-shy": "NewJeans - Super Shy (Official MV)",
    "mv-kpop-ditto": "NewJeans - Ditto (Official MV)",
    "mv-kpop-next-level": "aespa - Next Level (Official MV)",
    "mv-kpop-tomboy": "(G)I-DLE - TOMBOY (Official MV)",
    "mv-kpop-i-am": "IVE - I AM (Official MV)",
    "mv-kpop-psycho": "Red Velvet - Psycho (Official MV)",
    "mv-kpop-bang-bang-bang": "BIGBANG - BANG BANG BANG (Official MV)",
    "mv-kpop-gentleman": "PSY - GENTLEMAN (Official MV)",
    "mv-kpop-wannabe": "ITZY - WANNABE (Official MV)",
    "mv-kpop-bboom-bboom": "MOMOLAND - BBoom BBoom (Official MV)",
    "mv-kpop-seven": "Jung Kook - Seven ft. Latto (Official MV)",
    "mv-kpop-lalisa": "LISA - LALISA (Official MV)",
}


def main():
    assert len(MUSIC_VIDEOS) == 250, f"expected 250 curves, have {len(MUSIC_VIDEOS)}"

    tmp = tempfile.mkdtemp()
    proc = subprocess.Popen(
        [node_bin(), PLUGIN],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, cwd=tmp,
    )

    def rpc(payload):
        proc.stdin.write(json.dumps(payload) + "\n")
        proc.stdin.flush()
        return json.loads(proc.stdout.readline())

    try:
        health = rpc({"action": "ping", "id": 0})
        print(f"TurboQuant engine: embedder={health.get('embedder')} "
              f"dims={health.get('dims')} semantic={health.get('semantic')}")
        print(f"Registering {len(MUSIC_VIDEOS)} music-video Golden Curves (isolated registry)…")

        failed = 0
        for i, (name, title) in enumerate(MUSIC_VIDEOS.items(), 1):
            r = rpc({"action": "register", "name": name, "text": title, "id": i})
            if r.get("status") != "ok":
                failed += 1
                print(f"  ! {name}: {r.get('error')}")
            if i % 25 == 0:
                print(f"  [{i}/{len(MUSIC_VIDEOS)}] quantized")

        r = rpc({"action": "export-pack", "filename": PACK, "id": 999999})
        if r.get("status") == "ok":
            print(f"\n✔ Exported {r.get('size')} curves → {PACK}")
            if failed:
                print(f"  ({failed} registrations failed)")
            print("Import in the cockpit with:  /import-pack music-videos")
        else:
            print(f"\n✘ Export failed: {r.get('error')}")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        for s in (proc.stdin, proc.stdout, proc.stderr):
            try:
                s.close()
            except Exception:
                pass
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
