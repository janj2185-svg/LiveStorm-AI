# Blender 4.x — SYLORA Celestial Phoenix production builder
# Readable avian silhouette, layered feathers, cinematic multi-shot camera,
# procedural 4K PBR maps, EEVEE beauty + GLB desktop/mobile export.
#
# Usage:
#   blender -b -P scripts/gift-library/build_celestial_phoenix.py -- \
#     --out artifacts/gift-library/celestial-phoenix \
#     --render-frames 48 --resolution 960

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector, noise


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=float, default=15.0)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--render-frames", type=int, default=60)
    ap.add_argument("--resolution", type=int, default=960)
    ap.add_argument("--skip-render", action="store_true")
    ap.add_argument("--quick-hero", action="store_true", help="Render one hero still only")
    return ap.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.armatures,
        bpy.data.curves,
        bpy.data.particles,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.images,
        bpy.data.worlds,
        bpy.data.textures,
    ):
        for block in list(collection):
            collection.remove(block)


def link(obj):
    if obj.name not in bpy.context.scene.collection.objects:
        bpy.context.collection.objects.link(obj)
    return obj


def apply_object_transforms(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)


def mesh_from_bmesh(name: str, bm: bmesh.types.BMesh):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link(obj)
    return obj


def solidify_leaf(bm, thickness=0.01):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    result = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    extruded = [e for e in result["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=extruded, vec=(0, 0, thickness))


def make_feather_mesh(name: str, length=0.7, width=0.14, tip_curve=0.18):
    """Tapered vane with midrib — leaf silhouette, not a cube/sphere gift."""
    bm = bmesh.new()
    steps = 14
    verts_a = []
    verts_b = []
    for i in range(steps + 1):
        t = i / steps
        x = t * length
        envelope = math.sin(math.pi * min(1.0, t * 1.05)) ** 0.85
        w = width * envelope * (0.55 + 0.45 * (1.0 - t))
        z = tip_curve * math.sin(t * math.pi) * (0.4 + 0.6 * t)
        # serrated edge
        jag = 0.008 * math.sin(t * 28.0) * (0.2 + 0.8 * t)
        verts_a.append(bm.verts.new((x, -w - jag, z * 0.6)))
        verts_b.append(bm.verts.new((x, w + jag, -z * 0.35)))
    bm.verts.ensure_lookup_table()
    ring = verts_a + list(reversed(verts_b))
    bm.faces.new(ring)
    solidify_leaf(bm, thickness=0.012 + 0.004 * width)
    return mesh_from_bmesh(name, bm)


def loft_capsule(name, path_pts, radius_fn, segments=12, rings=16):
    """Organic tube loft along a polyline — used for neck/body/limbs."""
    bm = bmesh.new()
    rings_v = []
    for i, p in enumerate(path_pts):
        t = i / max(1, len(path_pts) - 1)
        r = radius_fn(t)
        # tangent
        if i == 0:
            tangent = (path_pts[1] - path_pts[0]).normalized()
        elif i == len(path_pts) - 1:
            tangent = (path_pts[-1] - path_pts[-2]).normalized()
        else:
            tangent = (path_pts[i + 1] - path_pts[i - 1]).normalized()
        up = Vector((0, 0, 1))
        if abs(tangent.dot(up)) > 0.92:
            up = Vector((0, 1, 0))
        side = tangent.cross(up).normalized()
        up = side.cross(tangent).normalized()
        ring = []
        for s in range(segments):
            a = (s / segments) * math.tau
            offset = (side * math.cos(a) + up * math.sin(a)) * r
            # organic noise
            n = 0.012 * noise.noise(Vector((p.x * 4 + a, p.y * 4, p.z * 4 + t)))
            ring.append(bm.verts.new(p + offset * (1.0 + n)))
        rings_v.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(len(rings_v) - 1):
        for s in range(segments):
            s2 = (s + 1) % segments
            bm.faces.new((rings_v[i][s], rings_v[i][s2], rings_v[i + 1][s2], rings_v[i + 1][s]))
    # caps
    c0 = bm.verts.new(path_pts[0])
    c1 = bm.verts.new(path_pts[-1])
    for s in range(segments):
        s2 = (s + 1) % segments
        bm.faces.new((c0, rings_v[0][s2], rings_v[0][s]))
        bm.faces.new((c1, rings_v[-1][s], rings_v[-1][s2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bmesh(name, bm)


def write_procedural_textures(tex_dir: Path, size: int = 2048):
    """Generate PBR-ish PNG maps via numpy + Blender Image API."""
    import numpy as np

    tex_dir.mkdir(parents=True, exist_ok=True)
    maps = {}
    yy, xx = np.mgrid[0:size, 0:size]
    u = xx / max(1, size - 1)
    v = yy / max(1, size - 1)

    def fbm(su, sv, seed=0.0):
        n = np.zeros_like(u)
        amp = 0.5
        freq = 1.0
        for _ in range(4):
            n += amp * np.sin((u * su * freq + seed) * 6.2831 + np.cos(v * sv * freq + seed * 1.7) * 3.1)
            n += amp * 0.5 * np.sin((u * sv * freq * 1.3 - seed) * 4.1 + (v * su * freq) * 5.2)
            amp *= 0.5
            freq *= 2.05
        return np.clip(n * 0.5 + 0.5, 0, 1)

    def save_rgb(name, rgb):
        img = bpy.data.images.new(name, width=size, height=size, alpha=False)
        rgba = np.ones((size, size, 4), dtype=np.float32)
        rgba[..., :3] = np.clip(rgb, 0, 1).astype(np.float32)
        img.pixels.foreach_set(rgba.reshape(-1))
        path = tex_dir / f"{name}.png"
        img.filepath_raw = str(path)
        img.file_format = "PNG"
        img.save()
        maps[name] = path
        return img

    n1 = fbm(18, 12, 0.2)
    n2 = fbm(48, 40, 1.7)
    band = 0.5 + 0.5 * np.sin((u * 6 + v * 2 + n1 * 0.4) * math.pi)
    body_alb = np.stack(
        [
            np.clip(0.55 + 0.45 * band + 0.08 * n2, 0, 1),
            np.clip(0.28 + 0.35 * band + 0.05 * n1, 0, 1),
            np.clip(0.05 + 0.12 * (1 - band), 0, 1),
        ],
        axis=-1,
    )
    save_rgb("phoenix_body_albedo", body_alb)

    n3 = fbm(30, 30, 3.0)
    rough = (0.25 + 0.35 * n3)[..., None]
    save_rgb("phoenix_body_roughness", np.repeat(rough, 3, axis=-1))

    n4 = fbm(22, 18, 5.0)
    crack = np.clip(n4 * 1.2 - 0.25, 0, 1)
    save_rgb("phoenix_body_emission", np.stack([0.95 * crack, 0.4 * crack, 0.06 * crack], axis=-1))

    n5 = fbm(35, 20, 0.0)
    vor = fbm(60, 60, 2.2)
    wing = np.stack(
        [
            np.clip(0.12 + 0.55 * vor + 0.25 * n5, 0, 1),
            np.clip(0.05 + 0.2 * vor + 0.35 * n5, 0, 1),
            np.clip(0.35 + 0.55 * (1 - vor) + 0.1 * n5, 0, 1),
        ],
        axis=-1,
    )
    stars = vor > 0.78
    wing[stars] = (1.0, 0.85, 0.45)
    save_rgb("phoenix_wing_albedo", wing)

    n6 = fbm(40, 40, 9.0)
    star = np.where(n6 > 0.55, 1.0, np.clip(n6 * 0.4, 0, 1))
    save_rgb("phoenix_wing_emission", np.stack([0.7 * star + 0.15, 0.35 * star, star + 0.2], axis=-1))

    n7 = fbm(40, 40, 0.5)
    n8 = fbm(40, 40, 1.5)
    save_rgb("phoenix_body_normal", np.stack([0.5 + 0.15 * n7, 0.5 + 0.15 * n8, np.ones_like(n7)], axis=-1))
    return maps


def textured_principled(name, albedo_img, rough_img=None, emit_img=None, normal_img=None, metallic=0.55, emission_strength=3.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])

    def img_node(img, non_color=False):
        n = nodes.new("ShaderNodeTexImage")
        n.image = img
        if non_color:
            n.image.colorspace_settings.name = "Non-Color"
        links.new(mapping.outputs["Vector"], n.inputs["Vector"])
        return n

    alb = img_node(albedo_img)
    links.new(alb.outputs["Color"], bsdf.inputs["Base Color"])
    if rough_img:
        rg = img_node(rough_img, non_color=True)
        links.new(rg.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.28
    bsdf.inputs["Metallic"].default_value = metallic
    if emit_img:
        em = img_node(emit_img)
        if "Emission Color" in bsdf.inputs:
            links.new(em.outputs["Color"], bsdf.inputs["Emission Color"])
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    if normal_img and "Normal" in bsdf.inputs:
        nm = img_node(normal_img, non_color=True)
        nmap = nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = 0.65
        links.new(nm.outputs["Color"], nmap.inputs["Color"])
        links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def emissive_mat(name, color, strength=12.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color[:3], 1)
    em.inputs["Strength"].default_value = strength
    if alpha < 1.0:
        mix = nodes.new("ShaderNodeBsdfTransparent")
        add = nodes.new("ShaderNodeMixShader")
        add.inputs["Fac"].default_value = 1.0 - alpha
        links.new(em.outputs["Emission"], add.inputs[1])
        links.new(mix.outputs["BSDF"], add.inputs[2])
        links.new(add.outputs["Shader"], out.inputs["Surface"])
        mat.blend_method = "BLEND"
    else:
        links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def principled(name, base, metallic=0.0, roughness=0.35, emission=0.0, emission_color=None, alpha=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*base[:3], 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    ec = emission_color or base
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*ec[:3], 1)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1.0:
        mat.blend_method = "HASHED"
        bsdf.inputs["Alpha"].default_value = alpha
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_avian_phoenix(tex_maps):
    """Continuous avian body loft (tail→chest→neck→head) + beak/eyes/crest."""
    body_alb = bpy.data.images.load(str(tex_maps["phoenix_body_albedo"]))
    body_rg = bpy.data.images.load(str(tex_maps["phoenix_body_roughness"]))
    body_em = bpy.data.images.load(str(tex_maps["phoenix_body_emission"]))
    body_nm = bpy.data.images.load(str(tex_maps["phoenix_body_normal"]))
    wing_alb = bpy.data.images.load(str(tex_maps["phoenix_wing_albedo"]))
    wing_em = bpy.data.images.load(str(tex_maps["phoenix_wing_emission"]))

    body_mat = textured_principled("PhoenixBodyPBR", body_alb, body_rg, body_em, body_nm, metallic=0.55, emission_strength=2.8)
    wing_mat = principled("GalaxyFeather", (0.95, 0.5, 0.15), metallic=0.5, roughness=0.2, emission=3.0, emission_color=(1.0, 0.45, 0.08))
    # Keep textured wing mat available for membranes
    wing_mat_tex = textured_principled("PhoenixWingPBR", wing_alb, None, wing_em, None, metallic=0.35, emission_strength=3.5)
    beak_mat = principled("BeakObsidian", (0.18, 0.08, 0.04), metallic=0.45, roughness=0.22, emission=2.0, emission_color=(1.0, 0.4, 0.05))
    eye_mat = emissive_mat("PhoenixEye", (1.0, 0.95, 0.5), strength=22.0)
    crest_mat = emissive_mat("CrestFlame", (1.0, 0.5, 0.1), strength=9.0)
    vivid = principled("PhoenixVividGold", (1.0, 0.62, 0.12), metallic=0.7, roughness=0.22, emission=3.2, emission_color=(1.0, 0.4, 0.05))

    # Continuous centerline: tail stump → belly → chest → S-neck → skull
    path = []
    # tail to chest
    for i in range(10):
        t = i / 9
        y = -1.1 + t * 1.7
        z = 0.05 + 0.25 * math.sin(t * math.pi * 0.7)
        path.append(Vector((0, y, z)))
    # neck S-curve
    for i in range(1, 12):
        t = i / 11
        y = 0.6 + t * 1.35
        z = 0.3 + 0.75 * math.sin(t * math.pi * 0.85) + t * 0.55
        path.append(Vector((0.02 * math.sin(t * 4), y, z)))
    # skull
    for i in range(1, 6):
        t = i / 5
        y = 1.95 + t * 0.55
        z = 1.55 + 0.12 * math.sin(t * math.pi) - t * 0.15
        path.append(Vector((0, y, z)))

    def radius(t):
        # thin tail, plump chest (~0.35), thin elegant neck, rounded head
        if t < 0.28:
            return 0.06 + 0.2 * (t / 0.28)
        if t < 0.45:
            u = (t - 0.28) / 0.17
            return 0.26 + 0.14 * math.sin(u * math.pi)
        if t < 0.78:
            u = (t - 0.45) / 0.33
            return 0.22 * (1.0 - 0.55 * u) + 0.07
        u = (t - 0.78) / 0.22
        return 0.14 + 0.06 * math.sin(u * math.pi)

    torso = loft_capsule("PhoenixBody", path, radius, segments=22, rings=28)
    # Additional sculpt noise
    bm = bmesh.new()
    bm.from_mesh(torso.data)
    for v in bm.verts:
        n = noise.noise(v.co * 3.5)
        # deepen chest keel
        if v.co.z < 0.15 and abs(v.co.y) < 0.5:
            v.co.z -= 0.04
        # wing shoulder bumps
        if 0.2 < v.co.y < 0.7 and abs(v.co.x) > 0.12:
            v.co.x *= 1.08
        v.co += v.normal * (0.012 * n)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(torso.data)
    bm.free()
    sub = torso.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.modifier_apply(modifier="Subsurf")
    torso.data.materials.append(vivid)
    torso.data.materials.append(body_mat)

    # Dummy neck/head refs = same body for parenting API compatibility
    neck = torso
    head = torso

    # Hooked beak
    bm = bmesh.new()
    pts = [
        (0, 0, 0.05),
        (0.06, 0.14, 0.02),
        (0.05, 0.32, -0.03),
        (0.02, 0.48, -0.1),
        (0.0, 0.6, -0.18),
        (-0.02, 0.48, -0.1),
        (-0.05, 0.32, -0.03),
        (-0.06, 0.14, 0.02),
    ]
    vs = [bm.verts.new(p) for p in pts]
    bm.faces.new(vs)
    solidify_leaf(bm, thickness=0.055)
    for v in bm.verts:
        if v.co.y > 0.35:
            v.co.x *= 0.3
            v.co.z -= (v.co.y - 0.35) * 0.45
    beak = mesh_from_bmesh("PhoenixBeak", bm)
    beak.location = (0, 2.72, 1.38)
    beak.rotation_euler = Euler((math.radians(-12), 0, 0))
    beak.scale = (1.4, 1.55, 1.35)
    beak.data.materials.append(beak_mat)

    eyes = []
    for sx in (1, -1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.05, location=(sx * 0.14, 2.42, 1.68))
        eye = bpy.context.active_object
        eye.name = f"PhoenixEye_{'L' if sx > 0 else 'R'}"
        eye.scale = (0.65, 1.05, 0.85)
        apply_object_transforms(eye)
        eye.data.materials.append(eye_mat)
        eyes.append(eye)

    crests = []
    for i in range(9):
        tt = i / 8
        f = make_feather_mesh(f"Crest_{i}", length=0.4 + 0.35 * math.sin(tt * math.pi), width=0.045)
        f.location = ((tt - 0.5) * 0.16, 2.15 + tt * 0.05, 1.72 + abs(tt - 0.5) * 0.05)
        f.rotation_euler = Euler((math.radians(-75 - tt * 15), math.radians((tt - 0.5) * 40), math.radians((tt - 0.5) * 20)))
        f.data.materials.append(crest_mat)
        crests.append(f)

    return {
        "torso": torso,
        "neck": neck,
        "head": head,
        "beak": beak,
        "eyes": eyes,
        "crests": crests,
        "body_mat": body_mat,
        "wing_mat": wing_mat,
        "wing_mat_tex": wing_mat_tex,
        "crest_mat": crest_mat,
    }


def build_wing_feathers(side: str, parent, wing_mat, fire_mat, count=36):
    """Horizontal wing plane: feathers fan along +X/-X with tips aft — readable bird wing."""
    feathers = []
    sign = 1 if side == "L" else -1

    # Solid wing membrane for silhouette (subdivided tapered plane, not a raw cube gift)
    bm = bmesh.new()
    # wing outline: root -> leading -> tip -> trailing
    outline = [
        (0.05, 0.05, 0.0),
        (0.4, 0.35, 0.05),
        (1.1, 0.45, 0.08),
        (2.0, 0.15, 0.02),
        (2.15, -0.15, -0.02),
        (1.6, -0.55, -0.04),
        (0.9, -0.45, -0.02),
        (0.25, -0.2, 0.0),
    ]
    vs = [bm.verts.new((sign * x, y, z)) for x, y, z in outline]
    bm.faces.new(vs)
    solidify_leaf(bm, thickness=0.03)
    membrane = mesh_from_bmesh(f"WingMembrane_{side}", bm)
    membrane.data.materials.append(wing_mat)
    membrane.parent = parent
    feathers.append(membrane)

    for i in range(count):
        t = i / max(1, count - 1)
        length = 0.7 + 1.3 * math.sin(t * math.pi) ** 0.85
        width = 0.08 + 0.1 * (1 - abs(t - 0.5) * 1.2)
        feather = make_feather_mesh(f"Feather_{side}_{i:02d}", length=length, width=width)
        feather.data.materials.clear()
        feather.data.materials.append(wing_mat if i % 2 == 0 else fire_mat)
        # Place along leading-to-trailing span; length points outward (+X)
        span = 0.25 + t * 1.85
        chord = 0.25 - t * 0.55  # tip sweeps back
        lift = 0.05 + 0.12 * math.sin(t * math.pi)
        feather.location = (sign * span, chord, lift)
        # Feather local +X is length; rotate so length goes outward and slightly back
        feather.rotation_euler = Euler(
            (
                math.radians(8),
                math.radians(sign * (5 + t * 8)),
                math.radians(sign * (0 + t * 12)),
            )
        )
        feather.parent = parent
        feathers.append(feather)

    for i in range(14):
        t = i / 13
        covert = make_feather_mesh(f"Covert_{side}_{i:02d}", length=0.4 + 0.25 * math.sin(t * math.pi), width=0.09)
        covert.data.materials.append(fire_mat if i % 2 else wing_mat)
        covert.location = (sign * (0.2 + t * 1.2), 0.05 - t * 0.2, 0.02)
        covert.rotation_euler = Euler((0, math.radians(sign * 5), math.radians(sign * 5)))
        covert.parent = parent
        feathers.append(covert)
    return feathers


def build_tail_streamers(parent, wing_mat, fire_mat, count=22):
    streamers = []
    for i in range(count):
        t = (i / (count - 1)) - 0.5
        length = 1.4 + 0.9 * (1 - abs(t) * 1.2) + 0.2 * (i % 3)
        f = make_feather_mesh(f"TailFeather_{i:02d}", length=length, width=0.07 + 0.04 * (1 - abs(t)))
        f.data.materials.append(fire_mat if i % 3 == 0 else wing_mat)
        f.location = (t * 0.35, -0.55 - abs(t) * 0.15, -0.05 - abs(t) * 0.08)
        f.rotation_euler = Euler((math.radians(25 + abs(t) * 20), math.radians(t * 15), math.radians(t * 55)))
        f.parent = parent
        streamers.append(f)
    return streamers


def create_armature_and_flight(parts):
    arm_data = bpy.data.armatures.new("PhoenixArmature")
    arm_obj = bpy.data.objects.new("PhoenixRig", arm_data)
    link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    root = eb.new("root")
    root.head, root.tail = (0, 0, 0), (0, 0.3, 0)
    spine = eb.new("spine")
    spine.head, spine.tail = (0, -0.4, 0.1), (0, 0.55, 0.3)
    spine.parent = root
    neck = eb.new("neck")
    neck.head, neck.tail = spine.tail, (0, 1.5, 1.1)
    neck.parent = spine
    head = eb.new("head")
    head.head, head.tail = neck.tail, (0, 1.95, 1.25)
    head.parent = neck
    jaw = eb.new("jaw")
    jaw.head, jaw.tail = (0, 1.9, 1.1), (0, 2.15, 1.0)
    jaw.parent = head
    for side, sx in (("L", 1), ("R", -1)):
        shoulder = eb.new(f"shoulder_{side}")
        shoulder.head, shoulder.tail = (sx * 0.2, 0.3, 0.3), (sx * 0.9, 0.1, 0.55)
        shoulder.parent = spine
        wing = eb.new(f"wing_{side}")
        wing.head, wing.tail = shoulder.tail, (sx * 2.1, -0.4, 0.7)
        wing.parent = shoulder
        tip = eb.new(f"wing_tip_{side}")
        tip.head, tip.tail = wing.tail, (sx * 2.7, -0.8, 0.4)
        tip.parent = wing
    tail = eb.new("tail")
    tail.head, tail.tail = (0, -0.45, 0.05), (0, -2.0, -0.2)
    tail.parent = spine
    bpy.ops.object.mode_set(mode="OBJECT")

    flight = bpy.data.objects.new("PhoenixFlightRoot", None)
    link(flight)
    flight.empty_display_type = "PLAIN_AXES"

    # Parent body parts to flight (neck/head may alias torso for continuous mesh)
    parented = set()
    for key in ("torso", "neck", "head", "beak"):
        obj = parts[key]
        if id(obj) in parented:
            continue
        obj.parent = flight
        parented.add(id(obj))
    for e in parts["eyes"]:
        e.parent = flight
    for c in parts["crests"]:
        c.parent = flight

    empties = {}
    for side, sx in (("L", 1), ("R", -1)):
        e = bpy.data.objects.new(f"WingAnchor_{side}", None)
        link(e)
        e.empty_display_type = "PLAIN_AXES"
        e.empty_display_size = 0.1
        e.location = (sx * 0.28, 0.35, 0.42)
        e.parent = flight
        empties[side] = e

    tail_anchor = bpy.data.objects.new("TailAnchor", None)
    link(tail_anchor)
    tail_anchor.empty_display_type = "PLAIN_AXES"
    tail_anchor.location = (0, -0.5, 0.05)
    tail_anchor.parent = flight

    return arm_obj, empties, flight, tail_anchor


def animate_rig(arm_obj, flight, wing_empties, tail_anchor, fps, total_frames):
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")
    pb = arm_obj.pose.bones

    def kf(bone_name, frame, rot=(0, 0, 0)):
        b = pb.get(bone_name)
        if not b:
            return
        b.rotation_mode = "XYZ"
        b.rotation_euler = Euler(tuple(math.radians(a) for a in rot))
        b.keyframe_insert(data_path="rotation_euler", frame=frame)

    keys = [
        (1, 15, -20, 0),
        (int(total_frames * 0.1), 35, 0, 5),
        (int(total_frames * 0.22), 75, 12, 10),
        (int(total_frames * 0.35), 90, 5, 0),
        (int(total_frames * 0.48), 55, -8, 15),
        (int(total_frames * 0.62), 30, 18, 5),
        (int(total_frames * 0.75), 60, 8, 0),
        (int(total_frames * 0.88), 80, 5, 8),
        (total_frames, 45, 0, 0),
    ]
    for f, wing_angle, neck_lift, jaw_open in keys:
        kf("wing_L", f, rot=(0, 0, wing_angle))
        kf("wing_R", f, rot=(0, 0, -wing_angle))
        kf("wing_tip_L", f, rot=(0, 0, wing_angle * 0.45))
        kf("wing_tip_R", f, rot=(0, 0, -wing_angle * 0.45))
        kf("shoulder_L", f, rot=(wing_angle * 0.25, 0, wing_angle * 0.35))
        kf("shoulder_R", f, rot=(wing_angle * 0.25, 0, -wing_angle * 0.35))
        kf("neck", f, rot=(neck_lift, 0, math.sin(f * 0.04) * 6))
        kf("head", f, rot=(neck_lift * 0.4, 0, math.sin(f * 0.05) * 10))
        kf("jaw", f, rot=(jaw_open, 0, 0))
        kf("tail", f, rot=(-25 - wing_angle * 0.12, 0, math.sin(f * 0.07) * 14))
        kf("spine", f, rot=(math.sin(f * 0.03) * 8, 0, 0))
        for side, sign in (("L", 1), ("R", -1)):
            e = wing_empties[side]
            e.rotation_mode = "XYZ"
            # Open wings wide for readable silhouette
            e.rotation_euler = Euler(
                (
                    math.radians(-20 + wing_angle * 0.15),
                    math.radians(sign * wing_angle * 0.35),
                    math.radians(sign * wing_angle * 0.85),
                )
            )
            e.keyframe_insert("rotation_euler", frame=f)
        tail_anchor.rotation_mode = "XYZ"
        tail_anchor.rotation_euler = Euler((math.radians(-10 - wing_angle * 0.1), 0, math.radians(math.sin(f * 0.06) * 18)))
        tail_anchor.keyframe_insert("rotation_euler", frame=f)

    bpy.ops.object.mode_set(mode="OBJECT")

    # Emergence → orbit → land path
    flight.location = (0, 0, 5.2)
    flight.scale = (0.15, 0.15, 0.15)
    flight.keyframe_insert("location", frame=1)
    flight.keyframe_insert("scale", frame=1)
    flight.scale = (1, 1, 1)
    flight.location = (0, 0, 2.8)
    flight.keyframe_insert("location", frame=int(total_frames * 0.18))
    flight.keyframe_insert("scale", frame=int(total_frames * 0.18))
    for i, ang in enumerate([0, 72, 144, 216, 288, 360]):
        fr = int(total_frames * (0.28 + i * 0.07))
        rad = 2.4
        flight.location = (math.cos(math.radians(ang)) * rad, math.sin(math.radians(ang)) * rad, 1.9 + 0.3 * math.sin(i))
        flight.rotation_euler = Euler((math.radians(8), 0, math.radians(ang + 90)))
        flight.keyframe_insert("location", frame=fr)
        flight.keyframe_insert("rotation_euler", frame=fr)
    flight.location = (0, -0.6, 1.15)
    flight.rotation_euler = Euler((0, 0, 0))
    flight.keyframe_insert("location", frame=int(total_frames * 0.78))
    flight.keyframe_insert("rotation_euler", frame=int(total_frames * 0.78))
    flight.location = (0, -0.4, 1.05)
    flight.keyframe_insert("location", frame=total_frames)

    if flight.animation_data and flight.animation_data.action:
        for fc in flight.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.easing = "EASE_IN_OUT"


def build_portal():
    bpy.ops.mesh.primitive_torus_add(major_radius=2.6, minor_radius=0.14, major_segments=128, minor_segments=32, location=(0, 0, 4.2))
    portal = bpy.context.active_object
    portal.name = "CosmicPortal"
    portal.data.materials.append(
        principled("PortalRing", (0.45, 0.2, 1.0), metallic=0.75, roughness=0.12, emission=14.0, emission_color=(0.55, 0.25, 1.0))
    )
    bpy.ops.mesh.primitive_torus_add(major_radius=2.25, minor_radius=0.07, major_segments=96, minor_segments=20, location=(0, 0, 4.2))
    inner = bpy.context.active_object
    inner.name = "PortalInner"
    inner.data.materials.append(
        principled("PortalInner", (1.0, 0.8, 0.3), metallic=0.85, roughness=0.08, emission=22.0, emission_color=(1.0, 0.85, 0.35))
    )
    # Energy veil — subdivided disk with noise displacement look via material
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=2.15, fill_type="NGON", location=(0, 0, 4.2))
    disk = bpy.context.active_object
    disk.name = "PortalMembrane"
    disk.rotation_euler = Euler((math.radians(90), 0, 0))
    disk.data.materials.append(
        principled("Membrane", (0.25, 0.08, 0.55), roughness=0.08, emission=2.5, emission_color=(0.5, 0.15, 0.95), alpha=0.25, transmission=0.55)
    )
    return portal, inner, disk


def build_temple_ornate():
    """Ritual floor + ornate pillars (beveled capitals) — kept dark so phoenix stays hero."""
    pieces = []
    floor_mat = principled("TempleFloor", (0.04, 0.03, 0.06), metallic=0.55, roughness=0.4, emission=0.35, emission_color=(0.6, 0.35, 0.95))
    stone = principled("TempleStone", (0.07, 0.06, 0.09), metallic=0.35, roughness=0.55, emission=0.15, emission_color=(0.7, 0.5, 0.2))
    gold = principled("TempleGold", (0.75, 0.55, 0.18), metallic=0.9, roughness=0.22, emission=2.5, emission_color=(1.0, 0.75, 0.25))

    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=3.0, depth=0.22, location=(0, 0, 0.05))
    platform = bpy.context.active_object
    platform.name = "RitualPlatform"
    bevel = platform.modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 4
    bpy.context.view_layer.objects.active = platform
    bpy.ops.object.modifier_apply(modifier="Bevel")
    platform.data.materials.append(floor_mat)
    pieces.append(platform)

    bpy.ops.mesh.primitive_torus_add(major_radius=1.75, minor_radius=0.05, major_segments=96, location=(0, 0, 0.2))
    sigil = bpy.context.active_object
    sigil.name = "SigilRing"
    sigil.data.materials.append(gold)
    pieces.append(sigil)

    # Inner sigil star (custom flat mesh)
    bm = bmesh.new()
    star_pts = []
    for i in range(16):
        ang = i * math.pi / 8
        r = 1.15 if i % 2 == 0 else 0.55
        star_pts.append(bm.verts.new((math.cos(ang) * r, math.sin(ang) * r, 0)))
    bm.faces.new(star_pts)
    solidify_leaf(bm, 0.02)
    star = mesh_from_bmesh("SigilStar", bm)
    star.location = (0, 0, 0.18)
    star.data.materials.append(gold)
    pieces.append(star)

    # Ornate pillars: shaft + capital + base (still environment, darkened)
    for i in range(6):
        ang = i * math.tau / 6
        cx, cy = math.cos(ang) * 4.8, math.sin(ang) * 4.8
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.22, depth=2.6, location=(cx, cy, 1.4))
        shaft = bpy.context.active_object
        shaft.name = f"PillarShaft_{i}"
        shaft.data.materials.append(stone)
        # fluting via displace
        disp = shaft.modifiers.new("Flute", "DISPLACE")
        tex = bpy.data.textures.new(f"FluteTex_{i}", type="WOOD")
        tex.wood_type = "BANDS"
        disp.texture = tex
        disp.strength = 0.02
        disp.direction = "X"
        pieces.append(shaft)

        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.34, depth=0.22, location=(cx, cy, 0.2))
        base = bpy.context.active_object
        base.name = f"PillarBase_{i}"
        base.data.materials.append(gold)
        pieces.append(base)

        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.38, radius2=0.18, depth=0.35, location=(cx, cy, 2.85))
        cap = bpy.context.active_object
        cap.name = f"PillarCap_{i}"
        cap.data.materials.append(gold)
        pieces.append(cap)

    return pieces


