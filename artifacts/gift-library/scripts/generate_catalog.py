#!/usr/bin/env python3
"""
SYLORA Gift Library — Catalog Generator
Creates 100 fully original gift definitions (NO TikTok copies).
"""
from __future__ import annotations

import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "catalog" / "sylora-gifts-100.json"
MANIFEST_DIR = ROOT / "manifests"

PRICES = [
    10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
    25000, 50000, 100000, 250000, 500000, 1000000,
    2500000, 5000000, 10000000,
]

RARITIES = (
    [("rare", 20)] + [("epic", 20)] + [("legendary", 20)] + [("mythic", 20)] + [("divine", 20)]
)

# 100 unique original concepts — Sylora IP, not platform copies
CONCEPTS = [
    # RARE 1-20
    ("Ember Seed", "A molten seed cracks open; tiny fireflies spiral into a hearth-glow bloom.", "fire", "nature"),
    ("Tide Bell", "A glass bell rings under water; silver ripples become schooling fish of light.", "water", "sound"),
    ("Frost Quill", "An icy feather writes glowing runes in mid-air, then shatters into snow.", "ice", "magic"),
    ("Pulse Coin", "A spinning coin of brass pulses with heartbeat rhythm and amber sparks.", "metal", "energy"),
    ("Moss Lantern", "Bioluminescent moss ignites inside a wooden lantern; spores drift upward.", "nature", "light"),
    ("Sky Ribbon", "Aurora ribbons braid around the camera, leaving prismatic trails.", "aurora", "air"),
    ("Echo Drum", "A floating drum sends concentric sound rings that warp nearby particles.", "sound", "shockwave"),
    ("Solar Petal", "Sunflower petals of pure light unfold and orbit like miniature suns.", "light", "nature"),
    ("Quartz Nest", "Crystal shards assemble into a nest; a soft light-egg hatches sparks.", "crystal", "life"),
    ("Comet Marble", "A marble becomes a tiny comet, looping thrice with icy exhaust.", "space", "ice"),
    ("Volt Sprout", "Lightning grows like a plant from soil, branching into neon flora.", "lightning", "nature"),
    ("Pearl Orbit", "Three pearls orbit a quiet core; each trail paints a different hue.", "water", "orbit"),
    ("Ash Phoenixling", "A palm-sized ash bird reconstitutes from cinders and flies once.", "fire", "phoenix"),
    ("Glyph Kite", "A paper kite of runes catches wind made of code and rises.", "air", "magic"),
    ("Honey Nova", "A golden droplet expands into a soft nova of warm honey light.", "light", "sweet"),
    ("Iron Bloom", "Metal petals unfurl from a rivet, blooming into a gear-flower.", "metal", "steampunk"),
    ("Rain Prism", "Raindrops freeze mid-fall and refract a rainbow corridor.", "water", "light"),
    ("Star Thimble", "A silver thimble fills with starlight and overflows as constellations.", "space", "craft"),
    ("Wind Chime Gate", "Chimes form a circular gate; wind passes through as visible silk.", "air", "sound"),
    ("Cinder Bookmark", "A burning bookmark opens a floating page of flame-script.", "fire", "story"),
    # EPIC 21-40
    ("Nebula Loom", "A cosmic loom weaves galaxies into a cape that drapes the scene.", "space", "fabric"),
    ("Leviathan Scale", "A single ocean-scale becomes a tidal wave that curls into a heart.", "water", "beast"),
    ("Obsidian Choir", "Obsidian shards sing; harmonic shockwaves sculpt sand into towers.", "sound", "stone"),
    ("Clockwork Aurora", "Clock gears drive an aurora engine; time dilates with each tick.", "steampunk", "aurora"),
    ("Storm Quillstorm", "Hundreds of quills form a cyclone that writes a name in lightning.", "lightning", "storm"),
    ("Crystal Behemoth Cub", "A crystal cub roars; shockwave crystallizes the air into diamonds.", "crystal", "beast"),
    ("Void Orchid", "A black orchid blooms; petals peel into event-horizon petals.", "void", "nature"),
    ("Forge Heart", "A blacksmith heart hammers itself; sparks become constellation nails.", "fire", "metal"),
    ("Mirror Tide", "Ocean and sky swap through a mirror plane; fish swim in clouds.", "water", "mirror"),
    ("Rune Avalanche", "Runes cascade like an avalanche, stacking into a protective ward.", "magic", "stone"),
    ("Photon Dancer", "A dancer of pure photons ribbons through volumetric fog.", "light", "dance"),
    ("Thunder Lotus", "Lotus petals of thunderclouds bloom; center unleashes a quiet bolt.", "lightning", "nature"),
    ("Celestial Abacus", "Beads of planets slide; each click births a miniature eclipse.", "space", "math"),
    ("Ember Symphony", "Flames play a violin of heat; notes appear as floating fire-glyphs.", "fire", "music"),
    ("Glacier Crown", "Ice crowns assemble mid-air and shatter into aurora shards.", "ice", "royalty"),
    ("Sandstorm Sphinx", "A sphinx of sand forms, winks, and dissolves into golden dust.", "sand", "myth"),
    ("Plasma Origami", "Paper folds itself into a crane of plasma and takes flight.", "energy", "origami"),
    ("Harbinger Belltower", "A floating belltower rings once; rain reverses upward.", "sound", "architecture"),
    ("Lumen Serpent", "A serpent of light coils the camera, eyes blooming into novas.", "light", "beast"),
    ("Arcane Hourglass", "Sand becomes star-matter; when flipped, the room reverses gravity briefly.", "magic", "time"),
    # LEGENDARY 41-60
    ("Worldtree Spark", "A miniature worldtree grows in seconds; leaves are living galaxies.", "nature", "cosmos"),
    ("Dragonforge Relic", "An ancient forge awakens; a dragon of molten brass emerges and bows.", "dragon", "fire"),
    ("Abyssal Crown", "Deep-sea crown rises; bioluminescent whales circle in reverence.", "water", "royalty"),
    ("Solar Cathedral", "Stained glass forms a cathedral of sunlight that collapses into a blessing.", "light", "sacred"),
    ("Tempest Throne", "A throne of storms manifests; lightning crowns the streamer silhouette.", "storm", "royalty"),
    ("Chrono Phoenix", "A phoenix ages and rejuvenates in a loop, leaving time-echo afterimages.", "phoenix", "time"),
    ("Mythic Atlas Sphere", "Atlas holds a cracking globe that heals into a verdant Earth.", "myth", "world"),
    ("Eclipse Masquerade", "Masks of sun and moon dance; eclipse paints the room gold-violet.", "space", "mask"),
    ("Siren Observatory", "Telescope becomes a siren; star-song pulls comets into orbit.", "sound", "space"),
    ("Gilded Leviathan", "A gold leviathan breaches from liquid metal and salutes the chat.", "beast", "metal"),
    ("Arc Reactor Bloom", "A floral reactor blooms; petals are containment fields of light.", "energy", "tech"),
    ("Winter Sovereign", "Ice monarch appears; blizzard parts to reveal a warm heart-core.", "ice", "royalty"),
    ("Infernal Ballet", "Two fire dancers duel and fuse into a single radiant figure.", "fire", "dance"),
    ("Oracle Spire", "A spire of prophecy rises; visions cascade as holographic scenes.", "magic", "future"),
    ("Celestine Warhorn", "A warhorn of star-bone sounds; banners of nebulae unfurl.", "space", "war"),
    ("Emerald Behemoth", "A jade titan kneels, offering a mountain of glowing gems.", "crystal", "titan"),
    ("Rift Ballet", "Portals open like stage curtains; dancers leap between realities.", "void", "dance"),
    ("Stormwright Anvil", "Anvil struck by sky-hammer; each strike births a weather system.", "lightning", "forge"),
    ("Moonwell Cascade", "A moonwell overflows; silver waterfalls reverse into the sky.", "water", "moon"),
    ("Aether Colossus", "A gentle colossus of aether forms from chat names and bows.", "aether", "titan"),
    # MYTHIC 61-80
    ("Genesis Loom Eternal", "Creation loom reweaves the stream scene into a living painting.", "creation", "fabric"),
    ("Primordial Tidewyrm", "An ancient tidewyrm circles the Earth-miniature and blesses it.", "water", "dragon"),
    ("Singularity Rose Garden", "Black-hole roses bloom safely; petals are event horizons of color.", "void", "garden"),
    ("Astral Tribunal", "Constellation judges appear; gavel strike becomes a meteor shower of gifts.", "space", "law"),
    ("Phoenix Empire Dawn", "An empire of phoenixes forms a living sunrise across the stage.", "phoenix", "empire"),
    ("Quantum Mythos Engine", "Reality frames stutter; alternate gift endings play in parallel then merge.", "quantum", "meta"),
    ("Oceanus Coronation", "Seas crown the streamer; coral cities rise and cheer silently.", "water", "royalty"),
    ("Helios Forge God", "A solar forge-god shapes a spear of noon and plants it as a beacon.", "fire", "deity"),
    ("Nyx Veil Unbound", "Night veil lifts; dream-creatures parade then dissolve into stars.", "void", "dream"),
    ("Thunder Pantheon", "Multiple storm deities strike a shared chord; sky becomes stained glass.", "lightning", "deity"),
    ("World-End Garden", "Apocalypse flowers bloom then reverse into seeds of hope.", "nature", "apocalypse"),
    ("Infinite Library Gate", "Doors of endless books open; stories fly out as living characters.", "story", "portal"),
    ("Celestial Behemoth Choir", "Mountain-sized beings hum; landscape reshapes to the melody.", "sound", "titan"),
    ("Mirror Multiverse Waltz", "Infinite reflections waltz; the real scene is the last to bow.", "mirror", "multiverse"),
    ("Dragon Eclipse Covenant", "Sun-dragon and moon-dragon seal a covenant above the stage.", "dragon", "eclipse"),
    ("Fate Spindle Absolute", "The spindle of fate spins viewer names into a golden tapestry.", "fate", "craft"),
    ("Abyss Cathedral Rising", "An undersea cathedral ascends intact, bells ringing in vacuum.", "water", "sacred"),
    ("Starforge Apocalypse Key", "A key turns in the sky; galaxies unlock like vault doors.", "space", "key"),
    ("Eternal Ember Throneworld", "A throneworld of embers forms; cities of ash light up joyfully.", "fire", "world"),
    ("Mythweaver Final Quill", "A quill writes the stream's legend in the air; letters become fireworks.", "story", "legend"),
    # DIVINE 81-100
    ("First Light of Sylora", "The origin spark of the platform: a cinematic big-bang of brand light.", "creation", "brand"),
    ("Omega Aurora Godseed", "A godseed cracks; aurora deities bloom and gift the room infinity.", "aurora", "deity"),
    ("Holographic Eden Genesis", "Eden rebuilds as holography then becomes tactile paradise briefly.", "nature", "eden"),
    ("Chronos Endgame Spiral", "Time spiral shows past gifts cascading into a single divine moment.", "time", "meta"),
    ("Leviathan of a Thousand Suns", "A leviathan made of suns passes overhead; warmth without burn.", "space", "beast"),
    ("The Last Symphony of Worlds", "Planets become orchestra; finale collapses into a heart of light.", "music", "cosmos"),
    ("Divine Mirror of All Viewers", "Every viewer face (stylized silhouettes) forms a divine mosaic smile.", "mirror", "community"),
    ("Sylora Pantheon Ascension", "Original pantheon of Sylora rises; each god leaves a unique blessing.", "deity", "brand"),
    ("Infinity Phoenix Rebirth Gate", "Phoenix becomes a gate; streamer walks through reborn in light.", "phoenix", "portal"),
    ("Cosmic Ocean Throne Eternal", "Throne upon a cosmic ocean; tides are galaxies, seat is a star.", "water", "royalty"),
    ("Apotheosis of the Live Stage", "The entire stage ascends as a temple; chat becomes stained-glass choir.", "sacred", "stage"),
    ("Prime Mover Gift Cascade", "All lower gifts echo as silhouettes in a divine cascade finale.", "meta", "combo"),
    ("Unbound Creation Anvil", "Anvil of creation strikes once; a new constellation named for the streamer.", "creation", "forge"),
    ("Eternal Night Bloom Daybreak", "Night-blooming divine flower opens into an impossible daybreak.", "nature", "duality"),
    ("Worldsoul Resonance Choir", "The world's soul sings; terrain, sky, and particles sync to one pulse.", "aether", "soul"),
    ("Hypernova Covenant Seal", "A hypernova freezes mid-burst into a sealed covenant emblem.", "space", "seal"),
    ("The Gift That Remembers You", "Personal cinematic: gift 'remembers' session energy and blooms uniquely.", "ai", "personal"),
    ("Sylora Final Horizon", "Horizon folds into a Möbius stage; ending becomes beginning loop.", "meta", "horizon"),
    ("Absolute Radiance Crown", "Crown of absolute radiance — peak cinematic, slow-mo, brand gold.", "light", "royalty"),
    ("Myth of Forever Live", "Ultimate divine: a mythic retelling of the live moment as epic film.", "story", "ultimate"),
]

