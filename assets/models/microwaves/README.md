# Kitchen AI Microwave 3D Collection

Professional, dimensionally accurate microwave assets for the Kitchen AI appliance catalog.

## Models

- `microwave-countertop-24-stainless.gltf` — 24 × 14 × 18 in countertop microwave. The catalog places the bottom at 36 in so it sits on a standard countertop.
- `microwave-over-range-30-stainless.gltf` — 30 × 16.5 × 16 in over-the-range microwave with integrated extractor, underside grease filters and cooktop light. The catalog places the bottom at 54 in.

## Runtime behavior

Both items are selectable, movable, rotatable, duplicable, removable and compatible with project Undo/Redo through the existing `EditorObject` and drag-catalog systems. Dimensions are locked to the catalog specification. The stainless finish is the default and is saved with the project.

The real-time editor uses matching procedural detail geometry for fast 2D/3D interaction, while the embedded-buffer glTF assets remain available for catalog previews, export and future WebGL/native loaders.

## Asset conventions

- glTF 2.0
- Embedded binary buffers
- Meters
- Y-up
- Floor-center origin
- PBR material with vertex colors
