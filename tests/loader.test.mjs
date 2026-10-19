import test from 'node:test';
import assert from 'node:assert/strict';
import {importOBJ,disposeModel} from '../src/renderer.js';
const mesh='mtllib materials.mtl\no Outer part\nv 100 100 100\nv 104 100 100\nv 100 104 100\nusemtl Shell\nf 1 2 3\n';
test('actual OBJ/MTL loader resolves companion material and keeps invisible geometry',async()=>{const files=[{path:'export/model.obj',blob:new Blob([mesh])},{path:'export/materials.mtl',blob:new Blob(['newmtl Shell\nKd 1 0.5 0.2\nd 0\n'])}];const model=await importOBJ(files[0],files);assert.equal(model.materials[0].original.opacity,0);assert.equal(model.materials[0].material.name,'Shell');assert.equal(model.warnings.length,0);assert.equal(model.group.scale.x,.5);disposeModel(model);});
test('missing MTL is reported and geometry still imports',async()=>{const files=[{path:'model.obj',blob:new Blob([mesh])}];const model=await importOBJ(files[0],files);assert.match(model.warnings.join(' '),/Missing material library/);assert.equal(model.materials.length,1);disposeModel(model);});
test('empty OBJ produces an actionable error',async()=>{const entry={path:'empty.obj',blob:new Blob(['# no faces'])};await assert.rejects(importOBJ(entry,[entry]),/No mesh faces/);});