assert len(CONCEPTS) == 100, len(CONCEPTS)


def rarity_list() -> list[str]:
    out: list[str] = []
    for name, count in [("rare", 20), ("epic", 20), ("legendary", 20), ("mythic", 20), ("divine", 20)]:
        out.extend([name] * count)
    return out


def price_for(index: int, rarity: str) -> int:
    # Map 100 gifts across price ladder with rarity banding
    bands = {
        "rare": PRICES[0:6],          # 10..500
        "epic": PRICES[5:11],         # 500..25000
        "legendary": PRICES[9:15],    # 10000..500000
        "mythic": PRICES[13:17],      # 250000..2500000
        "divine": PRICES[15:],        # 1000000..10000000
    }
    band = bands[rarity]
    return band[index % len(band)]


def duration_for(rarity: str) -> float:
    return {
        "rare": 3.5,
        "epic": 5.0,
        "legendary": 7.0,
        "mythic": 9.0,
        "divine": 12.0,
    }[rarity]


def lod_budget(rarity: str) -> dict:
    return {
        "rare": {"mobileTris": 8_000, "desktopTris": 40_000, "particles": 400, "targetFps": 60},
        "epic": {"mobileTris": 15_000, "desktopTris": 80_000, "particles": 900, "targetFps": 60},
        "legendary": {"mobileTris": 25_000, "desktopTris": 150_000, "particles": 1800, "targetFps": 55},
        "mythic": {"mobileTris": 40_000, "desktopTris": 250_000, "particles": 3200, "targetFps": 50},
        "divine": {"mobileTris": 60_000, "desktopTris": 400_000, "particles": 5000, "targetFps": 45},
    }[rarity]


