import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {defaults,studioLightingPreset} from '../src/core.js';
import {configureLighting} from '../src/renderer.js';
function rig(){return {sun:new THREE.DirectionalLight(),fill:new THREE.DirectionalLight(),ambient:new THREE.AmbientLight(),sky:new THREE.HemisphereLight()};}
test('Studio preset changes lighting without replacing the user camera, stroke or shadow',()=>{
 const current={...defaults,rotation:-135.919952,zoom:1.7,fov:50,outlineSize:6,shadowOpacity:.5,shadowBlur:20,shadowOffset:18,outlineColor:'#123456',saturation:1.15,sunIntensity:60,exposure:.7,castShadows:true,highContrast:true};
 const result=studioLightingPreset(current);
 for(const key of ['resolution','rotation','zoom','fov','outlineSize','outlineColor','dropShadow','shadowOpacity','shadowBlur','shadowOffset','saturation'])assert.equal(result[key],current[key],key);
 assert.equal(result.castShadows,false);assert.equal(result.highContrast,false);assert.equal(result.exposure,1);assert.equal(result.studioLighting,true);
});
test('visible-face illumination stays consistent while yaw rotates around the model',()=>{
 const lights=rig(),axis=new THREE.Vector3(0,1,0);let reference;
 for(const rotation of [-180,-136,-90,0,45,90,179]){
  configureLighting(lights,{...defaults,rotation});
  const normal=new THREE.Vector3(0,0,1).applyAxisAngle(axis,THREE.MathUtils.degToRad(rotation));
  const energy=lights.ambient.intensity/Math.PI+Math.max(0,normal.dot(lights.sun.position.clone().normalize()))*lights.sun.intensity/Math.PI+Math.max(0,normal.dot(lights.fill.position.clone().normalize()))*lights.fill.intensity/Math.PI;
  assert.ok(energy>.9,'front texture should not go dark');
  reference??=energy;assert.ok(Math.abs(energy-reference)<1e-10);
 }
});
test('neutral color mapping and sky fill can be switched back to the original lighting',()=>{
 const lights=rig();const studio=configureLighting(lights,defaults);assert.equal(studio.toneMapping,THREE.LinearToneMapping);assert.ok(lights.sky.intensity>0);
 const classic=configureLighting(lights,{...defaults,studioLighting:false});assert.equal(classic.toneMapping,THREE.ACESFilmicToneMapping);assert.equal(lights.sky.intensity,0);assert.deepEqual(lights.sun.position.toArray(),[-3,5,4]);
});
