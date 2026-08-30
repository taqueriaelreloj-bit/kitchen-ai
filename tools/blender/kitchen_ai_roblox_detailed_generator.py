"""Kitchen AI -> Blender -> Roblox detailed generator.
Blender 5.2 compatible.

Creates detailed cabinet and appliance models using common US kitchen standards.
Scale: 1 Blender unit = 1 Roblox stud = 12 inches.

Reference construction standards used in the model:
- Base cabinet: 34.5 in high, 24 in deep.
- Wall cabinet: commonly 12 in deep, mounted with bottom at 54 in AFF.
- Tall cabinet: 84 in high, 24 in deep for this catalog.
- Cabinet sides / shelves: 3/4 in.
- Back: 1/4 in.
- Drawer box sides: 5/8 in.
- Drawer bottom: 1/4 in.
- Toe kick: 4 in high x 3 in recess.
- Drawer box depth: 19-5/8 in where practical.

The generator keeps Kitchen AI catalog widths so product IDs stay compatible,
while using standard cabinet construction dimensions for individual parts.
"""

from __future__ import annotations

from pathlib import Path
import json
import math
import os
import traceback
import bpy
from mathutils import Vector

# Override for automation/CI without changing the normal Windows output folder.
OUT = Path(os.environ.get(
    "KITCHEN_AI_EXPORT_DIR",
    str(Path.home() / "Documents" / "KitchenAI_Roblox_Exports_Detailed"),
)).expanduser()
IN_PER_STUD = 12.0
EXPORT_GLB = True
ADD_SHOWROOM = True

# Standard cabinet construction dimensions (inches)
SIDE_IN = 0.75
SHELF_IN = 0.75
BACK_IN = 0.25
FACE_FRAME_IN = 0.75
FACE_FRAME_WIDTH_IN = 1.5
DOOR_IN = 0.75
DOOR_FRAME_WIDTH_IN = 2.25
DOOR_PANEL_IN = 0.25
DOOR_REVEAL_IN = 0.125
DRAWER_SIDE_IN = 0.625
DRAWER_BOTTOM_IN = 0.25
DRAWER_DEPTH_IN = 19.625
TOE_H_IN = 4.0
TOE_RECESS_IN = 3.0
HINGE_CUP_DIA_IN = 1.375
HINGE_CUP_DEPTH_IN = 0.5
SLIDE_H_IN = 1.75
SLIDE_T_IN = 0.5
HANDLE_DIA_IN = 0.375

# id, category, kind, width in, depth in, height in, elevation in
CATALOG = [
    ("lower-base-12", "lowers", "base", 12, 24, 34.5, 0),
    ("lower-base-18", "lowers", "base", 18, 24, 34.5, 0),
    ("lower-base-24", "lowers", "base", 24, 24, 34.5, 0),
    ("lower-base-30", "lowers", "base", 30, 24, 34.5, 0),
    ("lower-base-36", "lowers", "base", 36, 24, 34.5, 0),
    ("lower-drawer-18", "lowers", "drawers", 18, 24, 34.5, 0),
    ("lower-drawer-24", "lowers", "drawers", 24, 24, 34.5, 0),
    ("lower-drawer-30", "lowers", "drawers", 30, 24, 34.5, 0),
    ("lower-drawer-36", "lowers", "drawers", 36, 24, 34.5, 0),
    ("lower-sink-30", "lowers", "sink", 30, 24, 34.5, 0),
    ("lower-sink-33", "lowers", "sink", 33, 24, 34.5, 0),
    ("lower-sink-36", "lowers", "sink", 36, 24, 34.5, 0),
    ("lower-corner-36", "lowers", "corner", 36, 36, 34.5, 0),
    ("upper-wall-12x30", "uppers", "upper", 12, 12, 30, 54),
    ("upper-wall-18x30", "uppers", "upper", 18, 12, 30, 54),
    ("upper-wall-24x30", "uppers", "upper", 24, 12, 30, 54),
    ("upper-wall-30x30", "uppers", "upper", 30, 12, 30, 54),
    ("upper-wall-36x30", "uppers", "upper", 36, 12, 30, 54),
    ("upper-wall-24x36", "uppers", "upper", 24, 12, 36, 54),
    ("upper-wall-30x36", "uppers", "upper", 30, 12, 36, 54),
    ("upper-wall-36x36", "uppers", "upper", 36, 12, 36, 54),
    ("upper-glass-24x30", "uppers", "glass", 24, 12, 30, 54),
    ("upper-glass-30x30", "uppers", "glass", 30, 12, 30, 54),
    ("upper-glass-36x30", "uppers", "glass", 36, 12, 30, 54),
    ("tall-pantry-18x84", "tall", "tall", 18, 24, 84, 0),
    ("tall-pantry-24x84", "tall", "tall", 24, 24, 84, 0),
    ("tall-pantry-30x84", "tall", "tall", 30, 24, 84, 0),
    ("tall-utility-24x84", "tall", "tall", 24, 24, 84, 0),
    ("tall-oven-30x84", "tall", "oven-tower", 30, 24, 84, 0),
    # 36-inch appliance opening plus two panels and installation clearance.
    ("tall-fridge-surround-36x84", "tall", "fridge-surround", 39, 24, 84, 0),
    ("refrigerator-french-door-stainless", "refrigerators", "fridge-french", 36, 30, 70, 0),
    ("refrigerator-panel-ready-built-in", "refrigerators", "fridge-panel", 36, 24, 84, 0),
    ("refrigerator-smart-black", "refrigerators", "fridge-smart", 36, 30, 70, 0),
    ("refrigerator-retro-blue", "refrigerators", "fridge-retro", 24, 26, 63, 0),
    ("gas-range-32-4-burner", "gas-ranges", "range", 32, 28, 36, 0),
    ("gas-range-36-4-burner-griddle", "gas-ranges", "range-griddle", 36, 28, 36, 0),
    ("gas-range-42-4-burner-griddle", "gas-ranges", "range-griddle", 42, 28, 36, 0),
    ("microwave-countertop-24-stainless", "microwaves", "microwave", 24, 18, 14, 36),
    ("microwave-over-range-30-stainless", "microwaves", "microwave-otr", 30, 15.875, 16.4375, 54),
]