def camera_plan(rarity: str, seed: int) -> list[dict]:
    base = [
        {"t": 0.0, "shot": "hero_wide", "fov": 45, "shake": 0.0},
        {"t": 0.25, "shot": "orbit_in", "fov": 38, "shake": 0.05},
        {"t": 0.55, "shot": "impact_close", "fov": 32, "shake": 0.2 + (seed % 5) * 0.02},
        {"t": 0.8, "shot": "slowmo_pullback", "fov": 42, "shake": 0.08},
        {"t": 1.0, "shot": "resolve_logo", "fov": 45, "shake": 0.0},
    ]
    if rarity in ("mythic", "divine"):
        base.insert(3, {"t": 0.65, "shot": "crane_up_godray", "fov": 28, "shake": 0.12})
    return base


def vfx_pack(elements: tuple[str, str], rarity: str) -> dict:
    primary, secondary = elements
    return {
        "primaryElement": primary,
        "secondaryElement": secondary,
        "particles": [primary, secondary, "sparks", "ember" if primary == "fire" else "mist"],
        "volumes": ["godrays", "fog"] if rarity in ("legendary", "mythic", "divine") else ["fog"],
        "post": {
            "bloom": 0.4 + 0.1 * ["rare", "epic", "legendary", "mythic", "divine"].index(rarity),
            "motionBlur": rarity in ("legendary", "mythic", "divine"),
            "dof": rarity in ("epic", "legendary", "mythic", "divine"),
            "lensFlare": rarity in ("mythic", "divine") or primary in ("light", "space", "fire"),
            "chromaticAberration": rarity in ("mythic", "divine"),
        },
        "shaders": ["pbr_metallic_roughness", f"elemental_{primary}", "fresnel_rim"],
        "hdri": f"studio_{primary}_{rarity}",
    }


