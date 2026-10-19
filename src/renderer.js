import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {TGALoader} from 'three/addons/loaders/TGALoader.js';
import {OBJExporter} from 'three/addons/exporters/OBJExporter.js';
import {materialPolicy, resolveAsset} from './core.js';

export async function importOBJ(entry,files){
  const warnings=[]; const urls=new Map(); const missing=new Set();
  const manager=new THREE.LoadingManager();let started=false,done;
  const ready=new Promise(r=>done=r);manager.onStart=()=>{started=true;};manager.onLoad=()=>done();
  manager.onError=url=>warnings.push('Could not decode texture: '+(Array.from(urls).find(([,v])=>v===url)?.[0]||url));
  manager.addHandler(/\.tga$/i,new TGALoader(manager));
  const fallback='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  manager.setURLModifier(url=>{if(url.startsWith('data:')||url.startsWith('blob:'))return url;const {file,error}=resolveAsset(files,url);if(!file){if(!missing.has(url)){warnings.push((error==='ambiguous'?'Several files match: ':'Missing texture: ')+url);missing.add(url);}return fallback;}if(!urls.has(file.path))urls.set(file.path,URL.createObjectURL(file.blob));return urls.get(file.path);});
  try {
    const text=await entry.blob.text();const libs=[...text.matchAll(/^mtllib\s+(.+)$/gm)].map(m=>m[1].trim());const creators=[];
    for(const lib of libs){let match=resolveAsset(files,lib,entry.path);if(!match.file&&libs.length===1){const mtls=files.filter(f=>/\.mtl$/i.test(f.path));if(mtls.length===1)match={file:mtls[0]};}if(!match.file){warnings.push('Missing material library: '+lib+'. Select its MTL and images with the OBJ.');continue;}const dir=match.file.path.replace(/[^/\\]*$/,'');creators.push(new MTLLoader(manager).parse(await match.file.blob.text(),dir));}
    if(!libs.length)warnings.push('This OBJ does not reference an MTL. Default materials are used.');
    const loader=new OBJLoader(manager);
    if(creators.length)loader.setMaterials({create(name){const c=creators.find(c=>c.materialsInfo[name]);if(c)return c.create(name);warnings.push('Missing material definition: '+name);return new THREE.MeshPhongMaterial({name,color:0xb7c1ca});}});
    const object=loader.parse(text);if(started)await ready;
    let meshes=0;object.traverse(n=>{if(n.isMesh)meshes++;});if(!meshes)throw new Error('No mesh faces found in '+entry.path);
    return makeModel(entry.path.split(/[\\/]/).pop().replace(/\.obj$/i,''),object,warnings);
  } finally {for(const url of urls.values())URL.revokeObjectURL(url);}
}

export function makeModel(name,object,warnings=[]){
  const box=new THREE.Box3().setFromObject(object);if(box.isEmpty())throw new Error('The model has no visible geometry.');
  const size=box.getSize(new THREE.Vector3());const max=Math.max(size.x,size.y,size.z);if(!Number.isFinite(max)||max<=0)throw new Error('The model has invalid dimensions.');
  const center=box.getCenter(new THREE.Vector3());const group=new THREE.Group();object.position.sub(center);group.add(object);group.scale.setScalar(2/max);group.updateMatrixWorld(true);
  const materials=[],cache=new Map();
  object.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;
    const convert=old=>{if(cache.has(old))return cache.get(old);const material=new THREE.MeshStandardMaterial({name:old.name||'Material '+(materials.length+1),color:old.color?.clone()||new THREE.Color(0xffffff),map:old.map,alphaMap:old.alphaMap,normalMap:old.normalMap,bumpMap:old.bumpMap,roughness:.8,metalness:0});
      if(material.map)material.map.colorSpace=THREE.SRGBColorSpace;
      const info={material,original:{opacity:old.opacity??1,hasMap:!!old.map,hasAlphaMap:!!old.alphaMap,color:material.color.clone(),bumpMap:old.bumpMap},override:{mode:'auto'},textures:new Set([old.map,old.alphaMap,old.bumpMap,old.normalMap].filter(Boolean))};materials.push(info);cache.set(old,material);old.dispose();return material;};
    n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);
  });
  return {name,group,materials,warnings:[...new Set(warnings)],id:crypto.randomUUID()};
}

export function disposeModel(model){model.group.traverse(n=>{if(n.geometry)n.geometry.dispose();});for(const m of model.materials){m.material.dispose();for(const t of m.textures)t.dispose();}}

export function sampleModel(){
  const group=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.3,1.3),new THREE.MeshPhongMaterial({name:'Blue inner part',color:0x428edb}));group.add(body);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff3a3';ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2;const r=i%2?43:100;const x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.strokeStyle='#ffc83c';ctx.lineWidth=8;ctx.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshPhongMaterial({name:'Outer decal — exported opacity 0',map:texture,transparent:true,opacity:0});
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),mat);outer.position.z=.78;group.add(outer);
  const right=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),mat);right.rotation.y=Math.PI/2;right.position.x=.78;group.add(right);
  return makeModel('Transparent-decal sample',group,['Sample: the outer star decals have imported opacity 0. Switch off Preserve transparent decals to compare.']);
}

