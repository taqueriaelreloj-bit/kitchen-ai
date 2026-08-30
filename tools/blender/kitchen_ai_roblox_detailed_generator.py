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
    ("refrigerator-french-door-stainless", "refrigerators", "fridge-french", 35.75, 36.875, 70.25, 0),
    ("refrigerator-panel-ready-built-in", "refrigerators", "fridge-panel", 36, 24, 84, 0),
    ("refrigerator-smart-black", "refrigerators", "fridge-smart", 35.75, 34.25, 70, 0),
    ("refrigerator-single-door-stainless", "refrigerators", "fridge-single", 29.75, 31.5, 72, 0),
    ("refrigerator-retro-blue", "refrigerators", "fridge-retro", 23.6875, 28.75, 60.25, 0),
    ("gas-range-30-4-burner", "gas-ranges", "range-30", 29.875, 28.375, 37, 0),
    ("gas-range-36-4-burner-griddle", "gas-ranges", "range-36-griddle", 35.875, 28.375, 37, 0),
    ("gas-range-48-6-burner-griddle", "gas-ranges", "range-48-griddle", 47.875, 28.375, 37, 0),
    ("gas-cooktop-30-5-burner", "cooktops", "cooktop-gas-30", 31, 21.25, 3.8125, 36),
    ("gas-cooktop-36-5-burner", "cooktops", "cooktop-gas-36", 37, 21.25, 3.8125, 36),
    ("induction-cooktop-30-4-zone", "cooktops", "cooktop-induction-30", 31, 21.25, 4, 36),
    ("electric-cooktop-36-5-radiant", "cooktops", "cooktop-electric-36", 37, 21.25, 4, 36),
    ("hood-under-cabinet-30", "hoods", "hood-undercab-30", 30, 20, 5.5, 66),
    ("hood-wall-chimney-36", "hoods", "hood-chimney-36", 36, 19.6875, 38.875, 66),
    ("hood-professional-wall-48", "hoods", "hood-pro-48", 48, 24, 18, 66),
    ("microwave-countertop-24-stainless", "microwaves", "microwave", 23.875, 19.4375, 14, 36),
    ("microwave-over-range-30-stainless", "microwaves", "microwave-otr", 30, 15.875, 16.4375, 54),
    ("microwave-drawer-24-stainless", "microwaves", "microwave-drawer", 23.625, 21.875, 16, 24),
    ("dishwasher-24-stainless", "dishwashers", "dishwasher-standard", 23.875, 24.5, 33.875, 0),
    ("dishwasher-24-panel-ready", "dishwashers", "dishwasher-panel", 23.5625, 23.25, 33.875, 0),
    ("dishwasher-18-compact", "dishwashers", "dishwasher-compact", 17.625, 22.5, 32.5, 0),
    ("sink-undermount-30-single", "sinks", "sink-undermount", 30, 18, 9, 36),
    ("sink-farmhouse-33-apron", "sinks", "sink-farmhouse", 33.6875, 18.25, 9.5625, 36),
    ("sink-undermount-36-double", "sinks", "sink-double", 35.75, 20, 9, 36),
    ("faucet-professional-pulldown", "faucets", "faucet-pro", 5, 9.4375, 21.375, 36),
    ("faucet-standard-pulldown", "faucets", "faucet-standard", 4, 8.9375, 16.0625, 36),
    ("faucet-wall-pot-filler", "faucets", "faucet-pot-filler", 24, 4, 12, 54),
    ("sink-garbage-disposal", "sink-accessories", "sink-accessory-disposal", 8.5, 8.5, 12.75, 24),
    ("sink-basket-strainer", "sink-accessories", "sink-accessory-strainer", 4.5, 4.5, 3.25, 36),
    ("sink-soap-dispenser", "sink-accessories", "sink-accessory-soap", 2.5, 4, 13, 36),
    ("dishwasher-air-gap", "sink-accessories", "sink-accessory-airgap", 2, 2, 2.5, 36),
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
        if metallic > .5 and "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = .32
            bsdf.inputs["Coat Roughness"].default_value = .16
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
        mat.surface_render_method = 'BLENDED'
    return mat