def reactions(name: str, rarity: str) -> dict:
    return {
        "ai": {
            "priority": {"rare": 4, "epic": 3, "legendary": 2, "mythic": 1, "divine": 1}[rarity],
            "tone": "awe" if rarity in ("mythic", "divine") else "hype",
            "promptHint": f"React to the original Sylora gift '{name}' with a short cinematic shout-out. Never mention other platforms' gifts.",
        },
        "avatar": {
            "animation": "gift_reaction_epic" if rarity != "rare" else "gift_reaction",
            "emotion": "amazed" if rarity in ("legendary", "mythic", "divine") else "happy",
        },
        "streamer": {"overlayFlash": rarity in ("legendary", "mythic", "divine"), "haptic": True},
        "viewer": {"chatEmoteBurst": True, "comboEligible": True},
        "chain": {
            "comboTags": [rarity, name.split()[0].lower()],
            "globalEvent": rarity == "divine",
        },
    }


def build() -> list[dict]:
    rarities = rarity_list()
    gifts = []
    for i, ((name, story, primary, secondary), rarity) in enumerate(zip(CONCEPTS, rarities), start=1):
        slug = (
            name.lower()
            .replace("'", "")
            .replace("—", "-")
            .replace(" ", "-")
            .replace(",", "")
        )
        seed = int(hashlib.sha256(f"sylora:{slug}:{i}".encode()).hexdigest()[:8], 16)
        price = price_for(i - 1, rarity)
        duration = duration_for(rarity)
        gift = {
            "id": i,
            "slug": slug,
            "name": name,
            "brand": "SYLORA",
            "original": True,
            "tiktokDerivative": False,
            "rarity": rarity,
            "priceCoins": price,
            "durationSec": duration,
            "story": story,
            "sceneBeats": [
                {"at": 0.0, "beat": "establish", "desc": f"Quiet stage; {primary} motif hints appear."},
                {"at": 0.2, "beat": "assemble", "desc": f"Unique 3D form of '{name}' assembles with PBR materials."},
                {"at": 0.45, "beat": "spectacle", "desc": story},
                {"at": 0.75, "beat": "interaction", "desc": "AI/avatar/streamer reaction sync markers fire."},
                {"at": 0.92, "beat": "resolve", "desc": "Slow-mo resolve, brand watermark pulse, fade."},
            ],
            "animation": {
                "rig": f"rig_{slug}",
                "clips": ["assemble", "idle_spectacle", "impact", "resolve"],
                "cinematicTransitions": True,
                "slowMotionWindow": [0.7, 0.85] if rarity in ("legendary", "mythic", "divine") else None,
            },
            "vfx": vfx_pack((primary, secondary), rarity),
            "lighting": {
                "mode": "hdr",
                "key": primary,
                "rim": secondary,
                "bloom": True,
                "godrays": rarity in ("legendary", "mythic", "divine"),
            },
            "camera": camera_plan(rarity, seed),
            "audio": {
                "spatial": True,
                "stereoBed": f"sounds/{slug}/bed.ogg",
                "whooshes": f"sounds/{slug}/whoosh.ogg",
                "impact": f"sounds/{slug}/impact.ogg",
                "voiceFx": rarity in ("mythic", "divine"),
                "dynamicMusic": rarity in ("legendary", "mythic", "divine"),
            },
            "interactions": reactions(name, rarity),
            "performance": lod_budget(rarity),
            "assets": {
                "blender": f"blender/{slug}.blend",
                "glb": f"glb/{slug}.glb",
                "previewMp4": f"previews/{slug}.mp4",
                "previewGif": f"gifs/{slug}.gif",
                "thumbnail": f"thumbnails/{slug}.png",
                "poster": f"thumbnails/{slug}-poster.png",
                "manifest": f"manifests/{slug}.manifest.json",
                "particlePack": f"particles/{slug}.json",
                "soundPack": f"sounds/{slug}/pack.json",
            },
            "runtime": {
                "renderer": "three+webgl",
                "webgpuOptional": rarity in ("mythic", "divine"),
                " procedururalFallback": True,
                "seed": seed,
            },
            "qualityTarget": {
                "rare": "premium_stylized",
                "epic": "cinematic_stylized",
                "legendary": "high_cinematic",
                "mythic": "near_feature_cgi",
                "divine": "hollywood_cgi_ambition",
            }[rarity],
            "status": {
                "catalog": "ready",
                "blender": "pending_generate",
                "glb": "pending_generate",
                "preview": "pending_generate",
                "runtimeTest": "pending",
            },
        }
        gifts.append(gift)
    return gifts


