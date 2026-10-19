# Crystal Icon Studio

An independent, browser-local Roblox OBJ icon generator. JavaScript + Three.js, with bundled dependencies. Model files never leave your browser. No Python or external model-processing service is used.

## Use

1. In Studio, select the whole model and export as OBJ into an empty folder.
2. Choose that folder in the site, or drop the OBJ, MTL and all exported images together. ZIP and multiple OBJ files are supported.
3. Adjust camera, lighting, materials and effects. Drag any preview to rotate the shared camera.
4. Click a model to inspect its materials. Leave **Preserve transparent decals** on. Use **Decal (texture alpha)** for a specific texture on an invisible outer face, **Imported opacity** for exact MTL opacity, or **Hidden** for unwanted shells. Attach missing textures directly in the panel.
5. Download one PNG or all icons in a ZIP. All PNGs have a transparent background, with the chosen outline and shadow baked in.

The built-in sample deliberately has two outer decal planes whose imported opacity is zero. Toggle decal preservation to compare. Auto mode only promotes zero-opacity textured materials; partially transparent glass retains its original opacity. A website cannot recreate decal geometry or textures omitted by Studio's OBJ export. Supply all companion files; missing/ambiguous textures are reported visibly.

**Studio lighting** is enabled by default. It uses neutral color mapping, balanced ambient/sky fill, and camera-relative lights so rotating a model does not turn its visible faces dark. **Match Studio lighting** restores this preset while preserving your camera, outline and drop-shadow choices. Model self-shadows and texture-derived bump are off by default, matching the flat SmoothPlastic/decal appearance more closely. The 2D outline and drop shadow remain independent. OBJ files do not contain Roblox's full scene lighting, so this is a Studio-style approximation rather than an engine-identical renderer. Disable Studio lighting to use the original filmic lighting controls.

## Features

64/128/256/512/1024 resolutions; yaw, elevation, roll, zoom, FOV and orthographic camera; sun/fill/ambient colors and intensities; exposure and self shadows; transparency, roughness, texture-derived bump and bump strength; saturation, outline color/size, drop-shadow opacity/blur/offset; PNG and ZIP downloads; reset, remembered settings, JSON settings import/export. Subdivision is intentionally excluded.

## Run your own copy

Install Node.js LTS, then run in this directory:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173. On Windows you can also double-click `Start Icon Studio.cmd` after installing Node.js. The built `dist/` folder can be hosted by any static web host; keep the three files together. It requires HTTP hosting rather than opening index.html as a file.

```sh
npm test
```

Sources: `src/app.js` (interface/import/export), `src/renderer.js` (OBJ, MTL, rendering), `src/core.js` (settings/material policy). Three.js and fflate notices are included in the build.
