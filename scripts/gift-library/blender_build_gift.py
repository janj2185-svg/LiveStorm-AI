# Blender 4.x script: build one unique SYLORA gift scene, animate, export GLB,
# render poster + short preview image sequence for ffmpeg.
# Usage:
#   blender -b -P scripts/gift-library/blender_build_gift.py -- \
#     --slug lumen-seed --out artifacts/gift-library/lumen-seed \
#     --family organic_seed --vfx light_refract --duration 3.2 --rarity Rare

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Vector


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--family", required=True)
    ap.add_argument("--vfx", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--rarity", required=True)
    ap.add_argument("--name", default="")
    ap.add_argument("--frames", type=int, default=0, help="override preview frame count")
    return ap.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def seed_from(slug: str) -> int:
    return sum((i + 1) * ord(c) for i, c in enumerate(slug)) % 10_000


def make_mat(name: str, color, emission=0.0, metallic=0.0, roughness=0.4, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emission
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs:
        bsdf.inputs["Transmission"].default_value = transmission
    return mat


def add_object(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def build_geometry(family: str, slug: str, rarity: str):
    s = seed_from(slug)
    hue = (s % 360) / 360.0
    # deterministic RGB from hue-ish
    r = 0.25 + 0.55 * abs(math.sin(s * 0.17))
    g = 0.25 + 0.55 * abs(math.sin(s * 0.29 + 1.1))
    b = 0.25 + 0.55 * abs(math.sin(s * 0.41 + 2.2))
    primary = (r, g, b)
    accent = (1.0 - r * 0.5, 1.0 - g * 0.4, 1.0 - b * 0.3)
    root = bpy.data.objects.new(f"GiftRoot_{slug}", None)
    add_object(root)
    pieces = []

    def parent(o):
        o.parent = root
        pieces.append(o)

    # Unique construction paths — not color clones of one mesh.
    if family == "organic_seed":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.55)
        shell = bpy.context.active_object
        shell.name = "SeedShell"
        shell.data.materials.append(make_mat("Shell", primary, emission=0.2, roughness=0.25, transmission=0.35))
        parent(shell)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.22)
        core = bpy.context.active_object
        core.name = "FilamentCore"
        core.data.materials.append(make_mat("Core", accent, emission=4.0, roughness=0.2))
        parent(core)
    elif family == "origami_animal":
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.7, depth=0.35)
        body = bpy.context.active_object
        body.name = "KoiBody"
        body.rotation_euler = Euler((math.pi / 2, 0, 0))
        body.data.materials.append(make_mat("Paper", primary, roughness=0.7))
        parent(body)
        bpy.ops.mesh.primitive_plane_add(size=0.8)
        fin = bpy.context.active_object
        fin.name = "KoiFin"
        fin.location = (0.35, 0, 0.1)
        fin.rotation_euler = Euler((0.4, 0.6, 0.2))
        fin.data.materials.append(make_mat("Fin", accent, roughness=0.65))
        parent(fin)
    elif family == "ribbon":
        bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.06, major_segments=64)
        ribbon = bpy.context.active_object
        ribbon.name = "SignalRibbon"
        ribbon.data.materials.append(make_mat("Ribbon", primary, emission=2.5, roughness=0.3))
        parent(ribbon)
    elif family == "ceramic_prop":
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.35, depth=0.45)
        cup = bpy.context.active_object
        cup.name = "Cup"
        cup.data.materials.append(make_mat("Ceramic", primary, roughness=0.35))
        parent(cup)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(0, 0, 0.55))
        steam = bpy.context.active_object
        steam.name = "SteamProxy"
        steam.scale = (0.7, 0.7, 1.4)
        steam.data.materials.append(make_mat("Steam", (0.9, 0.9, 0.95), emission=0.4, transmission=0.8, roughness=0.1))
        parent(steam)
    elif family == "jewelry_pin":
        bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=0.08)
        pin = bpy.context.active_object
        pin.name = "PinBody"
        pin.data.materials.append(make_mat("Metal", primary, metallic=1.0, roughness=0.2))
        parent(pin)
        for i in range(5):
            ang = i * (2 * math.pi / 5)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(math.cos(ang) * 0.25, math.sin(ang) * 0.25, 0.08))
            star = bpy.context.active_object
            star.name = f"Star{i}"
            star.data.materials.append(make_mat(f"Star{i}", accent, emission=3.0))
            parent(star)
    elif family == "glass_spheres":
        for i, loc in enumerate([(-0.45, 0, 0.3), (0, 0, 0.35), (0.45, 0, 0.28)]):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=0.22 + (i * 0.02), location=loc)
            m = bpy.context.active_object
            m.name = f"Marble{i}"
            col = (primary[0] * (0.6 + 0.2 * i), primary[1], primary[2] * (1 - 0.1 * i))
            m.data.materials.append(make_mat(f"Glass{i}", col, transmission=0.9, roughness=0.05, metallic=0.0, emission=0.15))
            parent(m)
    elif family == "polyhedra":
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.55)
        die = bpy.context.active_object
        die.name = "CrystalDice"
        die.data.materials.append(make_mat("Crystal", primary, transmission=0.7, roughness=0.08, emission=0.5))
        parent(die)
    elif family == "bubbles":
        for i in range(4):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18 + i * 0.03, location=(math.cos(i) * 0.4, math.sin(i) * 0.4, 0.2 * i))
            bub = bpy.context.active_object
            bub.name = f"Bubble{i}"
            bub.data.materials.append(make_mat(f"Bubble{i}", accent, transmission=0.95, roughness=0.02, emission=0.3))
            parent(bub)
    elif family == "theater":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.2))
        arch = bpy.context.active_object
        arch.name = "Proscenium"
        arch.scale = (1.6, 0.2, 1.2)
        arch.data.materials.append(make_mat("Gold", (0.8, 0.65, 0.2), metallic=1.0, roughness=0.25))
        parent(arch)
        bpy.ops.mesh.primitive_plane_add(size=2.0, location=(-0.7, 0.05, 0.9))
        c1 = bpy.context.active_object
        c1.name = "CurtainL"
        c1.scale = (0.5, 1, 1.2)
        c1.data.materials.append(make_mat("VelvetL", (0.45, 0.05, 0.1), roughness=0.7))
        parent(c1)
        bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0.7, 0.05, 0.9))
        c2 = bpy.context.active_object
        c2.name = "CurtainR"
        c2.scale = (0.5, 1, 1.2)
        c2.data.materials.append(make_mat("VelvetR", (0.45, 0.05, 0.1), roughness=0.7))
        parent(c2)
    elif family == "genesis_spire":
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.9, depth=3.2, location=(0, 0, 1.6))
        spire = bpy.context.active_object
        spire.name = "GenesisSpire"
        spire.data.materials.append(make_mat("Spire", primary, emission=1.5, metallic=0.4, roughness=0.2))
        parent(spire)
        for i in range(6):
            ang = i * math.pi / 3
            bpy.ops.mesh.primitive_cube_add(size=0.35, location=(math.cos(ang) * 1.3, math.sin(ang) * 1.3, 0.2))
            b = bpy.context.active_object
            b.name = f"CityBlock{i}"
            b.data.materials.append(make_mat(f"Block{i}", accent, emission=0.4))
            parent(b)
    elif family == "silence_crown":
        bpy.ops.mesh.primitive_torus_add(major_radius=0.7, minor_radius=0.08)
        ring = bpy.context.active_object
        ring.name = "SilenceRing"
        ring.data.materials.append(make_mat("CrystalRing", (0.85, 0.9, 1.0), transmission=0.85, roughness=0.05, emission=0.8))
        parent(ring)
        for i in range(7):
            ang = i * 2 * math.pi / 7
            bpy.ops.mesh.primitive_cone_add(radius1=0.06, depth=0.35, location=(math.cos(ang) * 0.7, math.sin(ang) * 0.7, 0.25))
            tip = bpy.context.active_object
            tip.name = f"CrownTip{i}"
            tip.data.materials.append(make_mat(f"Tip{i}", accent, transmission=0.7, emission=1.2))
            parent(tip)
    else:
        # Generic but still unique per seed: stacked primitives with seed-driven counts
        count = 3 + (s % 5)
        for i in range(count):
            kind = (s + i * 17) % 4
            loc = (math.cos(i + s) * 0.4, math.sin(i + s * 0.2) * 0.4, 0.15 * i)
            if kind == 0:
                bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2 + (i % 3) * 0.05, location=loc)
            elif kind == 1:
                bpy.ops.mesh.primitive_cube_add(size=0.35, location=loc)
            elif kind == 2:
                bpy.ops.mesh.primitive_cone_add(radius1=0.25, depth=0.45, location=loc)
            else:
                bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.07, location=loc)
            o = bpy.context.active_object
            o.name = f"Piece_{family}_{i}"
            o.rotation_euler = Euler((i * 0.2, s * 0.01, i * 0.3))
            o.data.materials.append(
                make_mat(
                    f"Mat_{family}_{i}",
                    (primary[0] * (0.5 + 0.1 * i), primary[1], primary[2]),
                    emission=0.3 + 0.1 * (i % 3),
                    metallic=0.2 * (i % 2),
                    roughness=0.25 + 0.1 * (i % 4),
                    transmission=0.2 if "glass" in family or "crystal" in family or "bubble" in family else 0.0,
                )
            )
            parent(o)

    # Ground plate for environment read
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=2.5, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "GroundGlow"
    ground.data.materials.append(make_mat("Ground", (0.05, 0.06, 0.08), emission=0.15, roughness=0.9))
    parent(ground)

    # Particle proxy objects (story matched via naming / material; runtime has particle pack)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.04, location=(0, 0, 1.2))
    px = bpy.context.active_object
    px.name = f"VFXProxy_{family}"
    px.data.materials.append(make_mat("VFX", accent, emission=5.0))
    parent(px)

    return root, pieces