export async function sampleFiles(){
  const model=sampleModel();
  const obj='mtllib sample.mtl\n'+new OBJExporter().parse(model.group);
  let mtl='';let texture;
  for(const info of model.materials){const m=info.material;mtl+=`newmtl ${m.name}\nKd ${m.color.r} ${m.color.g} ${m.color.b}\nd ${info.original.opacity}\n`;
    if(m.map){mtl+='map_Kd decal.png\n';texture=await new Promise(r=>m.map.image.toBlob(r,'image/png'));}}
  disposeModel(model);
  return [{path:'sample.obj',blob:new Blob([obj])},{path:'sample.mtl',blob:new Blob([mtl])},{path:'decal.png',blob:texture}];
}

export class IconRenderer{
  constructor(){this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.setClearColor(0,0);this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.sun=new THREE.DirectionalLight(0xffffff,3);this.sun.position.set(-3,5,4);this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});this.sun.shadow.bias=-.0005;this.fill=new THREE.DirectionalLight(0x666666,2);this.fill.position.set(4,2,-3);this.ambient=new THREE.AmbientLight(0x808080,2);this.scene.add(this.sun,this.fill,this.ambient);this.work=document.createElement('canvas');this.silhouette=document.createElement('canvas');
  }
  render(model,s,canvas){
    const n=s.resolution;this.renderer.setSize(n,n,false);this.renderer.toneMappingExposure=s.exposure;this.renderer.shadowMap.enabled=s.castShadows;this.sun.castShadow=s.castShadows;
    this.sun.color.set(s.sunColor);this.sun.intensity=s.sunIntensity/6;this.fill.color.set(s.secondaryColor);this.fill.intensity=s.secondaryIntensity/12;this.ambient.color.set(s.ambientColor);this.ambient.intensity=s.ambientIntensity/7;
    for(const info of model.materials){const p=materialPolicy(info.original,s,info.override);const mat=info.material;const changed=mat.transparent!==p.transparent||mat.side!==(s.doubleSide?THREE.DoubleSide:THREE.FrontSide);mat.opacity=p.opacity;mat.transparent=p.transparent;mat.depthWrite=p.depthWrite;mat.alphaTest=p.alphaTest;mat.side=s.doubleSide?THREE.DoubleSide:THREE.FrontSide;mat.roughness=s.roughness;mat.bumpMap=info.original.bumpMap||(s.highContrast?mat.map:null);mat.bumpScale=s.highContrast?s.bumpStrength*.025:0;mat.polygonOffset=p.decal;mat.polygonOffsetFactor=p.decal?-1:0;mat.polygonOffsetUnits=p.decal?-1:0;if(changed||info.lastBump!==!!mat.bumpMap){mat.needsUpdate=true;info.lastBump=!!mat.bumpMap;}}
    model.group.traverse(node=>{if(!node.isMesh)return;const materials=Array.isArray(node.material)?node.material:[node.material];node.visible=materials.some(m=>m.opacity>0);node.castShadow=s.castShadows&&materials.every(m=>m.opacity>0);});
    const margin=.78;const fit=Math.sqrt(3)/(Math.sin(THREE.MathUtils.degToRad(s.fov/2))*margin);const distance=fit*1.5/s.zoom;
    let camera;
    if(s.orthographic){const extent=1.95*1.5/s.zoom;camera=new THREE.OrthographicCamera(-extent,extent,extent,-extent,.01,100);}else camera=new THREE.PerspectiveCamera(s.fov,1,.01,100);
    const yaw=THREE.MathUtils.degToRad(s.rotation),el=THREE.MathUtils.degToRad(s.elevation);camera.position.set(distance*Math.cos(el)*Math.sin(yaw),distance*Math.sin(el),distance*Math.cos(el)*Math.cos(yaw));camera.lookAt(0,0,0);camera.rotateZ(THREE.MathUtils.degToRad(s.roll));camera.updateMatrixWorld();
    this.scene.add(model.group);try{this.renderer.render(this.scene,camera);}finally{this.scene.remove(model.group);}
    this.work.width=this.work.height=n;const ctx=this.work.getContext('2d');ctx.filter=`saturate(${s.saturation})`;ctx.drawImage(this.renderer.domElement,0,0);ctx.filter='none';
    this.silhouette.width=this.silhouette.height=n;const sc=this.silhouette.getContext('2d');sc.drawImage(this.work,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle=s.outlineColor;sc.fillRect(0,0,n,n);sc.globalCompositeOperation='source-over';
    canvas.width=canvas.height=n;const out=canvas.getContext('2d');const scale=n/512;
    if(s.dropShadow&&s.shadowOpacity>0){out.save();out.globalAlpha=s.shadowOpacity;out.filter=`blur(${s.shadowBlur*scale}px)`;out.drawImage(this.silhouette,0,s.shadowOffset*scale);out.restore();}
    const radius=s.outlineSize*scale;if(radius>0){const steps=Math.max(16,Math.ceil(radius*5));for(let i=0;i<steps;i++){const a=i/steps*Math.PI*2;out.drawImage(this.silhouette,Math.cos(a)*radius,Math.sin(a)*radius);}out.drawImage(this.silhouette,0,0);}
    out.drawImage(this.work,0,0);
  }
}
