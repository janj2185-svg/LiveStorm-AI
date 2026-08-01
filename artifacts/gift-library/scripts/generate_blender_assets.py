#!/usr/bin/env python3
"""
SYLORA Gift Library — Blender headless generator
Creates original procedural meshes, PBR materials, simple rigs/animations,
exports GLB, and renders EEVEE preview frames for each gift.

Usage:
  blender --background --python generate_blender_assets.py -- [--limit N] [--start I] [--skip-video]
"""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

# Blender embeds its own Python — resolve paths relative to this file when possible
SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parents[1]
CATALOG = ROOT / "catalog" / "sylora-gifts-100.json"
REPORTS = ROOT / "reports"


def parse_args(argv: list[str]) -> dict:
    args = {"limit": 100, "start": 0, "skip_video": False, "samples": 16}
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    i = 0
    while i < len(argv):
        if argv[i] == "--limit":
            args["limit"] = int(argv[i + 1]); i += 2
        elif argv[i] == "--start":
            args["start"] = int(argv[i + 1]); i += 2
        elif argv[i] == "--skip-video":
            args["skip_video"] = True; i += 1
        elif argv[i] == "--samples":
            args["samples"] = int(argv[i + 1]); i += 2
        else:
            i += 1
    return args


def hsl_to_rgb(h: float, s: float, l: float) -> tuple[float, float, float]:
    h = h % 1.0
    def hue2rgb(p, q, t):
        if t < 0: t += 1
        if t > 1: t -= 1
        if t < 1/6: return p + (q - p) * 6 * t
        if t < 1/2: return q
        if t < 2/3: return p + (q - p) * (2/3 - t) * 6
        return p
    if s == 0:
        return l, l, l
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    return hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)


def clear_scene(bpy):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.armatures, bpy.data.curves):
        for b in list(block):
            block.remove(b)


def make_pbr(bpy, name: str, color, metallic: float, roughness: float, emission_strength: float = 0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission_strength > 0 and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    elif emission_strength > 0 and "Emission" in bsdf.inputs:
        bsdf.inputs["Emission"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_core_geometry(bpy, gift: dict):
    seed = gift["runtime"]["seed"]
    rarity = gift["rarity"]
    primary = gift["vfx"]["primaryElement"]
    h = ((seed % 1000) / 1000.0)
    color = hsl_to_rgb(h, 0.65, 0.55)
    accent = hsl_to_rgb((h + 0.18) % 1.0, 0.7, 0.45)

    # Unique shape family from seed
    family = seed % 7
    objects = []

    if family == 0:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1.0)
        core = bpy.context.active_object
        core.name = "CoreSphere"
    elif family == 1:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
        core = bpy.context.active_object
        core.name = "CoreIco"
    elif family == 2:
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.35, major_segments=48, minor_segments=16)
        core = bpy.context.active_object
        core.name = "CoreTorus"
    elif family == 3:
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1.1, depth=1.8)
        core = bpy.context.active_object
        core.name = "CoreCrystal"
    elif family == 4:
        bpy.ops.mesh.primitive_cube_add(size=1.4)
        core = bpy.context.active_object
        core.name = "CoreCube"
        bpy.ops.object.modifier_add(type="BEVEL")
        core.modifiers[-1].width = 0.08
        core.modifiers[-1].segments = 3
    elif family == 5:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.7, depth=1.6)
        core = bpy.context.active_object
        core.name = "CorePillar"
    else:
        bpy.ops.mesh.primitive_monkey_add(size=1.3)  # still original Sylora gift wrapping — stylized abstract later
        # Replace Suzanne with abstract — use icosphere cluster instead for originality
        bpy.ops.object.delete()
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.55, location=(0, 0, 0))
        core = bpy.context.active_object
        core.name = "CoreCluster"
        for j in range(5):
            ang = j * (2 * math.pi / 5)
            bpy.ops.mesh.primitive_ico_sphere_add(
                subdivisions=1,
                radius=0.28,
                location=(math.cos(ang) * 0.9, math.sin(ang) * 0.9, 0.2 * math.sin(j)),
            )
            objects.append(bpy.context.active_object)

    objects.insert(0, core)

    # Orbiting elements (rig targets)
    orbit_count = {"rare": 3, "epic": 5, "legendary": 7, "mythic": 9, "divine": 12}[rarity]
    orbiters = []
    for i in range(orbit_count):
        ang = i * (2 * math.pi / orbit_count)
        r = 1.8 + (i % 3) * 0.15
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.12 + (i % 4) * 0.02, location=(math.cos(ang) * r, math.sin(ang) * r, math.sin(ang * 2) * 0.3))
        o = bpy.context.active_object
        o.name = f"Orbiter_{i}"
        orbiters.append(o)
        objects.append(o)

    # Materials
    metal = 0.85 if primary in ("metal", "lightning", "tech") else 0.15
    rough = 0.2 if primary in ("crystal", "water", "ice") else 0.45
    emit = 2.5 if primary in ("fire", "light", "lightning", "energy") else (8.0 if rarity == "divine" else 0.4)
    mat_core = make_pbr(bpy, f"mat_core_{gift['slug']}", color, metal, rough, emit)
    mat_orb = make_pbr(bpy, f"mat_orb_{gift['slug']}", accent, 0.6, 0.25, emit * 0.6)
    core.data.materials.append(mat_core)
    for o in orbiters:
        o.data.materials.append(mat_orb)

    # Ground glow disc
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.4, depth=0.05, location=(0, 0, -1.2))
    disc = bpy.context.active_object
    disc.name = "GlowDisc"
    mat_disc = make_pbr(bpy, f"mat_disc_{gift['slug']}", color, 0.0, 0.7, 1.5)
    disc.data.materials.append(mat_disc)
    objects.append(disc)

    return objects, orbiters, core, color