def add_particle_systems(host_obj, total_frames):
    def add_ps(name, count, lifetime, size, gravity=-0.05):
        host_obj.modifiers.new(name, type="PARTICLE_SYSTEM")
        ps = host_obj.particle_systems[-1]
        ps.name = name
        settings = ps.settings
        settings.count = count
        settings.frame_start = 1
        settings.frame_end = total_frames
        settings.lifetime = lifetime
        settings.emit_from = "FACE"
        settings.normal_factor = 0.55
        settings.factor_random = 0.6
        settings.particle_size = size
        settings.size_random = 0.55
        settings.use_rotations = True
        settings.effector_weights.gravity = gravity
        settings.render_type = "HALO"
        return settings

    add_ps("SolarFeathers", 1800, 45, 0.045, -0.02)
    add_ps("StarBurst", 1200, 60, 0.028, 0.0)
    add_ps("Embers", 900, 32, 0.018, -0.18)
    add_ps("MagicSparks", 700, 38, 0.022, -0.05)


def setup_world_hdri():
    world = bpy.data.worlds.new("CosmicHDR")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 14.0
    tex.inputs["Detail"].default_value = 12.0
    ramp = nodes.new("ShaderNodeValToRGB")
    # Near-black space with sparse nebula — phoenix must dominate
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[0].color = (0.005, 0.005, 0.015, 1)
    ramp.color_ramp.elements[1].color = (0.04, 0.015, 0.08, 1)
    links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.15
    links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