def s(inches: float) -> float:
    return float(inches) / IN_PER_STUD


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def make_mat(name, color, metallic=0.0, roughness=0.45, alpha=1.0, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    h = color.lstrip('#')
    rgba = tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4)) + (alpha,)
    mat.diffuse_color = rgba
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Alpha"].default_value = alpha
        if alpha < 1.0:
            if "Transmission Weight" in bsdf.inputs:
                bsdf.inputs["Transmission Weight"].default_value = .18
            if "Coat Weight" in bsdf.inputs:
                bsdf.inputs["Coat Weight"].default_value = .22
        if emission and "Emission Color" in bsdf.inputs:
            eh = emission.lstrip('#')
            ergb = tuple(int(eh[i:i+2], 16) / 255 for i in (0, 2, 4)) + (1,)
            bsdf.inputs["Emission Color"].default_value = ergb
            bsdf.inputs["Emission Strength"].default_value = 2.0
    if alpha < 1.0 and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = 'DITHERED'
    return mat


def materials():
    return {
        "cab": make_mat("Cabinet White", "#E9E6DE", 0.0, .38),
        "edge": make_mat("Cabinet Edge", "#D4D0C7", 0.0, .46),
        "wood": make_mat("Birch Plywood", "#C2915F", 0.0, .55),
        "drawer": make_mat("Maple Drawer Box", "#D6AA76", 0.0, .48),
        "glass": make_mat("Cabinet Glass", "#A8D0DB", .05, .10, .30),
        "steel": make_mat("Brushed Stainless", "#AEB6B8", .90, .26),
        "dark": make_mat("Dark Metal", "#252A2B", .65, .26),
        "black": make_mat("Black Glass", "#101315", .18, .08),
        "blue": make_mat("Retro Blue", "#9FCBE4", .04, .28),
        "screen": make_mat("Display", "#58CEE9", .04, .08, 1, "#58CEE9"),
        "brass": make_mat("Burner Brass", "#B78A43", .85, .30),
        "rubber": make_mat("Rubber", "#17191A", .0, .82),
        "white": make_mat("Appliance Interior", "#EDEDEA", .02, .36),
        "light": make_mat("Warm Light", "#F7E6B0", 0, .15, 1, "#F7E6B0"),
        "floor": make_mat("Showroom Floor", "#CBD3D1", 0, .76),
        "chrome": make_mat("Polished Chrome", "#DDE4E6", .96, .12),
        "aluminum": make_mat("Extruded Aluminum", "#889397", .82, .32),
        "porcelain": make_mat("Porcelain Enamel", "#17191C", .22, .18),
        "gasket": make_mat("Door Gasket", "#232526", 0, .90),
    }