def add_rig_and_animation(bpy, core, orbiters, gift: dict, fps: int = 24):
    duration = gift["durationSec"]
    frames = max(24, int(duration * fps))
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = frames
    bpy.context.scene.render.fps = fps

    # Armature
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm_obj = bpy.context.active_object
    arm_obj.name = f"Rig_{gift['slug']}"
    arm = arm_obj.data
    root = arm.edit_bones[0]
    root.name = "Root"
    root.head = (0, 0, -1.2)
    root.tail = (0, 0, 0)
    bpy.ops.armature.bone_primitive_add()
    core_bone = arm.edit_bones[-1]
    core_bone.name = "Core"
    core_bone.parent = root
    core_bone.head = (0, 0, 0)
    core_bone.tail = (0, 0, 1)
    bpy.ops.object.mode_set(mode="OBJECT")

    # Parent core to armature bone via constraint
    core.parent = arm_obj
    core.parent_type = "BONE"
    core.parent_bone = "Core"

    # Animate core scale pulse + spin
    core.rotation_mode = "XYZ"
    for f, scale, rz in [(1, 0.2, 0), (int(frames * 0.25), 1.15, 1.2), (int(frames * 0.55), 1.0, 3.5), (frames, 1.05, 6.28)]:
        bpy.context.scene.frame_set(f)
        core.scale = (scale, scale, scale)
        core.rotation_euler[2] = rz
        core.keyframe_insert(data_path="scale", frame=f)
        core.keyframe_insert(data_path="rotation_euler", frame=f)

    # Orbiters rotate around Z
    for i, o in enumerate(orbiters):
        o.rotation_mode = "XYZ"
        for f in (1, frames // 2, frames):
            bpy.context.scene.frame_set(f)
            # rotate location around origin
            ang0 = math.atan2(o.location.y, o.location.x)
            r = math.hypot(o.location.x, o.location.y)
            ang = ang0 + (f / frames) * (2 * math.pi) * (1.0 + (i % 3) * 0.25)
            o.location.x = math.cos(ang) * r
            o.location.y = math.sin(ang) * r
            o.location.z = math.sin(ang * 2 + i) * 0.35
            o.keyframe_insert(data_path="location", frame=f)

    return arm_obj, frames


def setup_camera_light(bpy, color, rarity: str):
    bpy.ops.object.camera_add(location=(4.2, -4.8, 2.6), rotation=(math.radians(70), 0, math.radians(40)))
    cam = bpy.context.active_object
    cam.name = "GiftCam"
    bpy.context.scene.camera = cam
    cam.data.lens = 45

    # Key light
    bpy.ops.object.light_add(type="AREA", location=(3, -2, 5))
    key = bpy.context.active_object
    key.data.energy = 500 if rarity in ("mythic", "divine") else 250
    key.data.color = color
    key.data.size = 3

    bpy.ops.object.light_add(type="AREA", location=(-4, 2, 3))
    rim = bpy.context.active_object
    rim.data.energy = 180
    rim.data.color = (0.6, 0.7, 1.0)
    rim.data.size = 2

    bpy.ops.object.light_add(type="POINT", location=(0, 0, 0.5))
    fill = bpy.context.active_object
    fill.data.energy = 80
    fill.data.color = color

    world = bpy.data.worlds.new("GiftWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.01, 0.015, 0.03, 1)
    bg.inputs[1].default_value = 0.3


def configure_eevee(bpy, samples: int):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    # Blender 4 EEVEE Next may use different props — guard
    if hasattr(scene, "eevee"):
        ee = scene.eevee
        if hasattr(ee, "taa_render_samples"):
            ee.taa_render_samples = samples
        if hasattr(ee, "use_bloom"):
            ee.use_bloom = True
            ee.bloom_intensity = 0.35
        if hasattr(ee, "use_gtao"):
            ee.use_gtao = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Filmic"


def export_glb(bpy, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_animations=True,
        export_apply=True,
    )


def save_blend(bpy, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))


def render_thumbnail(bpy, path: Path, frame: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.frame_set(frame)
    scene.render.filepath = str(path)
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)


def render_preview_frames(bpy, frames_dir: Path, frame_count: int, step: int = 2):
    frames_dir.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.image_settings.file_format = "PNG"
    for f in range(1, frame_count + 1, step):
        scene.frame_set(f)
        scene.render.filepath = str(frames_dir / f"frame_{f:04d}.png")
        bpy.ops.render.render(write_still=True)


def ffmpeg_encode(frames_dir: Path, mp4: Path, gif: Path, fps: int = 12):
    mp4.parent.mkdir(parents=True, exist_ok=True)
    gif.parent.mkdir(parents=True, exist_ok=True)
    pattern = str(frames_dir / "frame_%04d.png")
    # frames may be stepped — use glob via concat is harder; use pattern with start_number
    files = sorted(frames_dir.glob("frame_*.png"))
    if not files:
        return False
    # Build concat list
    lst = frames_dir / "files.txt"
    with lst.open("w") as fh:
        for f in files:
            fh.write(f"file '{f}'\n")
            fh.write(f"duration {1/fps:.4f}\n")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-vsync", "vfr", "-pix_fmt", "yuv420p", str(mp4)],
        check=False,
        capture_output=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp4), "-vf", "fps=10,scale=256:-1:flags=lanczos", "-loop", "0", str(gif)],
        check=False,
        capture_output=True,
    )
    return mp4.exists()