def setup_lights():
    def add_light(name, typ, loc, energy, color, size=None, spot_size=None, rot=None):
        data = bpy.data.lights.new(name=name + "Data", type=typ)
        data.energy = energy
        data.color = color
        if size is not None and hasattr(data, "size"):
            data.size = size
        if spot_size is not None and hasattr(data, "spot_size"):
            data.spot_size = spot_size
        obj = bpy.data.objects.new(name, data)
        link(obj)
        obj.location = loc
        if rot is not None:
            obj.rotation_euler = Euler(rot)
        return obj

    add_light("KeyLight", "AREA", (4.5, -5.5, 5.5), 3200, (1.0, 0.95, 0.8), size=3.0)
    add_light("FillLight", "AREA", (-5, 2.5, 2.8), 350, (0.45, 0.4, 0.85), size=6)
    add_light("PortalRim", "POINT", (0, 0, 4.5), 1800, (0.65, 0.35, 1.0))
    add_light("GodRaySpot", "SPOT", (0.5, -4.5, 6), 4500, (1.0, 0.95, 0.8), spot_size=math.radians(35), rot=(math.radians(48), 0, 0))
    add_light("SolarKey", "SUN", (2, -2, 8), 7.0, (1.0, 0.9, 0.65), rot=(math.radians(35), math.radians(18), 0))
    add_light("UnderGlow", "AREA", (0, 0, 0.3), 600, (1.0, 0.55, 0.15), size=4)


