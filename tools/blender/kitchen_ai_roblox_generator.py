"""Kitchen AI -> Blender -> Roblox compact generator.
Blender 5.2 compatible. Builds 39 catalog models and exports GLB files.
Scale: 1 Blender unit = 1 Roblox stud = 12 inches.
"""
from __future__ import annotations

from pathlib import Path
import json
import math
import traceback
import bpy

OUT = Path.home() / "Documents" / "KitchenAI_Roblox_Exports"
IN_PER_STUD = 12.0
EXPORT_GLB = True
ADD_SHOWROOM = True

# id, category, kind, width in, depth in, height in, default elevation in
CATALOG = [
("lower-base-12","lowers","base",12,24,34.5,0),("lower-base-18","lowers","base",18,24,34.5,0),
("lower-base-24","lowers","base",24,24,34.5,0),("lower-base-30","lowers","base",30,24,34.5,0),
("lower-base-36","lowers","base",36,24,34.5,0),("lower-drawer-18","lowers","drawers",18,24,34.5,0),
("lower-drawer-24","lowers","drawers",24,24,34.5,0),("lower-drawer-30","lowers","drawers",30,24,34.5,0),
("lower-drawer-36","lowers","drawers",36,24,34.5,0),("lower-sink-30","lowers","sink",30,24,34.5,0),
("lower-sink-33","lowers","sink",33,24,34.5,0),("lower-sink-36","lowers","sink",36,24,34.5,0),
("lower-corner-36","lowers","corner",36,36,34.5,0),
("upper-wall-12x30","uppers","upper",12,12,30,54),("upper-wall-18x30","uppers","upper",18,12,30,54),
("upper-wall-24x30","uppers","upper",24,12,30,54),("upper-wall-30x30","uppers","upper",30,12,30,54),
("upper-wall-36x30","uppers","upper",36,12,30,54),("upper-wall-24x36","uppers","upper",24,12,36,54),
("upper-wall-30x36","uppers","upper",30,12,36,54),("upper-wall-36x36","uppers","upper",36,12,36,54),
("upper-glass-24x30","uppers","glass",24,12,30,54),("upper-glass-30x30","uppers","glass",30,12,30,54),
("upper-glass-36x30","uppers","glass",36,12,30,54),
("tall-pantry-18x84","tall","tall",18,24,84,0),("tall-pantry-24x84","tall","tall",24,24,84,0),
("tall-pantry-30x84","tall","tall",30,24,84,0),("tall-utility-24x84","tall","tall",24,24,84,0),
("tall-oven-30x84","tall","oven-tower",30,24,84,0),("tall-fridge-surround-36x84","tall","fridge-surround",36,24,84,0),
("refrigerator-french-door-stainless","refrigerators","fridge-french",36,30,70,0),
("refrigerator-panel-ready-built-in","refrigerators","fridge-panel",36,24,84,0),
("refrigerator-smart-black","refrigerators","fridge-smart",36,30,70,0),
("refrigerator-retro-blue","refrigerators","fridge-retro",24,26,63,0),
("gas-range-32-4-burner","gas-ranges","range",32,28,36,0),
("gas-range-36-4-burner-griddle","gas-ranges","range-griddle",36,28,36,0),
("gas-range-42-4-burner-griddle","gas-ranges","range-griddle",42,28,36,0),
("microwave-countertop-24-stainless","microwaves","microwave",24,18,14,36),
("microwave-over-range-30-stainless","microwaves","microwave-otr",30,16,16.5,54),
]


def s(inches): return float(inches) / IN_PER_STUD


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for c in list(bpy.data.collections):
        if c.name != "Collection": bpy.data.collections.remove(c)