def write_manifests(gifts: list[dict]) -> None:
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    for g in gifts:
        manifest = {
            "schemaVersion": "1.0.0",
            "id": g["id"],
            "slug": g["slug"],
            "name": g["name"],
            "rarity": g["rarity"],
            "priceCoins": g["priceCoins"],
            "durationSec": g["durationSec"],
            "entry": {
                "glb": g["assets"]["glb"],
                "proceduralSeed": g["runtime"]["seed"],
                "vfx": g["vfx"],
                "camera": g["camera"],
                "audio": g["audio"],
                "lod": g["performance"],
            },
            "interactions": g["interactions"],
            "combo": g["interactions"]["chain"],
            "integrity": {
                "originalIp": True,
                "forbiddenReferences": ["tiktok-gift-assets", "licensed-third-party-meshes"],
            },
        }
        path = MANIFEST_DIR / f"{g['slug']}.manifest.json"
        path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    gifts = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "library": "SYLORA Gift Library",
        "version": "1.0.0",
        "count": len(gifts),
        "policy": "100% original Sylora IP. No TikTok gift copies.",
        "rarityCounts": {
            "rare": 20,
            "epic": 20,
            "legendary": 20,
            "mythic": 20,
            "divine": 20,
        },
        "gifts": gifts,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    write_manifests(gifts)
    # particle + sound pack stubs
    for g in gifts:
        pdir = ROOT / "particles"
        sdir = ROOT / "sounds" / g["slug"]
        pdir.mkdir(parents=True, exist_ok=True)
        sdir.mkdir(parents=True, exist_ok=True)
        (pdir / f"{g['slug']}.json").write_text(
            json.dumps(
                {
                    "slug": g["slug"],
                    "emitters": g["vfx"]["particles"],
                    "budget": g["performance"]["particles"],
                },
                indent=2,
            )
            + "\n"
        )
        (sdir / "pack.json").write_text(
            json.dumps(
                {
                    "slug": g["slug"],
                    "spatial": True,
                    "layers": ["bed", "whoosh", "impact"],
                    "generated": False,
                    "note": "Procedural WebAudio synth used until studio SFX imported",
                },
                indent=2,
            )
            + "\n"
        )
    print(f"Wrote {OUT} ({len(gifts)} gifts)")
    print(f"Wrote {len(gifts)} manifests → {MANIFEST_DIR}")


if __name__ == "__main__":
    main()