def setup_cinematic_camera(fps, total_frames, flight):
    cam_data = bpy.data.cameras.new("CineCamData")
    cam = bpy.data.objects.new("CineCam", cam_data)
    link(cam)
    cam.data.lens = 40
    cam.data.dof.use_dof = False
    bpy.context.scene.camera = cam

    target = bpy.data.objects.new("CamTarget", None)
    link(target)
    # Parent target to flight so camera always frames the phoenix
    target.parent = flight
    target.location = (0, 0.4, 0.55)

    con = cam.constraints.new(type="TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"

    # Close, cinematic framing — phoenix fills frame
    shots = [
        (1, (5.5, -5.5, 5.5), 28),
        (int(0.08 * total_frames), (3.2, -3.5, 4.2), 35),
        (int(0.18 * total_frames), (2.4, -2.8, 3.2), 45),
        (int(0.30 * total_frames), (1.6, -2.2, 2.4), 55),
        (int(0.42 * total_frames), (-2.8, -1.2, 2.6), 42),
        (int(0.55 * total_frames), (-2.0, 2.4, 2.3), 48),
        (int(0.68 * total_frames), (3.2, 2.6, 3.0), 36),
        (int(0.78 * total_frames), (2.2, -2.0, 2.0), 50),
        (int(0.88 * total_frames), (1.4, -2.4, 2.2), 60),
        (total_frames, (3.8, -3.6, 3.2), 32),
    ]
    for frame, loc, lens in shots:
        shake = 0.03 * math.sin(frame * 0.41)
        cam.location = (loc[0] + shake, loc[1] - shake * 0.4, loc[2] + shake * 0.25)
        cam.keyframe_insert("location", frame=frame)
        cam.data.lens = lens
        cam.data.keyframe_insert("lens", frame=frame)
        cam.data.dof.focus_distance = max(1.0, (Vector(cam.location) - Vector((0, 0, 2))).length)
        cam.data.dof.keyframe_insert("focus_distance", frame=frame)

    if cam.animation_data and cam.animation_data.action:
        for fc in cam.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
    return cam, target


def configure_eevee(scene, resolution, fps, total_frames):
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.fps = fps
    scene.frame_start = 1
    scene.frame_end = total_frames
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.film_transparent = False
    if hasattr(scene, "eevee"):
        ee = scene.eevee
        if hasattr(ee, "use_bloom"):
            ee.use_bloom = True
        if hasattr(ee, "bloom_intensity"):
            ee.bloom_intensity = 0.04
        if hasattr(ee, "bloom_threshold"):
            ee.bloom_threshold = 1.4
        if hasattr(ee, "use_motion_blur"):
            ee.use_motion_blur = False
        if hasattr(ee, "use_gtao"):
            ee.use_gtao = True
        if hasattr(ee, "use_ssr"):
            ee.use_ssr = True
        if hasattr(ee, "taa_render_samples"):
            ee.taa_render_samples = 96
        if hasattr(ee, "use_volumetric_lights"):
            ee.use_volumetric_lights = True


def export_glb(path: Path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        if obj and obj.name in bpy.data.objects:
            if obj.type == "MESH":
                for mod in list(obj.modifiers):
                    if mod.type == "ARMATURE":
                        obj.modifiers.remove(mod)
            obj.select_set(True)
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_apply=False,
        export_extras=True,
        export_skins=False,
        export_def_bones=False,
    )


def simplify_for_mobile(body):
    dup = body.copy()
    dup.data = body.data.copy()
    dup.name = "PhoenixBody_MobileLOD"
    link(dup)
    dec = dup.modifiers.new("Decimate", "DECIMATE")
    dec.ratio = 0.28
    bpy.context.view_layer.objects.active = dup
    bpy.ops.object.modifier_apply(modifier="Decimate")
    return dup


def hide_env_for_hero(temple_pieces, hide=True):
    for p in temple_pieces:
        # keep platform + sigil visible; hide distant pillars for cleaner hero
        if p.name.startswith("Pillar"):
            p.hide_render = hide
            p.hide_viewport = hide


def render_preview(out: Path, total_frames: int, render_frames: int, quick_hero=False, flight=None, wing_empties=None, hide_objs=None, tail_anchor=None):
    """Beauty renders with a static hero pose (GLB already exported with full animation)."""
    scene = bpy.context.scene
    seq = out / "_frames"
    seq.mkdir(exist_ok=True)
    stills = out / "stills"
    stills.mkdir(exist_ok=True)
    hide_objs = hide_objs or []

    def clear_anim(obj):
        if obj is not None and obj.animation_data:
            obj.animation_data_clear()

    def lock_hero_pose(cam_ang=-40, cam_rad=5.2, cam_z=2.4):
        # Strip animation so manual pose sticks (exports already done)
        clear_anim(flight)
        if wing_empties:
            for e in wing_empties.values():
                clear_anim(e)
        clear_anim(tail_anchor)
        clear_anim(scene.camera)

        if flight is not None:
            flight.location = (0.0, 0.0, 1.4)
            flight.rotation_euler = Euler((math.radians(-12), math.radians(5), math.radians(20)))
            flight.scale = (1.6, 1.6, 1.6)
        if wing_empties is not None:
            for side, sign in (("L", 1), ("R", -1)):
                e = wing_empties[side]
                e.rotation_mode = "XYZ"
                e.rotation_euler = Euler((math.radians(-5), math.radians(sign * 8), math.radians(sign * 12)))
        if tail_anchor is not None:
            tail_anchor.rotation_euler = Euler((math.radians(-20), 0, math.radians(8)))

        cam = scene.camera
        for c in list(cam.constraints):
            cam.constraints.remove(c)
        # Classic three-quarter front: see head, chest, both wing planes
        cam.location = (3.6, -2.9, 2.5)
        if cam_ang != -40:
            cam.location = (
                math.cos(math.radians(cam_ang)) * cam_rad,
                math.sin(math.radians(cam_ang)) * cam_rad - 0.8,
                cam_z,
            )
        aim = Vector((0.0, 0.6, 1.7))
        cam.rotation_euler = (aim - Vector(cam.location)).to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = 50
        cam.data.dof.use_dof = False
        for obj in hide_objs:
            if obj is not None:
                if obj.animation_data:
                    obj.animation_data_clear()
                obj.hide_render = True
                obj.hide_viewport = True
        bpy.context.view_layer.update()

    if quick_hero:
        lock_hero_pose()
        scene.frame_set(1)
        # re-apply after frame_set
        lock_hero_pose()
        scene.render.filepath = str(out / "poster.png")
        bpy.ops.render.render(write_still=True)
        scene.render.filepath = str(stills / "shot_01.png")
        bpy.ops.render.render(write_still=True)
        return 1

    # Animated preview sequence (keeps cinematic camera + anim)
    step = max(1, total_frames // max(1, render_frames))
    rendered = 0
    for f in range(1, total_frames + 1, step):
        if rendered >= render_frames:
            break
        scene.frame_set(f)
        scene.render.filepath = str(seq / f"frame_{rendered:04d}.png")
        bpy.ops.render.render(write_still=True)
        rendered += 1

    # After sequence, lock hero for stills/poster/thumbnail
    for i in range(5):
        lock_hero_pose(cam_ang=-50 + i * 20, cam_rad=5.0 + 0.15 * i, cam_z=2.1 + 0.2 * i)
        scene.render.filepath = str(stills / f"shot_{i+1:02d}.png")
        bpy.ops.render.render(write_still=True)

    lock_hero_pose(cam_ang=-35, cam_rad=4.8, cam_z=2.35)
    scene.render.filepath = str(out / "poster.png")
    bpy.ops.render.render(write_still=True)

    prev_x, prev_y = scene.render.resolution_x, scene.render.resolution_y
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    lock_hero_pose(cam_ang=-30, cam_rad=4.5, cam_z=2.2)
    scene.render.filepath = str(out / "thumbnail.png")
    bpy.ops.render.render(write_still=True)
    scene.render.resolution_x = prev_x
    scene.render.resolution_y = prev_y
    return rendered



def main():
    args = parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    clear_scene()
    fps = args.fps
    total_frames = int(args.duration * fps)
    scene = bpy.context.scene

    tex_dir = out / "textures"
    # 2K production maps; 512 for quick hero validation
    tex_size = 512 if args.quick_hero else 2048
    print(f"Generating procedural textures at {tex_size}...")
    tex_maps = write_procedural_textures(tex_dir, size=tex_size)

    setup_world_hdri()
    setup_lights()
    portal, portal_inner, membrane = build_portal()
    temple = build_temple_ornate()
    hide_env_for_hero(temple, hide=True)

    parts = build_avian_phoenix(tex_maps)
    arm, wing_anchors, flight, tail_anchor = create_armature_and_flight(parts)

    fire_mat = emissive_mat("FeatherFire", (1.0, 0.4, 0.08), strength=5.5)
    feathers_l = build_wing_feathers("L", wing_anchors["L"], parts["wing_mat"], fire_mat, count=40)
    feathers_r = build_wing_feathers("R", wing_anchors["R"], parts["wing_mat"], fire_mat, count=40)
    streamers = build_tail_streamers(tail_anchor, parts["wing_mat"], fire_mat, count=22)

    animate_rig(arm, flight, wing_anchors, tail_anchor, fps, total_frames)

    # Explicit ember/spark meshes (particles often invisible in still EEVEE frames)
    ember_mat = emissive_mat("EmberMesh", (1.0, 0.55, 0.12), strength=8.0)
    for i in range(24):
        ang = i * 0.7
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.03 + (i % 5) * 0.008, location=(
            math.cos(ang) * (0.8 + (i % 7) * 0.15),
            math.sin(ang) * (0.5 + (i % 4) * 0.12) - 0.2,
            0.4 + (i % 9) * 0.18,
        ))
        ember = bpy.context.active_object
        ember.name = f"Ember_{i:02d}"
        ember.data.materials.append(ember_mat)
        ember.parent = flight


    # Portal tear
    portal.scale = (0.05, 0.05, 0.05)
    portal.keyframe_insert("scale", frame=1)
    portal.scale = (1, 1, 1)
    portal.keyframe_insert("scale", frame=int(0.1 * total_frames))
    portal.rotation_euler = Euler((0, 0, 0))
    portal.keyframe_insert("rotation_euler", frame=1)
    portal.rotation_euler = Euler((0, 0, math.radians(720)))
    portal.keyframe_insert("rotation_euler", frame=total_frames)
    membrane.scale = (0.01, 0.01, 0.01)
    membrane.keyframe_insert("scale", frame=1)
    membrane.scale = (1, 1, 1)
    membrane.keyframe_insert("scale", frame=int(0.12 * total_frames))

    # Reveal temple mid-show (scene 6) via scale — avoid hide_render anim leaking into stills
    for p in temple:
        if p.name.startswith("Pillar"):
            p.scale = (0.01, 0.01, 0.01)
            p.keyframe_insert("scale", frame=int(0.48 * total_frames))
            p.scale = (1, 1, 1)
            p.keyframe_insert("scale", frame=int(0.58 * total_frames))

    # VFX emitter
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.9, location=(0, 0, 0.4))
    emitter = bpy.context.active_object
    emitter.name = "VFXEmitter"
    emitter.parent = flight
    emitter.hide_render = True
    add_particle_systems(emitter, total_frames)

    # Halo
    bpy.ops.mesh.primitive_torus_add(major_radius=1.35, minor_radius=0.06, major_segments=96, location=(0, -0.3, 1.8))
    halo = bpy.context.active_object
    halo.name = "DivineHalo"
    halo.data.materials.append(emissive_mat("HaloGold", (1.0, 0.88, 0.45), strength=28.0))
    halo.scale = (0.01, 0.01, 0.01)
    halo.keyframe_insert("scale", frame=int(0.72 * total_frames))
    halo.scale = (1.5, 1.5, 1.5)
    halo.keyframe_insert("scale", frame=int(0.82 * total_frames))

    # Energy wave rings
    for i, delay in enumerate((0.55, 0.62, 0.7)):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.4, minor_radius=0.03, location=(0, 0, 0.3))
        wave = bpy.context.active_object
        wave.name = f"EnergyWave_{i}"
        wave.data.materials.append(emissive_mat(f"Wave_{i}", (0.7, 0.4, 1.0), strength=20.0))
        wave.scale = (0.1, 0.1, 0.1)
        wave.keyframe_insert("scale", frame=int(delay * total_frames))
        wave.scale = (4.5 + i, 4.5 + i, 0.4)
        wave.keyframe_insert("scale", frame=int((delay + 0.12) * total_frames))

    cam, target = setup_cinematic_camera(fps, total_frames, flight)
    configure_eevee(scene, args.resolution, fps, total_frames)

    blend_path = out / "scene.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    body_parts = []
    seen = set()
    for key in ("torso", "neck", "head", "beak"):
        o = parts[key]
        if id(o) in seen:
            continue
        seen.add(id(o))
        body_parts.append(o)
    export_objs = [
        flight,
        *body_parts,
        portal,
        portal_inner,
        membrane,
        halo,
        wing_anchors["L"],
        wing_anchors["R"],
        tail_anchor,
        *parts["eyes"],
        *parts["crests"],
        *temple,
        *feathers_l,
        *feathers_r,
        *streamers,
    ]
    export_objs += [o for o in bpy.data.objects if o.name.startswith("EnergyWave_") or o.name.startswith("Ember_")]
    glb_path = out / "model.glb"
    export_glb(glb_path, export_objs)

    mobile_body = simplify_for_mobile(parts["torso"])
    mobile_body.parent = flight
    mobile_feathers = feathers_l[::4] + feathers_r[::4] + streamers[::3]
    mobile_objs = [
        flight,
        mobile_body,
        parts["beak"],
        portal,
        membrane,
        halo,
        temple[0],
        temple[1],
        wing_anchors["L"],
        wing_anchors["R"],
        *mobile_feathers,
        *parts["eyes"],
    ]
    export_glb(out / "model_mobile_lod.glb", mobile_objs)
    mobile_body.hide_render = True
    mobile_body.hide_viewport = True

    rendered = 0
    if not args.skip_render:
        hide_for_hero = [portal, portal_inner, membrane, halo] + [o for o in bpy.data.objects if o.name.startswith("EnergyWave_") or o.name.startswith("Pillar") or o.name.startswith("Ember_") or o.name in ("RitualPlatform", "SigilRing", "SigilStar", "VFXEmitter")]
        rendered = render_preview(
            out,
            total_frames,
            args.render_frames,
            quick_hero=args.quick_hero,
            flight=flight,
            wing_empties=wing_anchors,
            hide_objs=hide_for_hero,
            tail_anchor=tail_anchor,
        )

    meta = {
        "slug": "celestial-phoenix",
        "name": "Celestial Phoenix",
        "rarity": "Divine",
        "price_minor": 1_000_000,
        "duration_s": args.duration,
        "fps": fps,
        "total_frames": total_frames,
        "preview_frames_rendered": rendered,
        "blender": bpy.app.version_string,
        "engine": "BLENDER_EEVEE",
        "objects": len(bpy.data.objects),
        "meshes": len(bpy.data.meshes),
        "feathers": len(feathers_l) + len(feathers_r) + len(streamers),
        "textures": {k: str(v) for k, v in tex_maps.items()},
        "texture_resolution": tex_size,
        "smoke_domain": False,
        "notes": [
            "Multi-part avian loft body (torso/neck/head/beak/crest) + layered wing fans + tail streamers.",
            "Procedural PBR maps authored to PNG; EEVEE cinematic candidate.",
            "Not claiming Pixar/Blizzard/Unreal parity.",
        ],
    }
    (out / "blender_build.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