def materials():
    return {
        "cab": make_mat("Cabinet White", "#E9E6DE", 0.0, .38),
        "edge": make_mat("Cabinet Edge", "#D4D0C7", 0.0, .46),
        "wood": make_mat("Birch Plywood", "#C2915F", 0.0, .55),
        "drawer": make_mat("Maple Drawer Box", "#D6AA76", 0.0, .48),
        "glass": make_mat("Cabinet Glass", "#A8D0DB", .05, .10, .30),
        "oven_glass": make_mat("Transparent Oven Glass", "#708892", .08, .035, .035),
        "steel": make_mat("Brushed Stainless", "#D2D8D9", .88, .20),
        "dark": make_mat("Graphite Metal", "#444D52", .62, .20),
        "black": make_mat("Black Glass", "#17222A", .18, .07),
        "blue": make_mat("Retro Azure Blue", "#72C7EE", .08, .20),
        "screen": make_mat("Display", "#67E1FF", .04, .06, 1, "#67E1FF"),
        "brass": make_mat("Burner Brass", "#B78A43", .85, .30),
        "red": make_mat("Professional Red Knob", "#A71920", .30, .20),
        "heat": make_mat("Radiant Heating Element", "#FF572F", .10, .12, 1, "#FF572F"),
        "rubber": make_mat("Rubber", "#17191A", .0, .82),
        "white": make_mat("Appliance Interior", "#EDEDEA", .02, .36),
        "light": make_mat("Warm Light", "#F7E6B0", 0, .15, 1, "#F7E6B0"),
        "floor": make_mat("Showroom Floor", "#E2E8E6", 0, .62),
        "chrome": make_mat("Polished Chrome", "#F1F6F7", .96, .08),
        "rack": make_mat("Illuminated Oven Rack", "#E8F0F2", .72, .12, 1, "#52666C"),
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
        # Kitchen AI catalog style: equal-height upper and lower pantry doors.
        # This intentionally differs from utility lines that use a short top door.
        split_z = (bottom + h) / 2
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


def add_kitchen_ai_badge(root, col, m, x, y, z, width_in=5.0, dark=False, height_in=.92):
    """Mesh logo that survives individual GLB export without external fonts."""
    badge_w = s(width_in)
    badge_h = s(height_in)
    badge = box("KitchenAI_LogoBadge", (badge_w, s(.10), badge_h),
                (x, y, z), m["black"] if dark else m["chrome"], col, root, .01)
    badge["Brand"] = "KITCHEN AI"
    bpy.ops.object.text_add(location=(x, y - s(.075), z), rotation=(math.pi / 2, 0, 0))
    text_obj = bpy.context.object
    text_obj.name = "KitchenAI_LogoText"
    text_obj.data.body = "KITCHEN AI"
    text_obj.data.align_x = 'CENTER'
    text_obj.data.align_y = 'CENTER'
    text_obj.data.size = s(max(.58, width_in * .14))
    text_obj.data.extrude = s(.018)
    text_obj.data.bevel_depth = s(.008)
    text_obj.data.materials.append(m["chrome"] if dark else m["black"])
    move_to(text_obj, col)
    text_obj.parent = root
    bpy.context.view_layer.objects.active = text_obj
    text_obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    text_obj.select_set(False)


def add_screen_text(root, col, mat, body, x, y, z, size_in=.7):
    """Convert appliance UI text to mesh so it remains visible in Roblox GLB."""
    bpy.ops.object.text_add(location=(x, y, z), rotation=(math.pi / 2, 0, 0))
    obj = bpy.context.object
    obj.name = "SmartPanelText_" + body.replace(" ", "_").replace("°", "deg")
    obj.data.body = body
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.data.size = s(size_in)
    obj.data.extrude = s(.012)
    obj.data.bevel_depth = s(.004)
    obj.data.materials.append(mat)
    move_to(obj, col)
    obj.parent = root
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def frustum(name, bottom_size, top_size, height, loc, mat, col, parent=None, bevel=.02):
    """Closed rectangular frustum for a clean, truly sloped hood canopy."""
    bw, bd = bottom_size[0] / 2, bottom_size[1] / 2
    tw, td = top_size[0] / 2, top_size[1] / 2
    z0, z1 = -height / 2, height / 2
    verts = [(-bw, -bd, z0), (bw, -bd, z0), (bw, bd, z0), (-bw, bd, z0),
             (-tw, -td, z1), (tw, -td, z1), (tw, td, z1), (-tw, td, z1)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    col.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("SoftEdges", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return obj


def tube_path(name, points, radius, mat, col, parent=None):
    curve = bpy.data.curves.new(name + "Curve", 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = point
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def add_top_text(root, col, mat, body, x, y, z, size_in=.7):
    """Horizontal mesh lettering for cooktops and other countertop appliances."""
    bpy.ops.object.text_add(location=(x, y, z))
    obj = bpy.context.object
    obj.name = "CooktopBrand_" + body.replace(" ", "_")
    obj.data.body = body
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.data.size = s(size_in)
    obj.data.extrude = s(.012)
    obj.data.bevel_depth = s(.004)
    obj.data.materials.append(mat)
    move_to(obj, col)
    obj.parent = root
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def add_appliance_pull(root, col, m, x, y, z, length_in, vertical=True, finish=None):
    """Commercial appliance pull with round grip and two projected standoffs."""
    finish = finish or m["steel"]
    radius = s(.32)
    length = s(length_in)
    if vertical:
        cylinder("AppliancePull", radius, length, (x, y, z), finish, col, root, vertices=32)
        for zz in (z - length * .38, z + length * .38):
            cylinder("PullStandoff", radius * .72, s(1.05), (x, y + s(.52), zz),
                     finish, col, root, rot=(math.pi / 2, 0, 0), vertices=24)
    else:
        cylinder("AppliancePull", radius, length, (x, y, z), finish, col, root,
                 rot=(0, math.pi / 2, 0), vertices=32)
        for xx in (x - length * .38, x + length * .38):
            cylinder("PullStandoff", radius * .72, s(1.05), (xx, y + s(.52), z),
                     finish, col, root, rot=(math.pi / 2, 0, 0), vertices=24)


def add_fridge_vent(root, col, m, w, y, z, count=12, span_in=3.0):
    slot_w = max(s(.35), (w - s(4)) / count * .58)
    start = -(count - 1) * (w - s(4)) / count / 2
    step = (w - s(4)) / count
    for i in range(count):
        box(f"VentSlot_{i+1}", (slot_w, s(.10), s(span_in)),
            (start + i * step, y, z), m["black"], col, root, .002)


def build_fridge(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    root["Construction"] = "model-specific refrigerator; standard North American appliance dimensions"
    exterior = m["blue"] if kind == "fridge-retro" else m["dark"] if kind == "fridge-smart" else m["steel"]
    front = -d / 2
    shell_bottom = s(.75)
    shell_h = h - shell_bottom
    # Complete insulated cabinet, rear condenser panel and serviceable compressor zone.
    box("InsulatedCabinet", (w - s(.6), d - s(1.1), shell_h),
        (0, s(.25), shell_bottom + shell_h / 2), exterior, col, root, .045)
    box("RearCondenserPanel", (w - s(2), s(.45), h - s(5)),
        (0, d / 2 - s(.3), h / 2 + s(1)), m["dark"], col, root, .008)
    box("CompressorServiceCover", (w * .72, s(.55), s(7.5)),
        (0, d / 2 - s(.62), s(4.5)), m["dark"], col, root, .015)
    add_leveling_feet(root, col, m, w, d)

    if kind == "fridge-retro":
        # FAB28-class compact: one rounded refrigerator door with internal freezer.
        door_y = front - s(.72)
        box("SingleRoundedDoor", (w - s(.55), s(1.35), h - s(1.35)),
            (0, door_y, h / 2 + s(.1)), exterior, col, root, .10)
        box("PerimeterDoorGasket", (w - s(1.25), s(.16), h - s(2.2)),
            (0, door_y + s(.72), h / 2 + s(.1)), m["gasket"], col, root, .012)
        box("TopCrown", (w - s(.8), s(1.45), s(1.1)),
            (0, door_y + s(.05), h - s(.7)), exterior, col, root, .08)
        add_appliance_pull(root, col, m, -w * .22, door_y - s(.9), h * .72, 11, False, m["chrome"])
        cylinder("UpperHingeCap", s(.45), s(.35), (w * .43, door_y - s(.35), h - s(.8)),
                 m["chrome"], col, root, rot=(math.pi / 2, 0, 0), vertices=28)
        add_kitchen_ai_badge(root, col, m, w * .16, door_y - s(.72), h * .84, 5.6, False)
        add_fridge_vent(root, col, m, w * .62, front - s(.05), s(1.5), 8, .55)
        return

    if kind == "fridge-single":
        # Full-height 30-inch single-door refrigerator with an internal freezer.
        # The exterior remains one uninterrupted door, unlike a top-freezer unit.
        door_y = front - s(.62)
        door_h = h - s(1.25)
        box("FullHeightSingleDoor", (w - s(.55), s(1.18), door_h),
            (0, door_y, s(.55) + door_h / 2), exterior, col, root, .05)
        box("SingleDoorPerimeterGasket", (w - s(1.2), s(.15), door_h - s(.75)),
            (0, door_y + s(.63), s(.55) + door_h / 2), m["gasket"], col, root, .012)
        # Professional vertical pull, hinge caps, upper status display and intake grille.
        add_appliance_pull(root, col, m, -w * .37, door_y - s(.82), h * .53, 26, True, m["steel"])
        for z, label in ((s(1.15), "LowerHingeCap"), (h - s(.7), "UpperHingeCap")):
            box(label, (s(2.2), s(.72), s(.55)),
                (w * .40, door_y + s(.10), z), m["dark"], col, root, .012)
        box("TemperatureStatusDisplay", (s(4.5), s(.14), s(1.25)),
            (w * .18, door_y - s(.64), h * .79), m["black"], col, root, .012)
        box("TemperatureReadout", (s(1.5), s(.04), s(.45)),
            (w * .18, door_y - s(.74), h * .79), m["screen"], col, root, .004)
        add_fridge_vent(root, col, m, w * .68, front - s(.04), s(1.35), 10, .6)
        add_kitchen_ai_badge(root, col, m, w * .18, door_y - s(.68), h * .88, 5.4, True)
        root["InteriorConfiguration"] = "single fresh-food door with internal freezer compartment"
        return

    if kind == "fridge-panel":
        # Flush 36 x 84 built-in with a top compressor grille and applied cabinetry panels.
        grille_h = s(5)
        freezer_h = s(20)
        reveal = s(.20)
        door_y = front - s(.62)
        box("TopCompressorGrille", (w - s(.5), s(1.0), grille_h),
            (0, door_y, h - grille_h / 2 - s(.25)), m["dark"], col, root, .012)
        add_fridge_vent(root, col, m, w - s(1.2), door_y - s(.53), h - grille_h / 2 - s(.25), 14, 2.6)
        fresh_bottom = freezer_h + reveal
        fresh_top = h - grille_h - reveal
        fresh_h = fresh_top - fresh_bottom
        each_w = (w - s(.65) - reveal) / 2
        for i, x in enumerate((-(each_w + reveal) / 2, (each_w + reveal) / 2), 1):
            add_shaker_panel(root, col, m, f"PanelReadyFreshDoor_{i}", x, door_y,
                             fresh_bottom + fresh_h / 2, each_w, fresh_h, bevel=.012)
            pull_x = x + (each_w * .38 if i == 1 else -each_w * .38)
            add_appliance_pull(root, col, m, pull_x, door_y - s(.72), fresh_bottom + fresh_h * .49, 24, True, m["steel"])
        drawer_h = (freezer_h - reveal * 2) / 2
        for i in range(2):
            z = reveal + drawer_h / 2 + i * (drawer_h + reveal)
            add_shaker_panel(root, col, m, f"PanelReadyFreezerDrawer_{i+1}", 0, door_y,
                             z, w - s(.65), drawer_h, bevel=.012, frame_in=1.75)
            add_appliance_pull(root, col, m, 0, door_y - s(.72), z + drawer_h * .22, 26, False, m["steel"])
        add_kitchen_ai_badge(root, col, m, 0, door_y - s(.58), h - grille_h / 2 - s(.25), 5.5, True)
        return

    # Freestanding French-door and smart four-door models.
    door_y = front - s(.60)
    reveal = s(.18)
    if kind == "fridge-smart":
        lower_h = s(24)
        upper_bottom = lower_h + reveal
        upper_h = h - upper_bottom - s(.55)
        each_w = (w - s(.55) - reveal) / 2
        for row, bottom, face_h in (("Upper", upper_bottom, upper_h), ("Flex", s(.55), lower_h - s(.55))):
            for i, x in enumerate((-(each_w + reveal) / 2, (each_w + reveal) / 2), 1):
                box(f"Smart{row}Door_{i}", (each_w, s(1.12), face_h),
                    (x, door_y, bottom + face_h / 2), exterior, col, root, .045)
        # 21.5-inch Family-Hub-class panel with a complete layered smart-home UI.
        screen_x = each_w * .53
        screen_z = upper_bottom + upper_h * .52
        box("SmartDisplayOuterBezel", (s(12.0), s(.22), s(24.0)),
            (screen_x, door_y - s(.66), screen_z), m["black"], col, root, .025)
        ui_y = door_y - s(.80)
        box("SmartDisplayActiveGlass", (s(10.9), s(.055), s(22.7)),
            (screen_x, ui_y, screen_z), m["dark"], col, root, .018)
        # Header: live clock, wireless indicator and Kitchen AI identity.
        box("StatusBar", (s(10.25), s(.035), s(1.35)),
            (screen_x, ui_y - s(.045), screen_z + s(10.25)), m["black"], col, root, .006)
        add_screen_text(root, col, m["white"], "10:24", screen_x - s(3.3), ui_y - s(.09), screen_z + s(10.25), .58)
        add_screen_text(root, col, m["screen"], "KITCHEN AI", screen_x, ui_y - s(.09), screen_z + s(10.25), .47)
        for i, hh in enumerate((.35, .55, .75)):
            box(f"WifiBar_{i+1}", (s(.22), s(.035), s(hh)),
                (screen_x + s(3.45 + i * .34), ui_y - s(.09), screen_z + s(10.15)), m["white"], col, root, .003)
        # Weather card with icon and readable current temperature.
        box("WeatherCard", (s(4.85), s(.04), s(5.0)),
            (screen_x - s(2.65), ui_y - s(.07), screen_z + s(6.7)), m["blue"], col, root, .016)
        cylinder("WeatherSun", s(.62), s(.04),
                 (screen_x - s(3.55), ui_y - s(.12), screen_z + s(7.65)), m["light"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=28)
        add_screen_text(root, col, m["white"], "72°", screen_x - s(2.25), ui_y - s(.13), screen_z + s(7.7), 1.15)
        add_screen_text(root, col, m["white"], "SUNNY", screen_x - s(2.65), ui_y - s(.13), screen_z + s(5.75), .43)
        # Refrigerator controls card.
        box("CoolingControlCard", (s(4.85), s(.04), s(5.0)),
            (screen_x + s(2.65), ui_y - s(.07), screen_z + s(6.7)), m["black"], col, root, .016)
        add_screen_text(root, col, m["screen"], "FRIDGE 37°", screen_x + s(2.65), ui_y - s(.13), screen_z + s(7.7), .57)
        add_screen_text(root, col, m["white"], "FREEZER 0°", screen_x + s(2.65), ui_y - s(.13), screen_z + s(6.55), .52)
        box("CoolingModeToggle", (s(3.25), s(.035), s(.70)),
            (screen_x + s(2.65), ui_y - s(.13), screen_z + s(5.45)), m["screen"], col, root, .12)
        cylinder("CoolingModeKnob", s(.27), s(.04),
                 (screen_x + s(3.65), ui_y - s(.17), screen_z + s(5.45)), m["white"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=24)
        # Calendar and family reminder card.
        box("FamilyCalendarCard", (s(10.25), s(.04), s(5.15)),
            (screen_x, ui_y - s(.07), screen_z + s(.95)), m["black"], col, root, .016)
        add_screen_text(root, col, m["screen"], "TODAY", screen_x - s(3.85), ui_y - s(.13), screen_z + s(2.55), .50)
        add_screen_text(root, col, m["white"], "6:00  DINNER", screen_x - s(1.85), ui_y - s(.13), screen_z + s(1.25), .48)
        add_screen_text(root, col, m["white"], "MILK  •  FRUIT  •  EGGS", screen_x, ui_y - s(.13), screen_z - s(.15), .40)
        box("CalendarAccent", (s(.32), s(.035), s(3.65)),
            (screen_x - s(4.75), ui_y - s(.13), screen_z + s(.85)), m["screen"], col, root, .04)
        # Four quick-action controls and lower navigation dock.
        for i, (label, dx) in enumerate((("ICE", -3.75), ("WATER", -1.25), ("VIEW", 1.25), ("HOME", 3.75)), 1):
            box(f"QuickAction_{i}", (s(2.15), s(.04), s(2.65)),
                (screen_x + s(dx), ui_y - s(.07), screen_z - s(3.65)), m["blue"] if i == 3 else m["black"], col, root, .018)
            cylinder(f"QuickActionIcon_{i}", s(.38), s(.04),
                     (screen_x + s(dx), ui_y - s(.13), screen_z - s(3.1)), m["screen"] if i != 3 else m["white"], col, root,
                     rot=(math.pi / 2, 0, 0), vertices=24)
            add_screen_text(root, col, m["white"], label, screen_x + s(dx), ui_y - s(.13), screen_z - s(4.25), .34)
        box("NavigationDock", (s(10.25), s(.04), s(2.1)),
            (screen_x, ui_y - s(.07), screen_z - s(9.25)), m["black"], col, root, .28)
        for i, dx in enumerate((-3.6, -1.8, 0, 1.8, 3.6), 1):
            cylinder(f"NavigationIcon_{i}", s(.27 if i != 3 else .38), s(.04),
                     (screen_x + s(dx), ui_y - s(.13), screen_z - s(9.25)), m["screen"] if i == 3 else m["white"], col, root,
                     rot=(math.pi / 2, 0, 0), vertices=20)
        cylinder("SmartCamera", s(.15), s(.07), (screen_x, ui_y - s(.13), screen_z + s(11.25)),
                 m["chrome"], col, root, rot=(math.pi / 2, 0, 0), vertices=20)
        for x in (-s(1.05), s(1.05)):
            box("IntegratedGrip", (s(.45), s(.28), s(17)), (x, door_y - s(.70), h * .56), m["black"], col, root, .06)
        add_fridge_vent(root, col, m, w * .72, front - s(.04), s(1.35), 11, .6)
        add_kitchen_ai_badge(root, col, m, -each_w * .52, door_y - s(.68), h * .88, 5.1, True)
        return

    freezer_h = s(20.5)
    fresh_bottom = freezer_h + reveal
    fresh_h = h - fresh_bottom - s(.55)
    each_w = (w - s(.55) - reveal) / 2
    for i, x in enumerate((-(each_w + reveal) / 2, (each_w + reveal) / 2), 1):
        box(f"FrenchDoor_{i}", (each_w, s(1.12), fresh_h),
            (x, door_y, fresh_bottom + fresh_h / 2), exterior, col, root, .045)
        pull_x = x + (each_w * .39 if i == 1 else -each_w * .39)
        add_appliance_pull(root, col, m, pull_x, door_y - s(.82), fresh_bottom + fresh_h * .51, 22, True, m["steel"])
        box(f"TopHingeCap_{i}", (s(2.4), s(.8), s(.55)),
            (x + (-each_w * .35 if i == 1 else each_w * .35), door_y + s(.15), h - s(.3)), m["dark"], col, root, .012)
    box("FreezerDrawerFace", (w - s(.55), s(1.12), freezer_h),
        (0, door_y, s(.55) + freezer_h / 2), exterior, col, root, .045)
    add_appliance_pull(root, col, m, 0, door_y - s(.82), freezer_h * .70, 27, False, m["steel"])
    # Recessed dispenser, paddle, nozzle and removable drip tray.
    dispenser_x = -each_w * .50
    dispenser_z = fresh_bottom + fresh_h * .50
    box("DispenserRecess", (s(8.0), s(.40), s(12.0)),
        (dispenser_x, door_y - s(.72), dispenser_z), m["black"], col, root, .035)
    box("WaterPaddle", (s(3.4), s(.18), s(5.5)),
        (dispenser_x, door_y - s(.96), dispenser_z - s(.7)), m["dark"], col, root, .015)
    cylinder("WaterNozzle", s(.16), s(1.0),
             (dispenser_x, door_y - s(.99), dispenser_z + s(3.8)), m["chrome"], col, root,
             rot=(math.pi / 2, 0, 0), vertices=20)
    box("DispenserDripTray", (s(6.4), s(.95), s(.35)),
        (dispenser_x, door_y - s(1.0), dispenser_z - s(4.7)), m["dark"], col, root, .015)
    add_fridge_vent(root, col, m, w * .72, front - s(.04), s(1.35), 11, .6)
    add_kitchen_ai_badge(root, col, m, each_w * .49, door_y - s(.68), h * .88, 5.1, True)


def add_range_grate(root, col, m, cx, cy, span_x, span_y, z):
    """Heavy continuous cast-iron grate with a removable center section."""
    rail = s(.34)
    for off in (-span_y * .43, 0, span_y * .43):
        box("CastIronGrateRail", (span_x, rail, rail), (cx, cy + off, z), m["dark"], col, root, .025)
    for off in (-span_x * .44, 0, span_x * .44):
        box("CastIronGrateCross", (rail, span_y, rail), (cx + off, cy, z), m["dark"], col, root, .025)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box("GrateFoot", (s(.46), s(.46), s(.28)),
                (cx + sx * span_x * .38, cy + sy * span_y * .38, z - s(.25)), m["rubber"], col, root, .018)


def add_sealed_burner(root, col, m, x, y, z, index, large=False):
    """Layered sealed burner with brass ports, cap, igniter and simmer ring."""
    scale = 1.18 if large else .92
    cylinder(f"BurnerBowl_{index}", s(2.55 * scale), s(.20), (x, y, z), m["steel"], col, root, vertices=40)
    torus(f"BurnerPortRing_{index}", s(1.78 * scale), s(.22), (x, y, z + s(.16)), m["brass"], col, root)
    cylinder(f"BurnerCap_{index}", s(1.42 * scale), s(.32), (x, y, z + s(.22)), m["dark"], col, root, vertices=40)
    cylinder(f"SimmerCap_{index}", s(.58 * scale), s(.36), (x, y, z + s(.29)), m["brass"], col, root, vertices=32)
    cylinder(f"SparkIgniter_{index}", s(.12), s(.42),
             (x + s(2.05 * scale), y, z + s(.28)), m["white"], col, root, vertices=14)
    for p in range(12):
        angle = p * math.tau / 12
        cylinder(f"FlamePort_{index}_{p+1}", s(.055), s(.10),
                 (x + math.cos(angle) * s(1.78 * scale),
                  y + math.sin(angle) * s(1.78 * scale), z + s(.31)),
                 m["black"], col, root, vertices=10)


def add_range_oven(root, col, m, x, width, d, bottom, top, door_y, label):
    """Complete oven bay with cavity, racks, convection fan and layered glass door."""
    cavity_h = top - bottom
    cavity_w = width - s(2.4)
    cavity_d = d - s(6.2)
    cavity_y = s(.65)
    liner_t = s(.55)
    # Five separate porcelain panels leave the front physically open.
    box(f"{label}_CavityBack", (cavity_w, liner_t, cavity_h),
        (x, cavity_y + cavity_d / 2 - liner_t / 2, bottom + cavity_h / 2),
        m["porcelain"], col, root, .018)
    for side, suffix in ((-1, "Left"), (1, "Right")):
        box(f"{label}_Cavity{suffix}", (liner_t, cavity_d, cavity_h),
            (x + side * (cavity_w / 2 - liner_t / 2), cavity_y, bottom + cavity_h / 2),
            m["porcelain"], col, root, .018)
    box(f"{label}_CavityFloor", (cavity_w - 2 * liner_t, cavity_d, liner_t),
        (x, cavity_y, bottom + liner_t / 2), m["porcelain"], col, root, .018)
    box(f"{label}_CavityCeiling", (cavity_w - 2 * liner_t, cavity_d, liner_t),
        (x, cavity_y, top - liner_t / 2), m["porcelain"], col, root, .018)
    for n, frac in enumerate((.22, .45, .68), 1):
        z = bottom + cavity_h * frac
        box(f"{label}_RackFrame_{n}", (cavity_w - s(1.6), d - s(8), s(.13)),
            (x, s(.2), z), m["rack"], col, root, .008)
        for off in (-.40, -.30, -.20, -.10, 0, .10, .20, .30, .40):
            box(f"{label}_RackWire_{n}", (s(.09), d - s(8.3), s(.09)),
                (x + (cavity_w - s(2.2)) * off, s(.2), z + s(.08)), m["rack"], col, root, .004)
        for side in (-1, 1):
            box(f"{label}_RackGuide_{n}_{'L' if side < 0 else 'R'}",
                (s(.24), d - s(7.4), s(.24)),
                (x + side * (cavity_w / 2 - s(.55)), s(.1), z), m["rack"], col, root, .006)
        box(f"{label}_RackFrontRail_{n}", (cavity_w - s(1.2), s(.34), s(.30)),
            (x, cavity_y - cavity_d / 2 + s(.72), z + s(.10)), m["rack"], col, root, .018)
    cylinder(f"{label}_ConvectionFan", min(cavity_w, cavity_h) * .18, s(.20),
             (x, d / 2 - s(3.6), bottom + cavity_h * .52), m["dark"], col, root,
             rot=(math.pi / 2, 0, 0), vertices=36)
    for i in range(8):
        angle = i * math.tau / 8
        box(f"{label}_FanBlade_{i+1}", (s(.28), s(.12), s(1.45)),
            (x + math.cos(angle) * s(.75), d / 2 - s(3.72),
             bottom + cavity_h * .52 + math.sin(angle) * s(.75)), m["aluminum"], col, root, .012)
    torus(f"{label}_RearHeatingElement", min(cavity_w, cavity_h) * .25, s(.12),
          (x, d / 2 - s(3.82), bottom + cavity_h * .52), m["aluminum"], col, root,
          rot=(math.pi / 2, 0, 0))
    box(f"{label}_InteriorLamp", (s(1.8), s(.18), s(1.0)),
        (x + cavity_w * .32, d / 2 - s(3.92), bottom + cavity_h * .78),
        m["light"], col, root, .08)
    box(f"{label}_InteriorTopLightStrip", (cavity_w - s(2.2), s(.22), s(.32)),
        (x, cavity_y - cavity_d / 2 + s(.45), top - s(.75)), m["light"], col, root, .06)
    face_h = cavity_h - s(.7)
    frame_w = width - s(.45)
    frame_rail = min(s(1.45), frame_w * .12, face_h * .16)
    frame_z = bottom + face_h / 2
    for side, suffix in ((-1, "Left"), (1, "Right")):
        box(f"{label}_DoorFrame{suffix}", (frame_rail, s(1.25), face_h),
            (x + side * (frame_w / 2 - frame_rail / 2), door_y, frame_z),
            m["steel"], col, root, .035)
    for side, suffix in ((-1, "Bottom"), (1, "Top")):
        box(f"{label}_DoorFrame{suffix}", (frame_w - 2 * frame_rail, s(1.25), frame_rail),
            (x, door_y, frame_z + side * (face_h / 2 - frame_rail / 2)),
            m["steel"], col, root, .035)
    visible_w = frame_w - 2 * frame_rail - s(.15)
    visible_h = face_h - 2 * frame_rail - s(.15)
    box(f"{label}_OuterTransparentGlass", (visible_w, s(.10), visible_h),
        (x, door_y - s(.68), frame_z), m["oven_glass"], col, root, .012)
    box(f"{label}_InnerTransparentGlass", (visible_w - s(.35), s(.08), visible_h - s(.35)),
        (x, door_y - s(.48), frame_z), m["oven_glass"], col, root, .010)
    # A thin dark ceramic border hides the glass seal without blocking the oven view.
    border = s(.30)
    for side in (-1, 1):
        box(f"{label}_GlassSealVertical", (border, s(.08), visible_h),
            (x + side * (visible_w / 2 - border / 2), door_y - s(.75), frame_z),
            m["gasket"], col, root, .006)
        box(f"{label}_GlassSealHorizontal", (visible_w, s(.08), border),
            (x, door_y - s(.75), frame_z + side * (visible_h / 2 - border / 2)),
            m["gasket"], col, root, .006)
    add_appliance_pull(root, col, m, x, door_y - s(.98), bottom + face_h * .89,
                       max(12, width * 12 - 5), False, m["steel"])
    for side in (-1, 1):
        cylinder(f"{label}_DoorHinge", s(.40), s(.85),
                 (x + side * (width / 2 - s(1.0)), door_y + s(.34), bottom + s(.8)),
                 m["dark"], col, root, rot=(math.pi / 2, 0, 0), vertices=20)


def build_range(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    root["Construction"] = "professional sealed-burner gas range"
    root["NominalCounterHeightIn"] = 36
    body_bottom = s(2.25)
    add_leveling_feet(root, col, m, w, d)
    box("InsulatedRangeBody", (w, d - s(.8), h - body_bottom),
        (0, s(.25), body_bottom + (h - body_bottom) / 2), m["steel"], col, root, .04)
    box("PorcelainCooktopWell", (w - s(.4), d - s(2.0), s(.72)),
        (0, s(.35), h - s(.35)), m["porcelain"], col, root, .025)
    box("FrontBullnoseTrim", (w, s(1.15), s(1.15)),
        (0, -d / 2 - s(.20), h - s(.40)), m["steel"], col, root, .08)
    box("RearIslandTrim", (w - s(.3), s(.72), s(2.15)),
        (0, d / 2 - s(.3), h + s(.55)), m["steel"], col, root, .025)
    is_36 = kind == "range-36-griddle"
    is_48 = kind == "range-48-griddle"
    cook_z = h + s(.18)
    front_y, rear_y = -d * .22, d * .20
    burner_positions = []
    if is_48:
        for x in (-w * .34, -w * .10, w * .14):
            burner_positions.extend(((x, front_y), (x, rear_y)))
        griddle_x, griddle_w = w * .375, w * .20
    elif is_36:
        for x in (-w * .33, w * .33):
            burner_positions.extend(((x, front_y), (x, rear_y)))
        griddle_x, griddle_w = 0, w * .24
    else:
        for x in (-w * .27, w * .27):
            burner_positions.extend(((x, front_y), (x, rear_y)))
        griddle_x = griddle_w = 0
    for i, (x, y) in enumerate(burner_positions, 1):
        add_sealed_burner(root, col, m, x, y, cook_z, i, i in {1, len(burner_positions)})
        add_range_grate(root, col, m, x, y, s(10.5), s(9.5), cook_z + s(.75))
    if is_36 or is_48:
        box("InfraredGriddlePlate", (griddle_w, d * .66, s(.58)),
            (griddle_x, -d * .01, cook_z + s(.30)), m["dark"], col, root, .06)
        box("GriddleGreaseChannel", (griddle_w - s(1.2), s(.75), s(.25)),
            (griddle_x, -d * .31, cook_z + s(.62)), m["black"], col, root, .06)
        box("RemovableGreaseTray", (griddle_w * .42, s(1.25), s(.42)),
            (griddle_x, -d * .35, cook_z + s(.35)), m["steel"], col, root, .03)
    panel_y = -d / 2 - s(.3)
    panel_h = s(7.25)
    box("ProfessionalControlPanel", (w - s(.35), s(.82), panel_h),
        (0, panel_y, h - panel_h / 2 - s(1.15)), m["steel"], col, root, .025)
    knobs = len(burner_positions) + (1 if is_36 or is_48 else 0)
    for i in range(knobs):
        x = -w * .40 + i * (w * .80 / max(1, knobs - 1))
        cylinder(f"ControlBezel_{i+1}", s(1.20), s(.18),
                 (x, panel_y - s(.48), h - s(4.65)), m["chrome"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=36)
        cylinder(f"RedControlKnob_{i+1}", s(.88), s(1.02),
                 (x, panel_y - s(.82), h - s(4.65)), m["red"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=36)
        box(f"KnobMarker_{i+1}", (s(.13), s(.10), s(.68)),
            (x, panel_y - s(1.36), h - s(4.25)), m["white"], col, root, .015)
    add_kitchen_ai_badge(root, col, m, 0, panel_y - s(.50), h - s(2.0),
                         7.2 if is_48 else 6.4, True)
    for i in range(9):
        box(f"ControlVent_{i+1}", (s(1.2), s(.08), s(.11)),
            (-w * .30 + i * w * .60 / 8, panel_y - s(.48), h - s(6.7)), m["dark"], col, root, .005)
    oven_bottom = s(4.0)
    oven_top = h - panel_h - s(1.5)
    door_y = -d / 2 - s(.72)
    if is_48:
        side_gap = s(.25)
        small_w = s(15.4)
        main_w = w - small_w - side_gap
        add_range_oven(root, col, m, -w / 2 + small_w / 2, small_w, d,
                       oven_bottom, oven_top, door_y, "CompanionOven")
        add_range_oven(root, col, m, w / 2 - main_w / 2, main_w, d,
                       oven_bottom, oven_top, door_y, "MainOven")
    else:
        add_range_oven(root, col, m, 0, w - s(.65), d,
                       oven_bottom, oven_top, door_y, "MainOven")
    box("RemovableKickplate", (w - s(.8), s(.65), s(2.3)),
        (0, -d / 2 - s(.12), s(1.65)), m["steel"], col, root, .025)
    add_fridge_vent(root, col, m, w - s(2.2), -d / 2 - s(.48), s(1.65),
                    12 if not is_48 else 18, .65)


def build_cooktop(kind, root, col, m, w, d, h):
    """Low-profile drop-in countertop cooktops with complete underside hardware."""
    root["Brand"] = "KITCHEN AI"
    root["Installation"] = "drop-in countertop cutout; nominal counter elevation 36 inches"
    root["DefaultElevationIn"] = 36
    induction = "induction" in kind
    electric = "electric" in kind
    top_z = h
    flange_t = s(.28)
    # The visible flange overlaps the cutout; the chassis drops below the counter.
    box("CountertopOverlapFlange", (w, d, flange_t), (0, 0, top_z - flange_t / 2),
        m["black"] if induction else m["steel"], col, root, .045)
    box("UndercounterChassis", (w - s(2.0), d - s(2.0), h - flange_t),
        (0, s(.15), (h - flange_t) / 2), m["dark"], col, root, .035)
    box("ElectricalJunctionBox", (s(4.8), s(3.3), s(1.8)),
        (w * .25, d * .24, s(.9)), m["dark"], col, root, .025)
    for x in (-w * .40, w * .40):
        for y in (-d * .38, d * .38):
            box("CounterMountClip", (s(1.5), s(.42), s(.65)),
                (x, y, h - s(.55)), m["steel"], col, root, .018)

    if induction or electric:
        glass_z = top_z + s(.08)
        box("CeramicGlassSurface", (w - s(.30), d - s(.30), s(.18)),
            (0, 0, glass_z), m["black"], col, root, .055)
        zones = (((-w * .25, d * .18, 4.2), (w * .25, d * .18, 3.4),
                  (-w * .25, -d * .17, 3.3), (w * .25, -d * .17, 4.5)) if induction else
                 ((-w * .32, d * .20, 3.5), (w * .32, d * .20, 3.0),
                  (-w * .32, -d * .17, 3.5), (w * .32, -d * .17, 4.0),
                  (0, d * .02, 4.6)))
        for i, (x, y, radius_in) in enumerate(zones, 1):
            torus(f"InductionZoneOuter_{i}", s(radius_in), s(.075),
                  (x, y, glass_z + s(.12)), m["heat"] if electric else m["aluminum"], col, root)
            torus(f"InductionZoneInner_{i}", s(radius_in * .72), s(.045),
                  (x, y, glass_z + s(.13)), m["heat"] if electric else m["screen"], col, root)
            if electric and i in {4, 5}:
                torus(f"RadiantZoneMiddle_{i}", s(radius_in * .48), s(.055),
                      (x, y, glass_z + s(.145)), m["heat"], col, root)
            for tick in range(4):
                angle = tick * math.pi / 2
                box(f"ZoneTick_{i}_{tick+1}", (s(.10), s(.55), s(.025)),
                    (x + math.cos(angle) * s(radius_in),
                     y + math.sin(angle) * s(radius_in), glass_z + s(.15)),
                    m["white"], col, root, .004)
        box("TouchControlPanel", (s(13.5), s(2.0), s(.10)),
            (0, -d * .38, glass_z + s(.14)), m["dark"], col, root, .025)
        for i in range(10):
            cylinder(f"PowerLevel_{i}", s(.16), s(.035),
                     (-s(4.0) + i * s(.88), -d * .38, glass_z + s(.21)),
                     m["screen"] if i < 6 else m["white"], col, root, vertices=18)
        add_top_text(root, col, m["screen"] if induction else m["white"],
                     "KITCHEN AI", 0, d * .42, glass_z + s(.18), .72)
        add_top_text(root, col, m["white"], "6", s(5.0), -d * .38, glass_z + s(.18), .72)
        if electric:
            add_top_text(root, col, m["heat"], "HOT SURFACE", -s(5.2), -d * .38,
                         glass_z + s(.18), .42)
            root["Power"] = "208/240V radiant electric; five heating elements"
        else:
            root["Power"] = "induction; four cooking zones"
        return

    # Gas inlet, stainless spill basin, five sealed burners and continuous grates.
    cylinder("GasInletHalfNPT", s(.34), s(1.45),
             (-w * .30, d * .25, s(.72)), m["brass"], col, root,
             rot=(math.pi / 2, 0, 0), vertices=24)
    basin_z = top_z + s(.10)
    box("SealedSpillBasin", (w - s(.35), d - s(.35), s(.20)),
        (0, 0, basin_z), m["steel"], col, root, .04)
    zones = ((-w * .31, d * .22), (w * .31, d * .22),
             (-w * .31, -d * .18), (w * .31, -d * .18), (0, d * .03))
    for i, (x, y) in enumerate(zones, 1):
        add_sealed_burner(root, col, m, x, y, basin_z + s(.12), i, i == 5)
    # Three removable grate modules allow pans to slide across the surface.
    module_w = (w - s(.8)) / 3
    for i, x in enumerate((-module_w, 0, module_w), 1):
        add_range_grate(root, col, m, x, d * .02, module_w - s(.25), d - s(2.0), basin_z + s(.82))
    knob_y = -d * .38
    for i in range(5):
        x = -s(5.1) + i * s(2.55)
        cylinder(f"CooktopKnobBezel_{i+1}", s(.72), s(.12),
                 (x, knob_y, basin_z + s(.34)), m["chrome"], col, root, vertices=32)
        cylinder(f"CooktopKnob_{i+1}", s(.52), s(.68),
                 (x, knob_y, basin_z + s(.70)), m["red"], col, root, vertices=32)
        box(f"CooktopKnobMarker_{i+1}", (s(.10), s(.55), s(.06)),
            (x, knob_y - s(.20), basin_z + s(1.06)), m["white"], col, root, .01)
    add_top_text(root, col, m["black"], "KITCHEN AI", 0, -d * .46, basin_z + s(.32), .70)
    root["Fuel"] = "natural gas / LP convertible; five sealed burners"


def add_hood_filter(root, col, m, x, y, z, width, depth, index):
    box(f"GreaseFilterFrame_{index}", (width, depth, s(.32)),
        (x, y, z), m["aluminum"], col, root, .025)
    for i in range(9):
        xx = x - width * .40 + i * width * .10
        box(f"FilterBaffle_{index}_{i+1}", (s(.18), depth - s(.45), s(.18)),
            (xx, y, z - s(.20)), m["steel"], col, root, .012)


def build_hood(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    root["Venting"] = "ducted / recirculating convertible"
    root["RecommendedClearance"] = "24 inches electric; 27-30 inches gas"
    undercab = "undercab" in kind
    chimney = "chimney" in kind
    pro = "pro" in kind
    canopy_h = h if undercab else s(10.75) if chimney else h
    # Canopy shell: slim under-cabinet, stepped pyramid chimney, or deep pro box.
    if chimney:
        frustum("StandardPyramidCanopy", (w, d), (s(13.2), s(10.8)), canopy_h,
                (0, 0, canopy_h / 2), m["steel"], col, root, .035)
        box("CanopyBottomLip", (w, d, s(.55)), (0, 0, s(.275)),
            m["steel"], col, root, .045)
        box("CanopyTopTransition", (s(13.5), s(11.1), s(.55)),
            (0, 0, canopy_h - s(.275)), m["steel"], col, root, .025)
        duct_h = h - canopy_h
        box("LowerTelescopicChimney", (s(13.2), s(10.8), duct_h * .62),
            (0, 0, canopy_h + duct_h * .31), m["steel"], col, root, .025)
        box("UpperTelescopicChimney", (s(12.5), s(10.1), duct_h * .58),
            (0, 0, canopy_h + duct_h * .71), m["aluminum"], col, root, .025)
    else:
        box("HoodCanopyShell", (w, d, canopy_h), (0, 0, canopy_h / 2),
            m["steel"], col, root, .06 if pro else .035)
        if pro:
            box("ProfessionalFrontApron", (w, s(1.1), h * .72),
                (0, -d / 2 - s(.35), h * .55), m["steel"], col, root, .05)
    # Underside plenum, washable baffle filters and task lights.
    underside_z = s(.20)
    box("BlackAirPlenum", (w - s(1.0), d - s(1.0), s(.28)),
        (0, 0, underside_z), m["black"], col, root, .025)
    filter_count = 4 if pro else 3 if w > s(32) else 2
    usable_w = w - s(3.0)
    fw = usable_w / filter_count - s(.35)
    for i in range(filter_count):
        x = -usable_w / 2 + fw / 2 + s(.17) + i * (fw + s(.35))
        add_hood_filter(root, col, m, x, s(.5), underside_z - s(.12), fw, d * .56, i + 1)
    for x in (-w * .36, w * .36):
        cylinder("WarmTaskLight", s(1.05), s(.12),
                 (x, -d * .34, underside_z - s(.28)), m["light"], col, root, vertices=32)
    # Integrated centrifugal blower, damper and standard round duct collar.
    blower_z = min(h - s(2.5), canopy_h * .58)
    cylinder("CentrifugalBlower", min(w, d) * .18, s(3.2),
             (0, s(.8), blower_z), m["dark"], col, root,
             rot=(0, math.pi / 2, 0), vertices=40)
    cylinder("RoundDuctCollar", s(4.0 if not undercab else 3.5), s(1.5),
             (0, s(.8), h + s(.75)), m["steel"], col, root, vertices=40)
    box("BackdraftDamper", (s(6.8), s(.24), s(1.0)),
        (0, s(.8), h + s(.8)), m["aluminum"], col, root, .025)
    # Front controls and prominent Kitchen AI badge.
    front_y = -d / 2 - s(.28)
    control_z = min(h - s(1.15), s(3.5))
    box("TouchControlStrip", (s(12), s(.22), s(1.4)),
        (0, front_y, control_z), m["black"], col, root, .025)
    for i in range(6):
        cylinder(f"HoodControl_{i+1}", s(.18), s(.08),
                 (-s(3.1) + i * s(1.25), front_y - s(.15), control_z),
                 m["screen"] if i in {1, 2, 3} else m["white"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=18)
    add_kitchen_ai_badge(root, col, m, 0, front_y - s(.10),
                         min(h - s(1.0), control_z + s(1.45)), 7.0 if pro else 6.0, True)


def build_dishwasher(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    root["Installation"] = "built-in undercounter dishwasher"
    panel_ready = kind == "dishwasher-panel"
    compact = kind == "dishwasher-compact"
    toe_h = s(4.0)
    box("DishwasherChassis", (w - s(.5), d - s(.8), h - toe_h),
        (0, s(.25), toe_h + (h - toe_h) / 2), m["dark"], col, root, .035)
    # Stainless tub with rear, sides and floor; front remains serviceable.
    tub_w, tub_d, tub_h = w - s(2.0), d - s(3.0), h - toe_h - s(4.0)
    box("TubBack", (tub_w, s(.35), tub_h), (0, d / 2 - s(2.0), toe_h + tub_h / 2), m["steel"], col, root, .018)
    for side in (-1, 1):
        box("TubSide", (s(.35), tub_d, tub_h),
            (side * (tub_w / 2 - s(.18)), s(.1), toe_h + tub_h / 2), m["steel"], col, root, .018)
    box("TubFloor", (tub_w, tub_d, s(.35)), (0, s(.1), toe_h + s(.2)), m["steel"], col, root, .018)
    # Three loading levels (two for compact), rails, tines and spray system.
    levels = (.32, .60, .82) if not compact else (.38, .70)
    for n, frac in enumerate(levels, 1):
        z = toe_h + tub_h * frac
        box(f"RackFrame_{n}", (tub_w - s(1), tub_d - s(1), s(.16)), (0, s(.05), z), m["rack"], col, root, .008)
        for i in range(8):
            x = -tub_w * .38 + i * tub_w * .76 / 7
            box(f"RackTine_{n}_{i+1}", (s(.10), s(.10), s(4.2)),
                (x, s(.1), z + s(2.0)), m["rack"], col, root, .01)
    cylinder("SumpFilter", s(2.0), s(.45), (0, s(.2), toe_h + s(.5)), m["dark"], col, root, vertices=36)
    for n, z in enumerate((toe_h + s(1.2), toe_h + tub_h * .50), 1):
        box(f"SprayArm_{n}", (tub_w * .72, s(.55), s(.20)), (0, s(.1), z), m["aluminum"], col, root, .08)
        cylinder(f"SprayHub_{n}", s(.48), s(.28), (0, s(.1), z), m["dark"], col, root, vertices=24)
    face_y = -d / 2 - s(.62)
    door_h = h - toe_h - s(.35)
    if panel_ready:
        add_shaker_panel(root, col, m, "PanelReadyDishwasherDoor", 0, face_y,
                         toe_h + door_h / 2, w - s(.35), door_h, bevel=.012)
        add_appliance_pull(root, col, m, 0, face_y - s(.75), h - s(3.5), 18, False, m["steel"])
    else:
        box("StainlessDishwasherDoor", (w - s(.35), s(1.15), door_h),
            (0, face_y, toe_h + door_h / 2), m["steel"], col, root, .045)
        add_appliance_pull(root, col, m, 0, face_y - s(.78), h - s(3.2), 16 if compact else 20, False, m["steel"])
    box("TopControlStrip", (w - s(.8), s(.18), s(1.5)),
        (0, face_y - s(.62), h - s(1.1)), m["black"], col, root, .018)
    for i in range(6):
        cylinder(f"DishwasherControl_{i+1}", s(.16), s(.06),
                 (-w * .25 + i * w * .10, face_y - s(.74), h - s(1.1)),
                 m["screen"] if i == 4 else m["white"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=16)
    add_kitchen_ai_badge(root, col, m, 0, face_y - s(.70), toe_h + s(2.0),
                         8.0 if not compact else 6.5, True, 1.35)
    box("AdjustableToeKick", (w - s(.6), s(.75), toe_h),
        (0, -d / 2 + s(2.0), toe_h / 2), m["dark"], col, root, .025)
    add_leveling_feet(root, col, m, w, d)


def build_sink(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    mat = m["white"] if kind == "sink-farmhouse" else m["steel"]
    rim = s(.55)
    wall = s(.55)
    divider = s(1.0) if kind == "sink-double" else 0
    # Open-top bowl with sloped-looking stepped walls and real drain hardware.
    box("SinkBottom", (w - 2 * wall, d - 2 * wall, wall), (0, 0, wall / 2), mat, col, root, .10)
    for side in (-1, 1):
        box("SinkSideWall", (wall, d, h), (side * (w / 2 - wall / 2), 0, h / 2), mat, col, root, .12)
        box("SinkFrontBackWall", (w - 2 * wall, wall, h), (0, side * (d / 2 - wall / 2), h / 2), mat, col, root, .12)
    box("SinkRimFront", (w, rim, rim), (0, -d / 2, h), mat, col, root, .08)
    box("SinkRimBack", (w, rim, rim), (0, d / 2, h), mat, col, root, .08)
    for side in (-1, 1):
        box("SinkRimSide", (rim, d, rim), (side * w / 2, 0, h), mat, col, root, .08)
    drains = (-w * .25, w * .25) if kind == "sink-double" else (w * .22,)
    if divider:
        box("LowBowlDivider", (divider, d - s(1.1), h * .72), (0, 0, h * .36), mat, col, root, .08)
    for i, x in enumerate(drains, 1):
        cylinder(f"DrainFlange_{i}", s(1.94), s(.20), (x, 0, s(.68)), m["chrome"], col, root, vertices=40)
        cylinder(f"DrainBasket_{i}", s(1.25), s(.28), (x, 0, s(.72)), m["dark"], col, root, vertices=32)
    if kind == "sink-farmhouse":
        box("ApronFront", (w, s(1.2), h + s(4.5)),
            (0, -d / 2 - s(.35), (h + s(4.5)) / 2), mat, col, root, .14)
        add_kitchen_ai_badge(root, col, m, 0, -d / 2 - s(1.0), h * .55, 7.5, True, 1.35)


def build_faucet(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    if kind == "faucet-pot-filler":
        cylinder("WallEscutcheon", s(2.0), s(.45), (0, 0, h * .55), m["chrome"], col, root,
                 rot=(math.pi / 2, 0, 0), vertices=36)
        tube_path("ArticulatingPotFiller", [(0, 0, h * .55), (w * .28, 0, h * .62),
                  (w * .48, 0, h * .78), (w * .42, -d * .25, h * .42)], s(.32), m["chrome"], col, root)
        for x, z in ((w * .12, h * .60), (w * .38, h * .73)):
            cylinder("ValveHandle", s(.20), s(3.2), (x, -s(.25), z), m["chrome"], col, root,
                     rot=(0, math.pi / 2, 0), vertices=24)
        return
    pro = kind == "faucet-pro"
    base_z = s(.4)
    cylinder("FaucetEscutcheon", s(1.35), s(.35), (0, 0, s(.18)), m["chrome"], col, root, vertices=36)
    cylinder("FaucetBody", s(.68), h * .42, (0, 0, base_z + h * .21), m["chrome"], col, root, vertices=36)
    reach = d * .88
    tube_path("HighArcSpout", [(0, 0, h * .38), (0, 0, h * .82),
              (0, -reach * .55, h * .98), (0, -reach, h * .55)], s(.34 if pro else .28), m["chrome"], col, root)
    cylinder("PullDownSprayHead", s(.52), s(4.0 if pro else 3.2),
             (0, -reach, h * .43), m["dark"], col, root, vertices=32)
    cylinder("SideLever", s(.18), s(4.0), (s(1.3), 0, h * .34), m["chrome"], col, root,
             rot=(0, math.pi / 2, 0), vertices=24)
    add_kitchen_ai_badge(root, col, m, 0, s(.55), h * .22, 4.5, True, 1.0)


def build_sink_accessory(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    if kind == "sink-accessory-disposal":
        cylinder("SinkMountFlange", w * .31, s(.65), (0, 0, h - s(.33)), m["chrome"], col, root, vertices=40)
        cylinder("QuickLockMount", w * .39, s(1.45), (0, 0, h - s(1.35)), m["aluminum"], col, root, vertices=36)
        cylinder("GrindingChamber", w * .47, h * .52, (0, 0, h * .57), m["dark"], col, root, vertices=48)
        cylinder("MotorHousing", w * .42, h * .33, (0, 0, h * .25), m["black"], col, root, vertices=48)
        cylinder("DischargeElbow", s(.78), s(4.2), (w * .42, 0, h * .48), m["white"], col, root,
                 rot=(0, math.pi / 2, 0), vertices=28)
        cylinder("DishwasherInlet", s(.38), s(1.8), (-w * .43, 0, h * .66), m["white"], col, root,
                 rot=(0, math.pi / 2, 0), vertices=24)
        add_kitchen_ai_badge(root, col, m, 0, -w * .48, h * .48, 5.6, True, 1.15)
    elif kind == "sink-accessory-strainer":
        cylinder("StrainerFlange", w * .48, s(.22), (0, 0, h - s(.12)), m["chrome"], col, root, vertices=48)
        cylinder("BasketCup", w * .32, h * .62, (0, 0, h * .60), m["steel"], col, root, vertices=40)
        for i in range(16):
            angle = i * math.tau / 16
            cylinder(f"BasketHole_{i+1}", s(.09), s(.18),
                     (math.cos(angle) * w * .23, math.sin(angle) * d * .23, h * .72),
                     m["black"], col, root, vertices=10)
        cylinder("DrainTailpiece", s(.72), h * .34, (0, 0, h * .17), m["chrome"], col, root, vertices=32)
    elif kind == "sink-accessory-soap":
        cylinder("SoapBottle", w * .40, h * .64, (0, 0, h * .32), m["glass"], col, root, vertices=36)
        cylinder("PumpStem", s(.20), h * .31, (0, 0, h * .80), m["chrome"], col, root, vertices=24)
        cylinder("CounterEscutcheon", w * .45, s(.20), (0, 0, h * .66), m["chrome"], col, root, vertices=32)
        tube_path("SoapPumpSpout", [(0, 0, h * .90), (0, -d * .22, h * .96),
                  (0, -d * .42, h * .90)], s(.20), m["chrome"], col, root)
        box("PumpButton", (s(1.4), s(2.0), s(.35)), (0, -d * .08, h * .96), m["chrome"], col, root, .12)
    else:
        cylinder("AirGapBody", w * .34, h * .72, (0, 0, h * .36), m["dark"], col, root, vertices=32)
        cylinder("AirGapCap", w * .49, h * .30, (0, 0, h * .84), m["chrome"], col, root, vertices=36)
        for side in (-1, 1):
            cylinder("AirGapHosePort", s(.28), s(1.1), (side * w * .35, 0, h * .30),
                     m["white"], col, root, rot=(0, math.pi / 2, 0), vertices=20)


def build_microwave(kind, root, col, m, w, d, h):
    root["Brand"] = "KITCHEN AI"
    root["CookingTechnology"] = "microwave inverter / sensor cooking"
    if kind == "microwave-drawer":
        # 24-inch built-in auto drawer: the front overlaps a narrower 21-7/8 body.
        body_w = s(21.875)
        face_y = -d / 2 - s(.72)
        box("DrawerMicrowaveChassis", (body_w, d, h - s(.6)),
            (0, 0, h / 2), m["dark"], col, root, .035)
        box("DrawerMicrowaveCavity", (body_w - s(2.0), d - s(3.4), h - s(4.8)),
            (0, -s(.15), h * .42), m["white"], col, root, .025)
        box("AutoDrawerFront", (w, s(1.45), h - s(4.3)),
            (0, face_y, (h - s(4.3)) / 2), m["steel"], col, root, .045)
        box("DrawerWindowBlackGlass", (w - s(2.2), s(.16), h - s(7.0)),
            (0, face_y - s(.78), h * .38), m["black"], col, root, .025)
        box("UpperControlFascia", (w, s(1.25), s(4.0)),
            (0, face_y, h - s(2.0)), m["black"], col, root, .035)
        add_appliance_pull(root, col, m, 0, face_y - s(.85), h - s(5.0), 19, False, m["steel"])
        box("DrawerDigitalDisplay", (s(5.2), s(.10), s(1.1)),
            (-w * .21, face_y - s(.70), h - s(2.0)), m["screen"], col, root, .012)
        add_screen_text(root, col, m["white"], "1:20", -w * .21,
                        face_y - s(.79), h - s(2.0), .55)
        for i, label in enumerate(("OPEN", "START", "STOP"), 1):
            x = w * .02 + i * s(3.0)
            cylinder(f"DrawerTouchKey_{label}", s(.34), s(.08),
                     (x, face_y - s(.70), h - s(2.0)), m["screen"] if label == "START" else m["white"],
                     col, root, rot=(math.pi / 2, 0, 0), vertices=20)
        add_kitchen_ai_badge(root, col, m, 0, face_y - s(.70), s(1.85), 9.0, True, 1.5)
        box("AntiTipBracket", (body_w - s(1.0), s(.65), s(1.8)),
            (0, d / 2 - s(.45), h - s(1.2)), m["steel"], col, root, .018)
        root["Installation"] = "24-inch base cabinet; anti-tip block required"
        return
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
    add_kitchen_ai_badge(root, col, m, -panel_w / 2, y - s(.62), h * .87,
                         9.0 if kind == "microwave" else 10.0, True, 1.5)
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
    elif kind.startswith("cooktop"):
        build_cooktop(kind, root, col, m, w, d, h)
    elif kind.startswith("hood"):
        build_hood(kind, root, col, m, w, d, h)
    elif kind.startswith("dishwasher"):
        build_dishwasher(kind, root, col, m, w, d, h)
    elif kind.startswith("sink"):
        build_sink(kind, root, col, m, w, d, h)
    elif kind.startswith("faucet"):
        build_faucet(kind, root, col, m, w, d, h)
    elif kind.startswith("sink-accessory"):
        build_sink_accessory(kind, root, col, m, w, d, h)
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
        if category == "cooktops":
            display_z = s(36)
        if category == "hoods":
            display_z = s(54)
        if category in {"sinks", "faucets"}:
            display_z = s(30)
        if category == "sink-accessories":
            display_z = s(30)
        root.location = (i % columns * x_step, i // columns * y_step, display_z)
        if category in {"lowers", "tall"}:
            box(f"Plinth_{i+1}", (4.3, 4.6, s(.75)),
                (root.location.x, root.location.y, -s(.375)), m["edge"], col, None, .006)
        if category == "cooktops":
            box(f"CooktopDisplayBase_{i+1}", (4.2, 3.6, s(35.5)),
                (root.location.x, root.location.y, s(17.75)), m["cab"], col, None, .02)
            box(f"CooktopDisplayCounter_{i+1}", (4.6, 4.0, s(.75)),
                (root.location.x, root.location.y, s(35.625)), m["edge"], col, None, .025)
    center_x = (columns - 1) * x_step / 2
    center_y = (rows - 1) * y_step / 2
    bpy.ops.object.camera_add(location=(center_x, -34, 31))
    cam = bpy.context.object
    move_to(cam, col)
    bpy.context.scene.camera = cam
    target = (center_x, center_y + 2, 2.6)
    cam.rotation_euler = Vector((target[0]-cam.location.x, target[1]-cam.location.y, target[2]-cam.location.z)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 54
    for index, (loc, energy, size, color) in enumerate([
        ((2, -10, 18), 2150, 11, (1.0, .91, .78)),
        ((25, 6, 23), 1800, 13, (.82, .91, 1.0)),
        ((8, 34, 22), 1650, 14, (1.0, .95, .88)),
        ((13, -4, 8), 900, 9, (.76, .88, 1.0)),
    ]):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.name = f"ShowroomKeyLight_{index+1}"
        move_to(light, col)
        light.data.energy = energy
        light.data.size = size
        light.data.color = color
        light.rotation_euler = Vector((target[0]-loc[0], target[1]-loc[1], target[2]-loc[2])).to_track_quat('-Z', 'Y').to_euler()
    scene = bpy.context.scene
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world.color = (.060, .066, .072)
    scene.view_settings.exposure = .20


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