def animate(root, pieces, duration_s: float, fps: int, family: str):
    total = max(24, int(duration_s * fps))
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = total
    scene.render.fps = fps

    root.rotation_mode = "XYZ"
    root.keyframe_insert(data_path="rotation_euler", frame=1)
    root.rotation_euler.z = math.pi * 2 if family not in {"silence_crown", "ceramic_prop"} else math.pi * 0.35
    root.keyframe_insert(data_path="rotation_euler", frame=total)

    for i, obj in enumerate(pieces[:8]):
        obj.scale = (0.15, 0.15, 0.15)
        obj.keyframe_insert(data_path="scale", frame=1)
        obj.scale = (1, 1, 1)
        obj.keyframe_insert(data_path="scale", frame=max(8, total // 3 + i * 2))
        if "CurtainL" in obj.name:
            obj.location.x = -0.7
            obj.keyframe_insert(data_path="location", frame=1)
            obj.location.x = -1.5
            obj.keyframe_insert(data_path="location", frame=total // 2)
        if "CurtainR" in obj.name:
            obj.location.x = 0.7
            obj.keyframe_insert(data_path="location", frame=1)
            obj.location.x = 1.5
            obj.keyframe_insert(data_path="location", frame=total // 2)
        if "Steam" in obj.name or "VFX" in obj.name:
            obj.location.z = obj.location.z
            obj.keyframe_insert(data_path="location", frame=1)
            obj.location.z += 0.6
            obj.keyframe_insert(data_path="location", frame=total)

    for obj in list(pieces) + [root]:
        if obj.animation_data and obj.animation_data.action:
            for fcurve in obj.animation_data.action.fcurves:
                for kp in fcurve.keyframe_points:
                    kp.interpolation = "BEZIER"


def setup_camera_light(duration_s: float, fps: int):
    bpy.ops.object.camera_add(location=(2.8, -2.8, 1.8))
    cam = bpy.context.active_object
    cam.name = "GiftCamera"
    cam.rotation_euler = Euler((math.radians(65), 0, math.radians(45)))
    bpy.context.scene.camera = cam
    total = max(24, int(duration_s * fps))
    cam.keyframe_insert(data_path="location", frame=1)
    cam.location = (2.2, -2.2, 1.5)
    cam.keyframe_insert(data_path="location", frame=total)

    bpy.ops.object.light_add(type="AREA", location=(2, -1, 4))
    key = bpy.context.active_object
    key.data.energy = 400
    key.data.size = 3
    bpy.ops.object.light_add(type="AREA", location=(-2, 2, 2))
    fill = bpy.context.active_object
    fill.data.energy = 120
    fill.data.size = 4
    world = bpy.data.worlds.new("GiftWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.02, 0.03, 0.05, 1)
    bg.inputs[1].default_value = 0.8


def export_glb(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_animations=True,
        export_apply=False,
    )


def render_preview(out: Path, frames: int):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    # Blender 4 EEVEE Next naming fallback
    if hasattr(scene, "eevee"):
        ee = scene.eevee
        if hasattr(ee, "use_bloom"):
            ee.use_bloom = True
        if hasattr(ee, "bloom_intensity"):
            ee.bloom_intensity = 0.08
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"
    scene.render.fps = scene.render.fps

    # poster mid-frame
    mid = max(1, scene.frame_end // 2)
    scene.frame_set(mid)
    poster = out / "poster.png"
    scene.render.filepath = str(poster)
    bpy.ops.render.render(write_still=True)

    # short preview sequence (cap frames for time)
    seq_dir = out / "_frames"
    seq_dir.mkdir(exist_ok=True)
    step = max(1, scene.frame_end // max(1, frames))
    rendered = 0
    for f in range(1, scene.frame_end + 1, step):
        if rendered >= frames:
            break
        scene.frame_set(f)
        scene.render.filepath = str(seq_dir / f"frame_{rendered:04d}.png")
        bpy.ops.render.render(write_still=True)
        rendered += 1
    return rendered


def write_particle_pack(out: Path, vfx: str, rarity: str):
    pack = {
        "name": f"particles_{vfx}",
        "vfx_family": vfx,
        "max_particles": {"Rare": 200, "Epic": 600, "Legendary": 1500, "Mythic": 3000, "Divine": 5000}.get(rarity, 200),
        "spawn_rate_per_second": {"Rare": 40, "Epic": 80, "Legendary": 120, "Mythic": 180, "Divine": 220}.get(rarity, 40),
        "notes": "Runtime particle system parameters for @sylora/gift-runtime; textures authored per gift.",
    }
    pdir = out / "particles"
    pdir.mkdir(exist_ok=True)
    (pdir / "particle_pack.json").write_text(json.dumps(pack, indent=2) + "\n")


def main():
    args = parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    clear_scene()
    root, pieces = build_geometry(args.family, args.slug, args.rarity)
    fps = 24
    animate(root, pieces, args.duration, fps, args.family)
    setup_camera_light(args.duration, fps)
    blend_path = out / "scene.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    glb_path = out / "model.glb"
    export_glb(glb_path)
    frames = args.frames or (12 if args.rarity == "Rare" else 16 if args.rarity == "Epic" else 20)
    rendered = render_preview(out, frames)
    write_particle_pack(out, args.vfx, args.rarity)
    meta = {
        "slug": args.slug,
        "family": args.family,
        "vfx": args.vfx,
        "duration": args.duration,
        "rarity": args.rarity,
        "preview_frames": rendered,
        "blender": bpy.app.version_string,
        "engine": "BLENDER_EEVEE",
    }
    (out / "blender_build.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