def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def box(name, size, loc, mat, col, parent=None, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to(obj, col)
    if parent:
        obj.parent = parent
    obj.data.materials.append(mat)
    if bevel and min(size) > 0.01:
        mod = obj.modifiers.new("SoftEdges", 'BEVEL')
        mod.width = min(bevel, min(size) * .18)
        mod.segments = 2
    return obj


def cylinder(name, radius, depth, loc, mat, col, parent=None, rot=(0, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, col)
    if parent:
        obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def torus(name, major_radius, minor_radius, loc, mat, col, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, major_segments=32, minor_segments=8, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    move_to(obj, col)
    if parent:
        obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def root_for(model_id, category, w, d, h, elev):
    col = bpy.data.collections.new(model_id)
    bpy.context.scene.collection.children.link(col)
    root = bpy.data.objects.new(model_id, None)
    col.objects.link(root)
    root["ProductId"] = model_id
    root["Category"] = category
    root["WidthIn"] = w
    root["DepthIn"] = d
    root["HeightIn"] = h
    root["DefaultElevationIn"] = elev
    root["WidthStuds"] = s(w)
    root["DepthStuds"] = s(d)
    root["HeightStuds"] = s(h)
    root["RobloxScale"] = "1 stud = 12 inches"
    return col, root


def add_face_frame(root, col, m, w, d, h, bottom=0.0, top=None):
    top = h if top is None else top
    frame_t = s(FACE_FRAME_IN)
    stile = s(FACE_FRAME_WIDTH_IN)
    y = -d / 2 - frame_t / 2
    usable_h = top - bottom
    box("FaceFrame_LeftStile", (stile, frame_t, usable_h), (-w / 2 + stile / 2, y, bottom + usable_h / 2), m["cab"], col, root)
    box("FaceFrame_RightStile", (stile, frame_t, usable_h), (w / 2 - stile / 2, y, bottom + usable_h / 2), m["cab"], col, root)
    box("FaceFrame_TopRail", (w - 2 * stile, frame_t, stile), (0, y, top - stile / 2), m["cab"], col, root)
    box("FaceFrame_BottomRail", (w - 2 * stile, frame_t, stile), (0, y, bottom + stile / 2), m["cab"], col, root)


def add_frame_rail(root, col, m, w, d, z, name="FaceFrame_MidRail"):
    """Add a real face-frame cross rail between openings."""
    stile = s(FACE_FRAME_WIDTH_IN)
    frame_t = s(FACE_FRAME_IN)
    y = -d / 2 - frame_t / 2
    return box(name, (w - 2 * stile, frame_t, stile), (0, y, z), m["cab"], col, root, .006)


def add_shaker_panel(root, col, m, name, x, y, z, width, height,
                     panel_mat=None, glass=False, bevel=.008, frame_in=None):
    """Build a true five-piece Shaker front rather than a beveled slab."""
    thickness = s(DOOR_IN)
    requested_frame = s(DOOR_FRAME_WIDTH_IN if frame_in is None else frame_in)
    frame = min(requested_frame, width * .205, height * .205)
    panel_t = s(DOOR_PANEL_IN)
    inner_w = max(s(.5), width - 2 * frame)
    inner_h = max(s(.5), height - 2 * frame)
    box(f"{name}_LeftStile", (frame, thickness, height),
        (x - width / 2 + frame / 2, y, z), m["cab"], col, root, bevel)
    box(f"{name}_RightStile", (frame, thickness, height),
        (x + width / 2 - frame / 2, y, z), m["cab"], col, root, bevel)
    box(f"{name}_TopRail", (inner_w, thickness, frame),
        (x, y, z + height / 2 - frame / 2), m["cab"], col, root, bevel)
    box(f"{name}_BottomRail", (inner_w, thickness, frame),
        (x, y, z - height / 2 + frame / 2), m["cab"], col, root, bevel)
    inset_y = y + thickness / 2 - panel_t / 2 + s(.08)
    material = m["glass"] if glass else (panel_mat or m["cab"])
    panel = box(f"{name}_{'Glass' if glass else 'RecessedPanel'}",
                (inner_w + s(.12), panel_t, inner_h + s(.12)),
                (x, inset_y, z), material, col, root, .003)
    panel["Construction"] = "five-piece Shaker; recessed center panel"
    return panel


def add_hinge(root, col, m, x, y, z, side=1):
    cup_r = s(HINGE_CUP_DIA_IN) / 2
    cup_d = s(HINGE_CUP_DEPTH_IN)
    # Hardware is mounted behind a closed full-overlay door and must not be
    # visible from the catalog/front view.
    y += s(.55)
    cylinder("HingeCup", cup_r, cup_d, (x, y, z), m["steel"], col, root, rot=(math.pi / 2, 0, 0), vertices=20)
    arm_x = x + side * s(.65)
    box("HingeArm", (s(1.25), s(.42), s(.25)), (arm_x, y + s(.12), z), m["steel"], col, root, .004)


def add_handle(root, col, m, x, y, z, length_in=5.0, vertical=True):
    dia = s(HANDLE_DIA_IN)
    length = s(length_in)
    if vertical:
        box("Handle", (dia, dia, length), (x, y, z), m["steel"], col, root, dia * .25)
        box("HandlePostA", (dia, s(.55), dia), (x, y + s(.2), z - length * .35), m["steel"], col, root, dia * .2)
        box("HandlePostB", (dia, s(.55), dia), (x, y + s(.2), z + length * .35), m["steel"], col, root, dia * .2)
    else:
        box("Handle", (length, dia, dia), (x, y, z), m["steel"], col, root, dia * .25)
        box("HandlePostA", (dia, s(.55), dia), (x - length * .35, y + s(.2), z), m["steel"], col, root, dia * .2)
        box("HandlePostB", (dia, s(.55), dia), (x + length * .35, y + s(.2), z), m["steel"], col, root, dia * .2)


def cabinet_shell(root, col, m, w, d, h, toe=False):
    side = s(SIDE_IN)
    back = s(BACK_IN)
    shelf = s(SHELF_IN)
    toe_h = s(TOE_H_IN) if toe else 0
    toe_recess = s(TOE_RECESS_IN)
    body_h = h - toe_h
    box("LeftSide_3quarter", (side, d, body_h), (-w / 2 + side / 2, 0, toe_h + body_h / 2), m["wood"], col, root)
    box("RightSide_3quarter", (side, d, body_h), (w / 2 - side / 2, 0, toe_h + body_h / 2), m["wood"], col, root)
    box("Bottom_3quarter", (w - 2 * side, d - back, shelf), (0, -back / 2, toe_h + shelf / 2), m["wood"], col, root)
    if not toe:
        box("Top_3quarter", (w - 2 * side, d - back, shelf), (0, -back / 2, h - shelf / 2), m["wood"], col, root)
    else:
        box("FrontStretcher", (w - 2 * side, s(3), shelf), (0, -d / 2 + s(1.5), h - shelf / 2), m["wood"], col, root)
        box("RearStretcher", (w - 2 * side, s(3), shelf), (0, d / 2 - back - s(1.5), h - shelf / 2), m["wood"], col, root)
    box("Back_1quarter", (w - 2 * side, back, body_h), (0, d / 2 - back / 2, toe_h + body_h / 2), m["edge"], col, root, .004)
    finish_t = s(.125)
    for x, label in ((-w / 2 + finish_t / 2, "LeftFinishedEnd"),
                     (w / 2 - finish_t / 2, "RightFinishedEnd")):
        box(label, (finish_t, d, body_h), (x, 0, toe_h + body_h / 2),
            m["cab"], col, root, .003)
    if toe:
        box("ToeKickSkin", (w - s(.25), s(.25), toe_h),
            (0, -d / 2 + toe_recess, toe_h / 2), m["cab"], col, root, .004)
        box("ToeKickRearCleat", (w - 2 * side, s(.75), toe_h),
            (0, d / 2 - s(.5), toe_h / 2), m["wood"], col, root, .004)
        support_d = d - toe_recess
        for x, label in ((-w / 2 + side / 2, "LeftToeSupport"),
                         (w / 2 - side / 2, "RightToeSupport")):
            box(label, (side, support_d, toe_h),
                (x, toe_recess / 2, toe_h / 2), m["wood"], col, root, .004)
        box("ToeFloor", (w - 2 * side, d - toe_recess, s(.5)), (0, toe_recess / 2, s(.25)), m["wood"], col, root, .004)


def add_shelf(root, col, m, w, d, z, label="Shelf"):
    side = s(SIDE_IN)
    back = s(BACK_IN)
    t = s(SHELF_IN)
    box(label, (w - 2 * side - s(.1), d - back - s(.5), t), (0, -s(.15), z), m["wood"], col, root, .005)
    for x in (-w / 2 + side + s(.15), w / 2 - side - s(.15)):
        for dz in (-s(.35), s(.35)):
            cylinder("ShelfPin", s(.125), s(.18), (x, -d / 2 + s(.8), z + dz), m["steel"], col, root, rot=(math.pi / 2, 0, 0), vertices=12)


def add_door_pair(root, col, m, w, d, bottom, top, glass=False,
                  placement="lower", name_prefix="Door", force_count=None,
                  x_offset=0.0):
    edge_reveal = s(.25)
    gap = s(DOOR_REVEAL_IN)
    door_t = s(DOOR_IN)
    face_h = top - bottom
    front_w = w - 2 * edge_reveal
    count = force_count if force_count else (1 if w <= s(18) else 2)
    each = (front_w - gap * (count - 1)) / count
    y = -d / 2 - s(FACE_FRAME_IN) - door_t / 2
    pull_length_in = 5.0 if face_h < s(24) else 8.0 if face_h <= s(36) else 14.0
    for i in range(count):
        x = x_offset - front_w / 2 + each / 2 + i * (each + gap)
        zc = bottom + face_h / 2
        add_shaker_panel(root, col, m, f"{name_prefix}_{i+1}", x, y, zc, each, face_h, glass=glass)
        shaker_frame = min(s(DOOR_FRAME_WIDTH_IN), each * .205, face_h * .205)
        # Center hardware on the opening-side Shaker stile, independent of door width.
        handle_x = x + (each / 2 - shaker_frame / 2 if i == 0 else -each / 2 + shaker_frame / 2)
        post_offset = s(pull_length_in * .35)
        if placement == "upper":
            handle_z = bottom + s(3) + post_offset
        elif placement == "tall":
            handle_z = min(top - s(7), max(bottom + s(7), s(42)))
        else:
            handle_z = top - s(3) - post_offset
        add_handle(root, col, m, handle_x, y - s(.35), handle_z, pull_length_in, True)
        hinge_x = x - each * .42 if i == 0 else x + each * .42
        hinge_levels = (.16, .50, .84) if face_h > s(48) else (.22, .78)
        for frac in hinge_levels:
            z = zc - face_h / 2 + face_h * frac
            add_hinge(root, col, m, hinge_x, y + door_t / 2, z, -1 if i == 0 else 1)


def add_drawer_box(root, col, m, w, d, z, face_h, index):
    side_t = s(DRAWER_SIDE_IN)
    bottom_t = s(DRAWER_BOTTOM_IN)
    front_t = s(DOOR_IN)
    slide_t = s(SLIDE_T_IN)
    slide_h = s(SLIDE_H_IN)
    box_w = max(s(4), w - s(3.125))
    box_d = min(s(DRAWER_DEPTH_IN), d - s(2.25))
    box_h = max(s(2.8), face_h - s(1.25))
    y = -d / 2 + box_d / 2 + s(1.2)
    box(f"Drawer{index}_LeftSide", (side_t, box_d, box_h), (-box_w / 2 + side_t / 2, y, z), m["drawer"], col, root, .004)
    box(f"Drawer{index}_RightSide", (side_t, box_d, box_h), (box_w / 2 - side_t / 2, y, z), m["drawer"], col, root, .004)
    box(f"Drawer{index}_Front", (box_w - 2 * side_t, side_t, box_h), (0, y - box_d / 2 + side_t / 2, z), m["drawer"], col, root, .004)
    box(f"Drawer{index}_Back", (box_w - 2 * side_t, side_t, box_h), (0, y + box_d / 2 - side_t / 2, z), m["drawer"], col, root, .004)
    box(f"Drawer{index}_Bottom", (box_w - 2 * side_t, box_d - 2 * side_t, bottom_t), (0, y, z - box_h / 2 + bottom_t / 2), m["drawer"], col, root, .003)
    for x in (-box_w / 2 - slide_t / 2, box_w / 2 + slide_t / 2):
        box(f"Drawer{index}_Slide", (slide_t, box_d, slide_h), (x, y, z - box_h * .25), m["steel"], col, root, .003)
    face_y = -d / 2 - s(FACE_FRAME_IN) - front_t / 2
    drawer_frame_in = min(1.75, max(.75, face_h * IN_PER_STUD * .19))
    add_shaker_panel(root, col, m, f"Drawer{index}_Face", 0, face_y, z,
                     w - s(.5), face_h, frame_in=drawer_frame_in)
    width_in = w * IN_PER_STUD
    pull_length_in = 5.0 if width_in < 16 else 8.0 if width_in <= 32 else 12.0
    add_handle(root, col, m, 0, face_y - s(.35), z, pull_length_in, False)


def build_fridge_surround(root, col, m, w, d, h):
    """36-inch appliance opening with two 3/4-inch panels and installation clearance."""
    panel = s(.75)
    opening_w = s(37.0)
    bridge_bottom = s(70.5)
    x = opening_w / 2 + panel / 2
    for xx, label in ((-x, "LeftRefrigeratorPanel"), (x, "RightRefrigeratorPanel")):
        box(label, (panel, d, h), (xx, 0, h / 2), m["cab"], col, root, .006)
    bridge_w = opening_w
    bridge_h = h - bridge_bottom
    box("BridgeBottom", (bridge_w, d, s(.75)), (0, 0, bridge_bottom), m["wood"], col, root, .005)
    box("BridgeTop", (bridge_w, d, s(.75)), (0, 0, h - s(.375)), m["wood"], col, root, .005)
    box("BridgeBack", (bridge_w, s(.25), bridge_h), (0, d / 2 - s(.125), bridge_bottom + bridge_h / 2), m["edge"], col, root, .003)
    add_door_pair(root, col, m, bridge_w, d, bridge_bottom + s(.25), h - s(.25),
                  False, "upper", "BridgeDoor", 2)
    box("RefrigeratorAntiTipRail", (opening_w, s(.75), s(3)),
        (0, d / 2 - s(.5), bridge_bottom - s(1.5)), m["wood"], col, root, .004)


def build_cabinet(kind, root, col, m, w, d, h):
    if kind == "fridge-surround":
        build_fridge_surround(root, col, m, w, d, h)
        return

    is_base = kind in {"base", "drawers", "sink", "corner", "tall", "oven-tower"}
    cabinet_shell(root, col, m, w, d, h, is_base)
    bottom = s(TOE_H_IN) if is_base else 0
    add_face_frame(root, col, m, w, d, h, bottom, h)
    edge = s(.25)
    center_gap = s(DOOR_REVEAL_IN)

    if kind == "base":
        add_shelf(root, col, m, w, d, bottom + s(12))
        drawer_h = s(6.25)
        drawer_top = h - edge
        drawer_bottom = drawer_top - drawer_h
        add_drawer_box(root, col, m, w, d, (drawer_top + drawer_bottom) / 2, drawer_h, 1)
        add_frame_rail(root, col, m, w, d, drawer_bottom, "DrawerDividerRail")
        add_door_pair(root, col, m, w, d, bottom + edge, drawer_bottom - center_gap,
                      False, "lower", "BaseDoor")

    elif kind == "drawers":
        top = h - edge
        lower = bottom + edge
        available = top - lower - 2 * center_gap
        heights = (s(6.25), (available - s(6.25)) / 2, (available - s(6.25)) / 2)
        cursor = top
        for i, fh in enumerate(heights, 1):
            z = cursor - fh / 2
            add_drawer_box(root, col, m, w, d, z, fh, i)
            cursor -= fh + center_gap

    elif kind == "sink":
        false_h = s(6.25)
        false_top = h - edge
        false_bottom = false_top - false_h
        face_y = -d / 2 - s(FACE_FRAME_IN) - s(DOOR_IN) / 2
        add_shaker_panel(root, col, m, "SinkFalseFront", 0, face_y,
                         (false_top + false_bottom) / 2, w - s(.5), false_h,
                         frame_in=1.25)
        add_frame_rail(root, col, m, w, d, false_bottom, "SinkDividerRail")
        add_door_pair(root, col, m, w, d, bottom + edge, false_bottom - center_gap,
                      False, "lower", "SinkDoor")
        box("SinkPlumbingClearance", (w - s(3), d - s(3), s(12)),
            (0, s(1), bottom + s(8)), m["edge"], col, root, .002)

    elif kind == "corner":
        # 36-inch blind-corner base: one 15-inch working door and a fixed blind panel.
        add_shelf(root, col, m, w, d, bottom + s(12))
        working_w = s(15)
        blind_w = w - working_w - s(.5)
        door_center = -w / 2 + working_w / 2 + edge
        add_door_pair(root, col, m, working_w, d, bottom + edge, h - edge,
                      False, "lower", "CornerAccessDoor", 1, door_center)
        panel_y = -d / 2 - s(FACE_FRAME_IN) - s(DOOR_IN) / 2
        panel_center = w / 2 - blind_w / 2 - edge
        box("CornerBlindPanel", (blind_w, s(DOOR_IN), h - bottom - 2 * edge),
            (panel_center, panel_y, bottom + (h - bottom) / 2), m["cab"], col, root, .008)

    elif kind in {"upper", "glass"}:
        for frac in (.34, .67):
            add_shelf(root, col, m, w, d, h * frac)
        add_door_pair(root, col, m, w, d, edge, h - edge, kind == "glass",
                      "upper", "WallDoor")
        box("TopHangingRail", (w - s(1.5), s(.5), s(2.5)),
            (0, d / 2 - s(.5), h - s(1.75)), m["wood"], col, root, .003)
        box("BottomHangingRail", (w - s(1.5), s(.5), s(2.5)),
            (0, d / 2 - s(.5), s(1.75)), m["wood"], col, root, .003)

    elif kind == "tall":
        for frac in (.18, .36, .54, .72):
            add_shelf(root, col, m, w, d, bottom + (h - bottom) * frac)
        split_z = s(65.5)
        add_frame_rail(root, col, m, w, d, split_z, "PantrySeparationRail")
        count = 1 if w <= s(18) else 2
        add_door_pair(root, col, m, w, d, bottom + edge, split_z - center_gap / 2,
                      False, "tall", "PantryLowerDoor", count)
        add_door_pair(root, col, m, w, d, split_z + center_gap / 2, h - edge,
                      False, "upper", "PantryUpperDoor", count)

    elif kind == "oven-tower":
        oven_bottom = s(27)
        oven_h = s(30)
        add_shelf(root, col, m, w, d, bottom + s(11), "LowerShelf")
        add_door_pair(root, col, m, w, d, bottom + edge, oven_bottom - center_gap,
                      False, "lower", "OvenLowerDoor", 2)
        add_frame_rail(root, col, m, w, d, oven_bottom - s(.5), "OvenLowerRail")
        add_frame_rail(root, col, m, w, d, oven_bottom + oven_h + s(.5), "OvenUpperRail")
        box("OvenSupportDeck", (w - s(3), d - s(1), s(.75)),
            (0, s(.25), oven_bottom), m["wood"], col, root, .006)
        box("OvenCavity", (w - s(3), d - s(2), oven_h),
            (0, 0, oven_bottom + oven_h / 2), m["black"], col, root, .01)
        for zoff in (s(7), s(15), s(23)):
            box("OvenRack", (w - s(6), d - s(5), s(.18)),
                (0, -s(.2), oven_bottom + zoff), m["steel"], col, root, .002)
        face_y = -d / 2 - s(1.2)
        box("OvenDoorGlass", (w - s(1), s(.75), s(23)),
            (0, face_y, oven_bottom + oven_h * .47), m["black"], col, root, .015)
        box("OvenControlPanel", (w - s(1), s(.82), s(4.25)),
            (0, face_y, oven_bottom + oven_h - s(2.25)), m["steel"], col, root, .008)
        box("OvenDisplay", (s(5.5), s(.12), s(1.3)),
            (0, face_y - s(.48), oven_bottom + oven_h - s(2.25)), m["screen"], col, root, .003)
        add_handle(root, col, m, 0, face_y - s(.4), oven_bottom + oven_h * .79, 20, False)
        add_door_pair(root, col, m, w, d, oven_bottom + oven_h + center_gap,
                      h - edge, False, "upper", "OvenUpperDoor", 2)


def add_leveling_feet(root, col, m, w, d):
    for x in (-w * .42, w * .42):
        for y in (-d * .38, d * .38):
            cylinder("LevelingFoot", s(.35), s(.65), (x, y, s(.325)), m["rubber"], col, root, vertices=16)


def build_fridge(kind, root, col, m, w, d, h):
    steel = m["blue"] if kind == "fridge-retro" else m["dark"] if kind == "fridge-smart" else m["steel"]
    wall = s(.75)
    back = s(.5)
    interior_w = w - 2 * wall
    interior_d = d - s(3)
    body_bottom = s(.75)
    body_h = h - body_bottom
    box("LeftCabinetWall", (wall, d, body_h), (-w / 2 + wall / 2, 0, body_bottom + body_h / 2), steel, col, root)
    box("RightCabinetWall", (wall, d, body_h), (w / 2 - wall / 2, 0, body_bottom + body_h / 2), steel, col, root)
    box("TopCabinetWall", (interior_w, d, wall), (0, 0, h - wall / 2), steel, col, root)
    box("BackCabinetWall", (interior_w, back, body_h), (0, d / 2 - back / 2, body_bottom + body_h / 2), steel, col, root)
    box("InteriorLiner", (interior_w, interior_d, body_h - s(1.5)), (0, s(.3), body_bottom + body_h / 2), m["white"], col, root, .008)
    box("CompressorCover", (interior_w * .70, s(2.0), s(7.0)),
        (0, d / 2 - s(1.25), s(4.0)), m["dark"], col, root, .012)
    for i in range(9):
        box(f"LowerVent_{i+1}", (interior_w * .70, s(.18), s(.16)),
            (0, -d / 2 - s(.08), s(.7 + i * .32)), m["dark"], col, root, .001)
    add_leveling_feet(root, col, m, w, d)

    y = -d / 2 - s(.45)
    if kind == "fridge-retro":
        lower_h = h * .67
        upper_h = h - lower_h - s(.5)
        box("FreshFoodDoor", (w - s(.4), s(1.1), lower_h), (0, y, lower_h / 2 + s(.4)), steel, col, root, .025)
        box("FreezerDoor", (w - s(.4), s(1.1), upper_h), (0, y, lower_h + upper_h / 2), steel, col, root, .025)
        box("FreshFoodGasket", (w - s(1.1), s(.16), lower_h - s(.8)), (0, y + s(.58), lower_h / 2 + s(.4)), m["gasket"], col, root, .004)
        box("FreezerGasket", (w - s(1.1), s(.16), upper_h - s(.8)), (0, y + s(.58), lower_h + upper_h / 2), m["gasket"], col, root, .004)
        add_handle(root, col, m, -w * .28, y - s(.7), lower_h * .58, 8, False)
        add_handle(root, col, m, -w * .28, y - s(.7), lower_h + upper_h * .55, 7, False)
        for z in (lower_h * .20, lower_h * .42, lower_h * .64):
            box("GlassShelf", (interior_w - s(1), interior_d - s(2), s(.22)), (0, s(.4), z), m["glass"], col, root, .003)
    else:
        freezer_h = h * .27
        fresh_bottom = freezer_h + s(.5)
        fresh_h = h - fresh_bottom - s(.5)
        for i, x in enumerate((-w / 4, w / 4)):
            box(f"FrenchDoor_{i+1}", (w / 2 - s(.22), s(1.0), fresh_h), (x, y, fresh_bottom + fresh_h / 2), steel, col, root, .022)
            box(f"FrenchDoorGasket_{i+1}", (w / 2 - s(.82), s(.14), fresh_h - s(.7)),
                (x, y + s(.53), fresh_bottom + fresh_h / 2), m["gasket"], col, root, .003)
            add_handle(root, col, m, x + (s(2.2) if i == 0 else -s(2.2)), y - s(.65), fresh_bottom + fresh_h * .55, 18, True)
            for z in (fresh_bottom + fresh_h * .18, fresh_bottom + fresh_h * .82):
                add_hinge(root, col, m, x + (-w * .22 if i == 0 else w * .22), y + s(.4), z, -1 if i == 0 else 1)
        box("FreezerDrawerFace", (w - s(.5), s(1.0), freezer_h - s(.4)), (0, y, freezer_h / 2), steel, col, root, .022)
        box("FreezerBasket", (interior_w - s(1.2), interior_d - s(4), freezer_h * .48),
            (0, s(.35), freezer_h * .42), m["aluminum"], col, root, .006)
        add_handle(root, col, m, 0, y - s(.65), freezer_h * .72, min(24, w * 12 - 8), False)
        for z in (fresh_bottom + fresh_h * .22, fresh_bottom + fresh_h * .45, fresh_bottom + fresh_h * .68):
            box("GlassShelf", (interior_w - s(1), interior_d - s(2), s(.22)), (0, s(.4), z), m["glass"], col, root, .003)
        box("CrisperLeft", (interior_w * .46, interior_d * .72, s(7)), (-interior_w * .25, s(.5), fresh_bottom + s(4.5)), m["glass"], col, root, .006)
        box("CrisperRight", (interior_w * .46, interior_d * .72, s(7)), (interior_w * .25, s(.5), fresh_bottom + s(4.5)), m["glass"], col, root, .006)
        for i, x in enumerate((-w * .25, w * .25), 1):
            for frac in (.30, .55, .78):
                box(f"DoorBin_{i}_{int(frac*100)}", (w * .19, s(3.0), s(4.0)),
                    (x, -d / 2 + s(2.0), fresh_bottom + fresh_h * frac), m["glass"], col, root, .004)
        if kind == "fridge-smart":
            box("SmartDisplay", (w * .22, s(.18), h * .23), (w * .23, y - s(.62), h * .58), m["screen"], col, root, .006)
        elif kind == "fridge-french":
            box("IceWaterDispenser", (w * .19, s(.18), h * .16), (-w * .23, y - s(.62), h * .57), m["black"], col, root, .006)


def add_range_grate(root, col, m, cx, cy, span_x, span_y, z):
    rail = s(.35)
    for off in (-span_y * .42, 0, span_y * .42):
        box("GrateRail", (span_x, rail, rail), (cx, cy + off, z), m["dark"], col, root, .003)
    for off in (-span_x * .42, span_x * .42):
        box("GrateCross", (rail, span_y, rail), (cx + off, cy, z), m["dark"], col, root, .003)


def build_range(kind, root, col, m, w, d, h):
    body_bottom = s(2)
    add_leveling_feet(root, col, m, w, d)
    box("RangeBody", (w, d, h - body_bottom), (0, 0, body_bottom + (h - body_bottom) / 2), m["steel"], col, root, .025)
    box("Cooktop", (w, d * .88, s(.75)), (0, -d * .02, h + s(.375)), m["dark"], col, root, .012)
    box("CooktopFrontTrim", (w, s(.6), s(.55)), (0, -d * .46, h + s(.25)), m["chrome"], col, root, .005)
    griddle = "griddle" in kind
    centers = [(-w * .28, -d * .23), (w * .28, -d * .23), (-w * .28, d * .18), (w * .28, d * .18)]
    for i, (x, y) in enumerate(centers, 1):
        torus(f"BurnerRing_{i}", s(2.1), s(.26), (x, y, h + s(.95)), m["dark"], col, root)
        cylinder(f"BurnerCap_{i}", s(1.25), s(.32), (x, y, h + s(.92)), m["brass"], col, root, vertices=28)
        cylinder(f"Igniter_{i}", s(.12), s(.38), (x + s(1.45), y, h + s(1.0)), m["white"], col, root, vertices=12)
        add_range_grate(root, col, m, x, y, w * .32, d * .36, h + s(1.25))
    if griddle:
        box("CenterGriddle", (w * .22, d * .66, s(.55)), (0, -d * .02, h + s(.95)), m["dark"], col, root, .01)
        add_handle(root, col, m, 0, -d * .36, h + s(1.35), min(10, w * 12 * .20), False)
    panel_y = -d / 2 - s(.3)
    panel_h = s(7)
    box("ControlPanel", (w - s(.5), s(.7), panel_h), (0, panel_y, h - panel_h / 2 - s(1)), m["steel"], col, root, .01)
    box("RangeDisplay", (s(5.5), s(.14), s(1.35)), (0, panel_y - s(.42), h - s(2.0)), m["screen"], col, root, .003)
    knobs = 5 if griddle else 4
    for i in range(knobs):
        x = -w * .36 + i * (w * .72 / max(1, knobs - 1))
        cylinder(f"Knob_{i+1}", s(1.0), s(.85), (x, panel_y - s(.45), h - s(4.5)), m["dark"], col, root, rot=(math.pi / 2, 0, 0), vertices=28)
        box(f"KnobMarker_{i+1}", (s(.12), s(.12), s(.65)), (x, panel_y - s(.92), h - s(4.1)), m["white"], col, root, .001)
    oven_bottom = s(4)
    oven_top = h - panel_h - s(2)
    oven_h = oven_top - oven_bottom
    box("OvenCavity", (w - s(4), d - s(5), oven_h), (0, s(.6), oven_bottom + oven_h / 2), m["black"], col, root, .008)
    for n, frac in enumerate((.25, .48, .71), 1):
        z = oven_bottom + oven_h * frac
        box(f"OvenRack_{n}", (w - s(6), d - s(7), s(.12)), (0, s(.3), z), m["steel"], col, root, .001)
        for off in (-.35, -.17, 0, .17, .35):
            box(f"OvenRackWire_{n}", (s(.10), d - s(7), s(.10)), ((w - s(7)) * off, s(.3), z + s(.08)), m["steel"], col, root, .001)
    door_y = -d / 2 - s(.72)
    box("OvenDoorFrame", (w - s(1.25), s(1.2), oven_h * .84), (0, door_y, oven_bottom + oven_h * .48), m["steel"], col, root, .018)
    box("OvenDoorGlass", (w - s(4), s(.25), oven_h * .62), (0, door_y - s(.62), oven_bottom + oven_h * .48), m["black"], col, root, .008)
    add_handle(root, col, m, 0, door_y - s(.95), oven_bottom + oven_h * .86, min(24, w * 12 - 8), False)
    for x in (-w * .40, w * .40):
        cylinder("DoorHinge", s(.42), s(1.0), (x, door_y + s(.4), oven_bottom + s(1)), m["steel"], col, root, rot=(math.pi / 2, 0, 0), vertices=18)
    box("BroilerDrawerFace", (w - s(2), s(.65), s(2.4)), (0, door_y, s(2.0)), m["steel"], col, root, .008)


def build_microwave(kind, root, col, m, w, d, h):
    wall = s(.55)
    box("MW_LeftWall", (wall, d, h), (-w / 2 + wall / 2, 0, h / 2), m["steel"], col, root)
    box("MW_RightWall", (wall, d, h), (w / 2 - wall / 2, 0, h / 2), m["steel"], col, root)
    box("MW_Top", (w - 2 * wall, d, wall), (0, 0, h - wall / 2), m["steel"], col, root)
    box("MW_Bottom", (w - 2 * wall, d, wall), (0, 0, wall / 2), m["steel"], col, root)
    box("MW_Back", (w - 2 * wall, wall, h - 2 * wall), (0, d / 2 - wall / 2, h / 2), m["steel"], col, root)
    panel_w = w * .22
    door_w = w - panel_w - s(.35)
    y = -d / 2 - s(.55)
    box("DoorFrame", (door_w, s(1.0), h * .78), (-panel_w / 2, y, h * .52), m["black"], col, root, .018)
    box("DoorWindow", (door_w * .72, s(.16), h * .52), (-panel_w / 2, y - s(.5), h * .52), m["glass"], col, root, .006)
    box("DoorInnerChoke", (door_w * .88, s(.12), h * .68), (-panel_w / 2, y + s(.53), h * .52), m["gasket"], col, root, .004)
    add_handle(root, col, m, door_w / 2 - panel_w / 2 - s(1.0), y - s(.75), h * .52, min(10, h * 12 * .55), True)
    add_hinge(root, col, m, -w / 2 + s(1.0), y + s(.4), h * .25, -1)
    add_hinge(root, col, m, -w / 2 + s(1.0), y + s(.4), h * .76, -1)
    panel_x = w / 2 - panel_w / 2 - s(.15)
    box("ControlPanel", (panel_w, s(.8), h * .78), (panel_x, y, h * .52), m["black"], col, root, .014)
    box("DigitalDisplay", (panel_w * .62, s(.15), h * .10), (panel_x, y - s(.48), h * .75), m["screen"], col, root, .004)
    for r in range(5):
        for c in range(3):
            x = panel_x - panel_w * .24 + c * panel_w * .24
            z = h * .62 - r * h * .085
            cylinder(f"Key_{r}_{c}", s(.22), s(.15), (x, y - s(.48), z), m["steel"], col, root, rot=(math.pi / 2, 0, 0), vertices=12)
    cavity_w = w - panel_w - s(2.2)
    cavity_d = d - s(2.5)
    cavity_h = h - s(3)
    box("InteriorCavity", (cavity_w, cavity_d, cavity_h), (-panel_w / 2, s(.4), h / 2), m["white"], col, root, .008)
    cylinder("GlassTurntable", min(cavity_w, cavity_d) * .34, s(.18), (-panel_w / 2, s(.1), s(1.25)), m["glass"], col, root, vertices=40)
    cylinder("TurntableHub", s(.42), s(.22), (-panel_w / 2, s(.1), s(1.05)), m["steel"], col, root, vertices=20)
    for row in range(5):
        for column in range(8):
            cylinder(f"CavityVent_{row}_{column}", s(.055), s(.08),
                     (-panel_w / 2 - cavity_w * .35 + column * cavity_w * .10,
                      d / 2 - s(.62), h * .68 + row * s(.18)),
                     m["dark"], col, root, rot=(math.pi / 2, 0, 0), vertices=8)
    if kind == "microwave":
        for x in (-w * .40, w * .40):
            for yy in (-d * .36, d * .36):
                cylinder("RubberFoot", s(.25), s(.35), (x, yy, s(.18)), m["rubber"], col, root, vertices=16)
    else:
        filter_z = s(.18)
        box("LeftGreaseFilter", (w * .40, d * .56, s(.18)), (-w * .25, s(.2), filter_z), m["dark"], col, root, .003)
        box("RightGreaseFilter", (w * .40, d * .56, s(.18)), (w * .25, s(.2), filter_z), m["dark"], col, root, .003)
        for i in range(10):
            xx = -w * .42 + i * w * .84 / 9
            box(f"FilterSlat_{i}", (s(.10), d * .50, s(.06)), (xx, s(.2), filter_z - s(.12)), m["steel"], col, root, .001)
        box("CooktopLight", (w * .18, d * .14, s(.14)), (0, -d * .31, s(.10)), m["light"], col, root, .003)
        box("BottomControlStrip", (w * .28, d * .10, s(.12)), (w * .31, -d * .28, s(.11)), m["black"], col, root, .002)
        box("WallMountBracket", (w - s(2), s(.25), h * .58), (0, d / 2 + s(.12), h * .45), m["steel"], col, root, .004)
        box("ExhaustAdapter_3.25x10", (s(10), s(3.25), s(1.5)), (0, s(.5), h + s(.75)), m["steel"], col, root, .006)
        for i in range(12):
            xx = -w * .43 + i * w * .86 / 11
            box(f"TopVentSlat_{i}", (s(.12), s(.5), s(.9)), (xx, -d / 2 + s(.4), h - s(.65)), m["dark"], col, root, .001)


def build(entry, root, col, m):
    _, _, kind, wi, di, hi, _ = entry
    w, d, h = s(wi), s(di), s(hi)
    if kind in {"base", "drawers", "sink", "corner", "upper", "glass", "tall", "oven-tower", "fridge-surround"}:
        build_cabinet(kind, root, col, m, w, d, h)
    elif kind.startswith("fridge"):
        build_fridge(kind, root, col, m, w, d, h)
    elif kind.startswith("range"):
        build_range(kind, root, col, m, w, d, h)
    elif kind.startswith("microwave"):
        build_microwave(kind, root, col, m, w, d, h)


def select_tree(root):
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb(root, model_id):
    select_tree(root)
    path = OUT / "GLB" / f"{model_id}.glb"
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_yup=True, export_extras=True)
    bpy.ops.object.select_all(action='DESELECT')
    return str(path)


def add_showroom(roots, m):
    col = bpy.data.collections.new("SHOWROOM")
    bpy.context.scene.collection.children.link(col)
    columns = 6
    rows = math.ceil(len(roots) / columns)
    x_step = 5.2
    y_step = 6.2
    width = (columns - 1) * x_step + 7
    depth = (rows - 1) * y_step + 8
    box("Floor", (width, depth, .12),
        ((columns - 1) * x_step / 2, (rows - 1) * y_step / 2, -.06),
        m["floor"], col, None, .02)
    for i, (root, elev, category) in enumerate(roots):
        # Catalog display position: uppers are lowered enough to inspect while
        # their true installation elevation remains stored in root metadata.
        display_z = s(18) if category == "uppers" else 0
        if category == "microwaves":
            display_z = s(30)
        root.location = (i % columns * x_step, i // columns * y_step, display_z)
        if category in {"lowers", "tall"}:
            box(f"Plinth_{i+1}", (4.3, 4.6, s(.75)),
                (root.location.x, root.location.y, -s(.375)), m["edge"], col, None, .006)
    center_x = (columns - 1) * x_step / 2
    center_y = (rows - 1) * y_step / 2
    bpy.ops.object.camera_add(location=(center_x, -34, 31))
    cam = bpy.context.object
    move_to(cam, col)
    bpy.context.scene.camera = cam
    target = (center_x, center_y + 2, 2.6)
    cam.rotation_euler = Vector((target[0]-cam.location.x, target[1]-cam.location.y, target[2]-cam.location.z)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 54
    for loc, energy, size in [((2, -8, 22), 2600, 10), ((25, 10, 24), 2200, 12), ((8, 38, 25), 2400, 12)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        move_to(light, col)
        light.data.energy = energy
        light.data.size = size
        light.rotation_euler = Vector((target[0]-loc[0], target[1]-loc[1], target[2]-loc[2])).to_track_quat('-Z', 'Y').to_euler()
    scene = bpy.context.scene
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world.color = (.035, .035, .035)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "GLB").mkdir(exist_ok=True)
    clear_scene()
    bpy.context.scene.unit_settings.system = 'NONE'
    m = materials()
    roots = []
    manifest = []
    for i, entry in enumerate(CATALOG, 1):
        model_id, category, kind, w, d, h, elev = entry
        print(f"[{i}/{len(CATALOG)}] {model_id}")
        col, root = root_for(model_id, category, w, d, h, elev)
        build(entry, root, col, m)
        glb = export_glb(root, model_id) if EXPORT_GLB else None
        roots.append((root, elev, category))
        manifest.append({
            "id": model_id,
            "category": category,
            "kind": kind,
            "widthIn": w,
            "depthIn": d,
            "heightIn": h,
            "defaultElevationIn": elev,
            "glb": glb,
        })
    if ADD_SHOWROOM:
        add_showroom(roots, m)
    (OUT / "catalog_manifest.json").write_text(json.dumps({
        "scale": "1 Blender unit = 1 Roblox stud = 12 inches",
        "cabinetConstruction": {
            "sideIn": SIDE_IN,
            "shelfIn": SHELF_IN,
            "backIn": BACK_IN,
            "drawerSideIn": DRAWER_SIDE_IN,
            "drawerBottomIn": DRAWER_BOTTOM_IN,
            "drawerDepthIn": DRAWER_DEPTH_IN,
            "toeKickHeightIn": TOE_H_IN,
            "toeKickRecessIn": TOE_RECESS_IN,
        },
        "models": manifest,
    }, indent=2), encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "KitchenAI_Roblox_Detailed_Catalog.blend"))
    print(f"COMPLETE: {OUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