def process_gift(bpy, gift: dict, args: dict, report: dict):
    slug = gift["slug"]
    clear_scene(bpy)
    objects, orbiters, core, color = add_core_geometry(bpy, gift)
    arm, frames = add_rig_and_animation(bpy, core, orbiters, gift)
    setup_camera_light(bpy, color, gift["rarity"])
    configure_eevee(bpy, args["samples"])

    blend_path = ROOT / gift["assets"]["blender"]
    glb_path = ROOT / gift["assets"]["glb"]
    thumb_path = ROOT / gift["assets"]["thumbnail"]
    poster_path = ROOT / gift["assets"]["poster"]
    mp4_path = ROOT / gift["assets"]["previewMp4"]
    gif_path = ROOT / gift["assets"]["previewGif"]

    save_blend(bpy, blend_path)
    export_glb(bpy, glb_path)
    mid = max(1, frames // 2)
    render_thumbnail(bpy, thumb_path, mid)
    # poster = same for now
    if thumb_path.exists():
        poster_path.write_bytes(thumb_path.read_bytes())

    video_ok = False
    if not args["skip_video"]:
        frames_dir = ROOT / "previews" / "_frames" / slug
        # fewer frames for speed
        step = 3 if gift["rarity"] in ("rare", "epic") else 2
        render_preview_frames(bpy, frames_dir, frames, step=step)
        video_ok = ffmpeg_encode(frames_dir, mp4_path, gif_path)

    report[slug] = {
        "id": gift["id"],
        "rarity": gift["rarity"],
        "blend": blend_path.exists(),
        "glb": glb_path.exists(),
        "glbBytes": glb_path.stat().st_size if glb_path.exists() else 0,
        "thumbnail": thumb_path.exists(),
        "previewMp4": mp4_path.exists() if not args["skip_video"] else False,
        "previewGif": gif_path.exists() if not args["skip_video"] else False,
        "frames": frames,
        "videoEncoded": video_ok,
    }
    print(f"[OK] #{gift['id']:03d} {slug} glb={report[slug]['glbBytes']}B")


def main():
    import bpy  # type: ignore

    args = parse_args(sys.argv)
    catalog = json.loads(CATALOG.read_text())
    gifts = catalog["gifts"][args["start"] : args["start"] + args["limit"]]
    REPORTS.mkdir(parents=True, exist_ok=True)
    report = {}
    for gift in gifts:
        try:
            process_gift(bpy, gift, args, report)
        except Exception as e:
            report[gift["slug"]] = {"id": gift["id"], "error": str(e)}
            print(f"[ERR] {gift['slug']}: {e}")

    out = REPORTS / f"blender-generate-{args['start']}-{args['start']+len(gifts)}.json"
    out.write_text(json.dumps({"generated": len(report), "items": report}, indent=2) + "\n")
    print(f"Report → {out}")


if __name__ == "__main__":
    main()
