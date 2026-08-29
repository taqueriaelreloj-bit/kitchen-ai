# Kitchen AI — Professional Refrigerator Collection

Four original, brand-neutral refrigerator assets prepared for the Kitchen AI appliance catalog.

## Repository catalog assets

- Format: glTF 2.0 (`.gltf`) with an embedded binary buffer
- Catalog preview LOD: 96 triangles per model
- Units: meters
- Up axis: Y
- Origin: floor center
- Materials: glTF metallic/roughness PBR with embedded vertex colors
- External textures: none
- Thumbnails: lightweight SVG catalog cards
- Intended use: web, Expo/React Native catalog previews, and kitchen-layout placement

## Models

| ID | Nominal size | Configuration |
|---|---:|---|
| `refrigerator-french-door-stainless` | 36 × 70 × 30 in | French door, bottom freezer, dispenser |
| `refrigerator-panel-ready-built-in` | 36 × 84 × 24 in | Panel-ready built-in, bottom freezer |
| `refrigerator-smart-black` | 36 × 70 × 30 in | Black glass smart refrigerator |
| `refrigerator-retro-blue` | 24 × 63 × 26 in | Retro top-freezer refrigerator |

`manifest.json` contains dimensions, paths, features, bounds, and placement conventions. `src/domain/applianceCatalog.ts` registers the models and creates correctly dimensioned editor objects. `src/domain/applianceGeometry.ts` gives the current lightweight Kitchen AI renderer a detailed procedural representation of each model.

The downloadable source package includes higher-detail `.glb` masters, real-time `.glb` LODs, QA renders, WebP thumbnails, embedded `.gltf` previews, validation reports, and reproducible build scripts.