def make_mat(name, color, metallic=0.0, roughness=0.45, alpha=1.0, emission=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    h = color.lstrip('#')
    rgba = tuple(int(h[i:i+2], 16)/255 for i in (0,2,4)) + (alpha,)
    m.diffuse_color = rgba
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        e = emission.lstrip('#')
        ergb = tuple(int(e[i:i+2],16)/255 for i in (0,2,4)) + (1,)
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = ergb
            bsdf.inputs["Emission Strength"].default_value = 2.0
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
    return m


def materials():
    return {
        "cab": make_mat("Cabinet Warm White", "#E8E3D8", 0.0, .42),
        "wood": make_mat("Wood Interior", "#B98556", 0.0, .55),
        "glass": make_mat("Glass", "#9BC7D8", .05, .12, .36),
        "steel": make_mat("Brushed Stainless", "#AEB6B8", .88, .28),
        "dark": make_mat("Dark Metal", "#252A2B", .55, .25),
        "black": make_mat("Black Glass", "#111416", .22, .08),
        "blue": make_mat("Retro Blue", "#9FCBE4", .05, .26),
        "screen": make_mat("Display", "#57C9E3", .05, .08, 1, "#57C9E3"),
        "brass": make_mat("Burner Brass", "#B68A45", .8, .3),
        "light": make_mat("Warm Light", "#F7E8B4", 0, .18, 1, "#F7E8B4"),
        "floor": make_mat("Showroom Floor", "#CBD3D1", 0, .78),
    }


def move_to(obj, col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)


def cube(name, size, loc, mat, col, parent=None, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object; o.name = name
    o.scale = (size[0]/2, size[1]/2, size[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to(o, col)
    if parent: o.parent = parent
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new("Soft edges", 'BEVEL'); mod.width = min(bevel, min(size)*.2); mod.segments = 2
    return o


def cyl(name, radius, depth, loc, mat, col, parent=None, rot=(0,0,0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; move_to(o,col)
    if parent: o.parent=parent
    o.data.materials.append(mat)
    return o


def root_for(model_id, category, w, d, h, elev):
    col=bpy.data.collections.new(model_id); bpy.context.scene.collection.children.link(col)
    root=bpy.data.objects.new(model_id, None); col.objects.link(root)
    root["ProductId"]=model_id; root["Category"]=category
    root["WidthIn"]=w; root["DepthIn"]=d; root["HeightIn"]=h; root["DefaultElevationIn"]=elev
    root["WidthStuds"]=s(w); root["DepthStuds"]=s(d); root["HeightStuds"]=s(h)
    return col, root


def doors(root,col,m,w,d,h,count=2,glass=False,bottom=0,top=None):
    top = h if top is None else top
    face_h=max(.15, top-bottom-.10); gap=.035
    door_w=(w-gap*(count+1))/count
    y=-d/2-.035
    for i in range(count):
        x=-w/2+gap+door_w/2+i*(door_w+gap)
        cube(f"Door_{i+1}",(door_w,.055,face_h),(x,y,bottom+face_h/2),m["glass"] if glass else m["cab"],col,root,.015)
        hx=x+(door_w*.32 if i < count/2 else -door_w*.32)
        cube(f"Handle_{i+1}",(.045,.07,min(.85,face_h*.55)),(hx,y-.065,bottom+face_h*.56),m["steel"],col,root,.01)


def cabinet_shell(root,col,m,w,d,h,toe=False):
    p=.055; back=.025; base=TOE if toe else 0
    cube("LeftSide",(p,d,h-base),(-w/2+p/2,0,base+(h-base)/2),m["cab"],col,root)
    cube("RightSide",(p,d,h-base),(w/2-p/2,0,base+(h-base)/2),m["cab"],col,root)
    cube("Bottom",(w-2*p,d,p),(0,0,base+p/2),m["cab"],col,root)
    cube("Top",(w-2*p,d,p),(0,0,h-p/2),m["cab"],col,root)
    cube("Back",(w-2*p,back,h-base),(0,d/2-back/2,base+(h-base)/2),m["wood"],col,root,.005)
    if toe: cube("ToeKick",(w,d-.25,TOE),(0,.125,TOE/2),m["dark"],col,root,.01)


TOE=s(4)

def build_cabinet(kind,root,col,m,w,d,h):
    toe=kind in {"base","drawers","sink","corner","tall","oven-tower","fridge-surround"}
    cabinet_shell(root,col,m,w,d,h,toe)
    if kind=="drawers":
        y=-d/2-.035; usable=h-TOE-.12
        for i in range(3):
            fh=usable/3-.025; z=TOE+.06+fh/2+i*(usable/3)
            cube(f"Drawer_{i+1}",(w-.12,.055,fh),(0,y,z),m["cab"],col,root,.015)
            cube(f"Pull_{i+1}",(min(w*.58,1.4),.07,.045),(0,y-.065,z+fh*.22),m["steel"],col,root,.01)
    elif kind=="sink": doors(root,col,m,w,d,h,2,False,TOE+.05,h-.05)
    elif kind=="corner":
        cube("CornerReturn",(d*.45,w,.055),(w/2-d*.225,-d/2-.035,h*.52),m["cab"],col,root,.015)
        doors(root,col,m,w*.55,d,h,1,False,TOE+.05,h-.05)
    elif kind in {"upper","glass"}: doors(root,col,m,w,d,h,2 if w>=2 else 1,kind=="glass",.05,h-.05)
    elif kind=="tall": doors(root,col,m,w,d,h,2 if w>=2 else 1,False,TOE+.05,h-.05)
    elif kind=="oven-tower":
        doors(root,col,m,w,d,h,2,False,TOE+.05,h*.47)
        cube("BuiltInOven",(w-.18,.12,h*.30),(0,-d/2-.08,h*.65),m["black"],col,root,.025)
        cube("OvenHandle",(w*.65,.08,.05),(0,-d/2-.16,h*.77),m["steel"],col,root,.01)
        doors(root,col,m,w,d,h,2,False,h*.82,h-.05)
    elif kind=="fridge-surround":
        cube("LeftColumn",(.12,d,h-TOE),(-w/2+.06,0,TOE+(h-TOE)/2),m["cab"],col,root)
        cube("RightColumn",(.12,d,h-TOE),(w/2-.06,0,TOE+(h-TOE)/2),m["cab"],col,root)
        doors(root,col,m,w,d,h,2,False,h*.79,h-.05)
    else: doors(root,col,m,w,d,h,2 if w>=2 else 1,False,TOE+.05,h-.05)


def build_fridge(kind,root,col,m,w,d,h):
    body=m["blue"] if kind=="fridge-retro" else m["dark"] if kind=="fridge-smart" else m["steel"]
    cube("Body",(w,d,h),(0,0,h/2),body,col,root,.05)
    y=-d/2-.045
    if kind=="fridge-retro":
        cube("LowerDoor",(w-.08,.06,h*.66),(0,y,h*.34),body,col,root,.05)
        cube("FreezerDoor",(w-.08,.06,h*.27),(0,y,h*.85),body,col,root,.05)
        cube("LowerHandle",(w*.35,.08,.05),(-w*.18,y-.07,h*.50),m["steel"],col,root,.01)
        cube("UpperHandle",(w*.35,.08,.05),(-w*.18,y-.07,h*.83),m["steel"],col,root,.01)
    else:
        upper=h*.72; bottom=h-upper
        for i,x in enumerate((-w/4,w/4)):
            cube(f"UpperDoor_{i+1}",(w/2-.035,.06,upper-.05),(x,y,bottom+upper/2),body,col,root,.02)
            cube(f"Handle_{i+1}",(.055,.08,upper*.55),(x+(.11 if i==0 else -.11),y-.075,bottom+upper*.52),m["steel"],col,root,.01)
        cube("FreezerDrawer",(w-.08,.06,bottom-.06),(0,y,bottom/2),body,col,root,.02)
        cube("FreezerHandle",(w*.70,.08,.055),(0,y-.075,bottom*.72),m["steel"],col,root,.01)
        if kind=="fridge-smart": cube("SmartScreen",(w*.22,.04,h*.26),(w*.23,y-.07,h*.57),m["screen"],col,root,.015)
        elif kind=="fridge-french": cube("Dispenser",(w*.20,.04,h*.18),(-w*.23,y-.07,h*.56),m["black"],col,root,.015)


def build_range(kind,root,col,m,w,d,h):
    cube("Body",(w,d,h),(0,0,h/2),m["steel"],col,root,.035)
    cube("Cooktop",(w,d*.86,.08),(0,-d*.03,h+.04),m["dark"],col,root,.015)
    griddle="griddle" in kind
    xs=(-w*.30,w*.30); ys=(-d*.22,d*.20)
    for r,y in enumerate(ys):
        for c,x in enumerate(xs):
            cyl(f"Burner_{r}_{c}",min(w,d)*.095,.055,(x,y,h+.095),m["dark"],col,root)
            cyl(f"BurnerCap_{r}_{c}",min(w,d)*.045,.065,(x,y,h+.13),m["brass"],col,root)
    if griddle: cube("CenterGriddle",(w*.22,d*.62,.07),(0,-d*.02,h+.10),m["dark"],col,root,.012)
    y=-d/2-.05
    cube("ControlPanel",(w-.08,.08,h*.16),(0,y,h*.77),m["steel"],col,root,.015)
    knobs=5 if griddle else 4
    for i in range(knobs):
        x=-w*.36+i*(w*.72/max(1,knobs-1))
        cyl(f"Knob_{i+1}",.075,.08,(x,y-.06,h*.78),m["dark"],col,root,rot=(math.pi/2,0,0),vertices=24)
    cube("OvenGlass",(w-.16,.07,h*.43),(0,y,h*.38),m["black"],col,root,.025)
    cube("OvenHandle",(w*.72,.09,.06),(0,y-.075,h*.60),m["steel"],col,root,.012)


def build_microwave(kind,root,col,m,w,d,h):
    cube("Body",(w,d,h),(0,0,h/2),m["steel"],col,root,.04)
    y=-d/2-.045; panel=w*.22; door=w-panel-.12
    cube("Door",(door,.07,h*.72),(-panel/2,y,h*.52),m["black"],col,root,.025)
    cube("DoorMesh",(door*.72,.02,h*.48),(-panel/2,y-.05,h*.52),m["dark"],col,root,.01)
    cube("Handle",(.055,.09,h*.55),(door/2-panel/2-.08,y-.08,h*.52),m["steel"],col,root,.012)
    cube("ControlPanel",(panel-.05,.07,h*.72),(w/2-panel/2-.03,y,h*.52),m["black"],col,root,.018)
    cube("Display",(panel*.60,.025,h*.10),(w/2-panel/2-.03,y-.05,h*.72),m["screen"],col,root,.008)
    for r in range(4):
        for c in range(3):
            x=w/2-panel*.75+c*panel*.23; z=h*.58-r*h*.09
            cube(f"Button_{r}_{c}",(panel*.13,.025,h*.045),(x,y-.05,z),m["dark"],col,root,.004)
    if kind=="microwave-otr":
        cube("TopVent",(w-.12,.07,h*.12),(0,y,h*.91),m["dark"],col,root,.01)
        for i in range(12):
            x=-w*.42+i*w*.84/11
            cube(f"VentSlat_{i}",(.025,.025,h*.07),(x,y-.05,h*.91),m["steel"],col,root,.002)
        cube("LeftFilter",(w*.38,d*.55,.035),(-w*.25,.03,.02),m["dark"],col,root,.006)
        cube("RightFilter",(w*.38,d*.55,.035),(w*.25,.03,.02),m["dark"],col,root,.006)
        cube("CooktopLight",(w*.18,d*.12,.025),(0,-d*.30,.008),m["light"],col,root,.004)


def build(entry,root,col,m):
    _,_,kind,wi,di,hi,_=entry; w,d,h=s(wi),s(di),s(hi)
    if kind in {"base","drawers","sink","corner","upper","glass","tall","oven-tower","fridge-surround"}: build_cabinet(kind,root,col,m,w,d,h)
    elif kind.startswith("fridge"): build_fridge(kind,root,col,m,w,d,h)
    elif kind.startswith("range"): build_range(kind,root,col,m,w,d,h)
    elif kind.startswith("microwave"): build_microwave(kind,root,col,m,w,d,h)


def select_tree(root):
    bpy.ops.object.select_all(action='DESELECT'); root.select_set(True)
    for o in root.children_recursive: o.select_set(True)
    bpy.context.view_layer.objects.active=root


def export_glb(root,model_id):
    select_tree(root)
    path=OUT/"GLB"/f"{model_id}.glb"
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    bpy.ops.object.select_all(action='DESELECT')
    return str(path)


def add_showroom(roots,m):
    col=bpy.data.collections.new("SHOWROOM"); bpy.context.scene.collection.children.link(col)
    columns=6; rows=math.ceil(len(roots)/columns)
    cube("Floor",(columns*5+3,rows*5+3,.12),((columns-1)*2.5,(rows-1)*2.5,-.06),m["floor"],col,None,.02)
    for i,(root,elev) in enumerate(roots):
        root.location=(i%columns*5,i//columns*5,s(elev))
    bpy.ops.object.camera_add(location=(13,-22,18)); cam=bpy.context.object; move_to(cam,col); bpy.context.scene.camera=cam
    target=(12.5,(rows-1)*2.5,2.5); direction=(target[0]-cam.location.x,target[1]-cam.location.y,target[2]-cam.location.z)
    from mathutils import Vector
    cam.rotation_euler=Vector(direction).to_track_quat('-Z','Y').to_euler(); cam.data.lens=42
    for loc,energy,size in [((3,-5,17),2200,8),((25,8,15),1600,10),((8,32,17),1800,9)]:
        bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; move_to(light,col)
        light.data.energy=energy; light.data.size=size
        light.rotation_euler=Vector((target[0]-loc[0],target[1]-loc[1],target[2]-loc[2])).to_track_quat('-Z','Y').to_euler()


def main():
    OUT.mkdir(parents=True,exist_ok=True); (OUT/"GLB").mkdir(exist_ok=True)
    clear_scene(); bpy.context.scene.unit_settings.system='NONE'; bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
    m=materials(); roots=[]; manifest=[]
    for i,entry in enumerate(CATALOG,1):
        model_id,cat,kind,w,d,h,elev=entry
        print(f"[{i}/{len(CATALOG)}] {model_id}")
        col,root=root_for(model_id,cat,w,d,h,elev); build(entry,root,col,m)
        glb=export_glb(root,model_id) if EXPORT_GLB else None
        roots.append((root,elev)); manifest.append({"id":model_id,"category":cat,"kind":kind,"widthIn":w,"depthIn":d,"heightIn":h,"defaultElevationIn":elev,"glb":glb})
    if ADD_SHOWROOM: add_showroom(roots,m)
    (OUT/"catalog_manifest.json").write_text(json.dumps({"scale":"1 unit = 1 Roblox stud = 12 inches","models":manifest},indent=2),encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"KitchenAI_Roblox_Catalog.blend"))
    print(f"COMPLETE: {OUT}")


if __name__ == "__main__":
    try: main()
    except Exception:
        traceback.print_exc(); raise
