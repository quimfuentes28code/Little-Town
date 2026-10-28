import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function createWorld(T, scene) {
  let seed=123456; const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const root=new T.Group(); scene.add(root);
  const materialCache=new Map();const mat=(c,roughness=.88)=>{const key=c+':'+roughness;if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({color:c,roughness}));return materialCache.get(key);};
  const M={grass:mat('#74845c'),soil:mat('#9b8b6c'),road:mat('#b4aa91'),stone:mat('#89887b'),plaster:mat('#ded4b7'),wood:mat('#594634'),timber:mat('#3c342b'),roof:mat('#665b4d'),redroof:mat('#956651'),leaf:mat('#4e6947'),trunk:mat('#615040'),gold:mat('#b5a268'),dark:mat('#282e2a'),water:new T.MeshStandardMaterial({color:'#729b9b',roughness:.25,metalness:.3,transparent:true,opacity:.84}),window:new T.MeshStandardMaterial({color:'#c9b979',emissive:'#8b642b',emissiveIntensity:.2,roughness:.4})};
  // Original, deterministic surface maps: slate, limewash and compacted earth.
  if(typeof document!=='undefined'){
    function texture(kind,base){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);let n=7391;const random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
      if(kind==='roof'){for(let y=0;y<256;y+=16)for(let x=-16;x<256;x+=32){const xx=x+(y/16%2)*16;const v=85+Math.floor(random()*17);ctx.fillStyle=`rgb(${v+8},${v+5},${v})`;ctx.fillRect(xx,y,31,15);ctx.fillStyle='rgba(18,22,24,.22)';ctx.fillRect(xx,y+14,32,2);ctx.fillRect(xx+30,y,2,16);ctx.fillStyle='rgba(230,220,190,.16)';ctx.fillRect(xx+1,y+1,29,1);}}
      else{for(let i=0;i<15000;i++){const v=random()>.5?255:0;ctx.fillStyle=`rgba(${v},${v},${v},${kind==='grass'?.035:.06})`;const size=random()*2+.2;ctx.fillRect(random()*256,random()*256,size,size);}if(kind==='road'){for(let i=0;i<300;i++){ctx.fillStyle='rgba(70,65,51,.16)';ctx.beginPath();ctx.ellipse(random()*256,random()*256,1+random()*2,.5+random(),random()*3,0,Math.PI*2);ctx.fill();}}}
      const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;}
    const slate=texture('roof','#77736c');slate.repeat.set(.5,.5);M.roof.map=slate;M.roof.color.set('#b7b2aa');M.roof.bumpMap=slate;M.roof.bumpScale=.09;
    M.redroof.map=slate;M.redroof.color.set('#b28a6a');M.redroof.bumpMap=slate;M.redroof.bumpScale=.07;
    const plaster=texture('plaster','#e4dfcf');plaster.repeat.set(.55,.55);M.plaster.map=plaster;M.plaster.bumpMap=plaster;M.plaster.bumpScale=.035;
    const grass=texture('grass','#a2ac89');grass.repeat.set(110,110);M.grass.map=grass;M.grass.color.set('#91a477');
    const road=texture('road','#c9bfa5');road.repeat.set(.65,.65);M.road.map=road;M.road.bumpMap=road;M.road.bumpScale=.05;
    M.wood.map=texture('wood','#a99b84');M.stone.map=texture('stone','#aaa99f');
  }
  function mesh(g,m,p,parent=root){const o=new T.Mesh(g,m);if(p)o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,m,x,y,z,p=root){return mesh(new T.BoxGeometry(w,h,d),m,[x,y,z],p);}
  function cyl(rt,rb,h,n,m,x,y,z,p=root){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,[x,y,z],p);}
  function beam(a,b,r,m,p=root){const v=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cyl(r,r,v.length(),5,m,0,0,0,p);o.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
  const terrainHeight=(x,z)=>0;
  const ground=mesh(new T.PlaneGeometry(600,600),M.grass,[0,-.08,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  // Soft mottled turf, fitted as irregular low islands.

  const hillMat=mat('#71836b');for(let i=0;i<26;i++){const a=i/26*Math.PI*2,r=140+(i%3)*14;const hill=mesh(new T.IcosahedronGeometry(1,2),hillMat,[Math.cos(a)*r,-5,Math.sin(a)*r]);hill.scale.set(27+(i%4)*7,12+(i%5)*5,32+(i%3)*7);hill.castShadow=false;}
  const riverPoints=[];for(let z=-310;z<=310;z+=3)riverPoints.push(new T.Vector3(-27+Math.sin(z*.065)*3,0,z));
  const riverShape=new T.Shape();riverPoints.forEach((p,i)=>i?riverShape.lineTo(p.x-3.8,-p.z):riverShape.moveTo(p.x-3.8,-p.z));[...riverPoints].reverse().forEach(p=>riverShape.lineTo(p.x+3.8,-p.z));riverShape.closePath();
  const river=mesh(new T.ShapeGeometry(riverShape),M.water,[0,.035,0]);river.rotation.x=-Math.PI/2;river.castShadow=false;
  const ripples=[];for(let i=0;i<45;i++){const z=rand()*150-75,x=-27+Math.sin(z*.065)*3+(rand()-.5)*6;const r=box(.5+rand()*2,.014,.045,mat('#acc4bc'),x,.075,z);r.castShadow=false;r.rotation.y=-.1; ripples.push(r);}
  function path(x,z,w,d){const o=box(w,.045,d,M.road,x,.015,z);o.castShadow=false;return o;}
  path(1,0,43,3.2);path(0,0,3.2,47);path(11,12,25,2);path(12,-11,23,2);path(-11,10,2,19);path(-10,-11,20,2);path(-25,0,13,3.1);
  // Raised plank bridge with rustic balustrades.
  for(let i=0;i<23;i++)box(.45,.22,4.1,M.wood,-32.5+i*.48,.28,0);
  for(const z of [-1.85,1.85]){for(let x=-32;x<-21;x+=2)box(.15,1.25,.15,M.wood,x,.9,z);box(11.8,.13,.14,M.wood,-27,1.4,z);box(11.8,.1,.12,M.wood,-27,.85,z);}
  const buildings=[];const sails=[];const smoke=[];
  function roof(w,h,d,y,p,m=M.roof){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});const o=mesh(g,m,[0,y,-d/2],p);return o;}
  function building(type,x,z,rotation=0){const p=new T.Group();p.position.set(x,0,z);p.rotation.y=rotation;root.add(p);
    if(type==='farm'){box(7,.08,7,M.soil,0,0,0,p);for(let xx=-3;xx<=3;xx+=.65)for(let zz=-3;zz<=3;zz+=.6)cyl(.055,.11,.65,4,M.gold,xx,.35,zz,p);const record={type,x,z,mesh:p,position:p.position,radius:type==='farm'?5:type==='church'?5:3};buildings.push(record);return record;}
    if(type==='well'){cyl(.9,1,.7,12,M.stone,0,.35,0,p);cyl(.65,.65,.04,16,M.water,0,.73,0,p);for(const xx of [-1,1])box(.14,2.3,.14,M.wood,xx,1.15,0,p);roof(2.8,1.1,2,2.1,p);const record={type,x,z,mesh:p,position:p.position,radius:type==='farm'?5:type==='church'?5:3};buildings.push(record);return record;}
    let w=3.8,d=4.6,h=3.1;if(type==='townhall'){w=6.5;d=6;h=5;}if(type==='church'){w=5;d=9;h=5;}if(type==='storehouse'||type==='warehouse'){w=6;d=5;h=3.7;}if(type==='market'){w=4;d=3.5;h=2;}
    box(w+.3,.45,d+.3,M.stone,0,.22,0,p);box(w,h,d,M.plaster,0,h/2+.4,0,p);roof(w+.8,Math.min(w*.65,3),d+.7,h+.35,p,type==='townhall'?M.redroof:M.roof);
    // Exposed timber framing with diagonal braces.
    for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])box(.17,h+.1,.17,M.timber,xx,h/2+.42,zz,p);
    for(const zz of [-d/2-.035,d/2+.035]){box(w,.15,.14,M.timber,0,1.05,zz,p);box(w,.18,.14,M.timber,0,h+.25,zz,p);for(let xx=-w/2+1;xx<w/2;xx+=1.6){box(.11,h,.12,M.timber,xx,h/2+.4,zz,p);beam([xx-.6,1.1,zz],[xx,h+.2,zz],.06,M.timber,p);}for(let xx=-w/2+.8;xx<w/2;xx+=1.6){box(.65,.8,.1,M.dark,xx,2.1,zz,p);box(.52,.65,.12,M.window,xx,2.1,zz+.03,p);box(.04,.7,.14,M.wood,xx,2.1,zz+.06,p);}}
    box(.88,1.65,.15,M.wood,0,1.22,d/2+.1,p);box(.08,.08,.09,M.gold,.26,1.25,d/2+.2,p);box(1.25,.12,.65,M.stone,0,.45,d/2+.35,p);
    box(.65,1.5,.7,M.stone,w*.27,h+1.2,-d*.22,p);box(.85,.18,.9,M.stone,w*.27,h+1.95,-d*.22,p);
    if(type==='church'){box(2.5,8,2.7,M.stone,0,4.2,d/2-.5,p);roof(3.1,4,3.2,8.2,p).position.z+=d/2-.5;box(.13,1.5,.13,M.timber,0,12.6,d/2-.5,p);box(.8,.12,.12,M.timber,0,12.8,d/2-.5,p);const clock=cyl(.52,.52,.07,24,M.plaster,0,7.1,d/2+.9,p);clock.rotation.x=Math.PI/2;}
    if(type==='windmill'){const tower=cyl(1.3,2,6,10,M.plaster,0,3,0,p);roof(3.3,2,3.3,6,p);const s=new T.Group();s.position.set(0,5.5,2.5);p.add(s);for(let i=0;i<4;i++){const a=new T.Group();a.rotation.z=i*Math.PI/2;s.add(a);box(.17,5.6,.14,M.wood,0,1.25,0,a);box(.85,2.5,.07,M.plaster,.3,2.05,.04,a);for(let j=0;j<5;j++)box(.92,.055,.1,M.wood,.3,.9+j*.56,.1,a);}cyl(.3,.3,.4,10,M.wood,0,5.5,2.6,p).rotation.x=Math.PI/2;sails.push(s);}
    if(type==='lumber'){for(let row=0;row<3;row++)for(let j=0;j<5-row;j++){const log=cyl(.25,.25,3.7,7,M.wood,w/2+1+row*.05,.3+row*.44,-1.3+j*.52,p);log.rotation.x=Math.PI/2;const end=cyl(.21,.21,.03,7,M.gold,w/2+1+row*.05,.3+row*.44,-1.3+j*.52+1.87,p);end.rotation.x=Math.PI/2;}box(2,.15,3.5,M.wood,-w/2-1,.9,0,p);}
    if(type==='market'){for(const xx of [-2,2])for(const zz of [-1.7,1.7])box(.12,3,.12,M.wood,xx,1.5,zz,p);for(let i=0;i<8;i++)box(.55,.12,4,M.redroof,-1.95+i*.55,3.1,0,p);box(3.6,1,1.1,M.wood,0,1,1,p);for(let i=0;i<12;i++)cyl(.17,.2,.2,6,i%2?M.gold:M.leaf,-1.4+(i%6)*.55,1.6,.7+Math.floor(i/6)*.4,p);}
    if(type==='house'){const variation=.91+((Math.abs(x*13+z*7)%11)/50);p.scale.set(variation,.88+((Math.abs(x*7+z*3)%9)/30),variation);}
    const record={type,x,z,mesh:p,position:p.position,radius:type==='farm'?5:type==='church'?5:3};buildings.push(record);return record;
  }
  building('townhall',7,-5,Math.PI);building('church',13,-17,Math.PI);building('storehouse',-8,-6);building('market',5,5);
  [[-6,5,0],[-7,14,0],[6,16,Math.PI/2],[15,6,Math.PI/2],[-16,-6,0],[5,-14,0]].forEach(([x,z,r])=>building('house',x,z,r));building('windmill',18,26);building('lumber',-15,17);building('well',9,9);
  function tree(x,z,scale=1){const p=new T.Group();p.position.set(x,0,z);p.scale.setScalar(scale);root.add(p);cyl(.13,.24,2.6,6,M.trunk,0,1.3,0,p);const col=mat(['#425b3e','#506444','#5b704b','#66774f'][Math.floor(rand()*4)]);if(rand()<.45){for(let j=0;j<3;j++)cyl(0,1.5-j*.26,2.5,7,col,0,2.3+j*1.05,0,p);}else {mesh(new T.IcosahedronGeometry(1.65,1),col,[0,3.2,0],p);mesh(new T.IcosahedronGeometry(1.15,1),col,[.9,2.9,.3],p);mesh(new T.IcosahedronGeometry(1.2,1),col,[-.6,2.8,-.55],p);}return p;}
  for(let i=0;i<420;i++){const x=rand()*132-66,z=rand()*132-66;if((Math.abs(x)<29&&Math.abs(z)<31)||(x>-36&&x<-18)||Math.abs(z)<3)continue;tree(x,z,.65+rand()*.7);}
  for(const [x,z] of [[-18,16],[-18,-17],[25,16],[27,-14],[13,22],[5,22]])tree(x,z,.75);
  // Cultivated fields, hedgerows and split rail fences.
  function field(cx,cz,w,d){box(w,.07,d,M.soil,cx,.01,cz);for(let x=-w/2+.4;x<w/2;x+=.65){box(.19,.15,d-.5,M.gold,cx+x,.14,cz);for(let z=-d/2+.5;z<d/2;z+=.8){const o=cyl(.05,.09,.6+rand()*.2,4,M.gold,cx+x,.35,cz+z);o.castShadow=false;}}for(const dz of [-d/2,d/2]){for(let x=-w/2;x<=w/2;x+=2)box(.12,.9,.12,M.wood,cx+x,.45,cz+dz);box(w,.09,.1,M.wood,cx,.7,cz+dz);box(w,.09,.1,M.wood,cx,.38,cz+dz);}}
  field(7,30,10,11);field(-7,30,11,11);field(30,20,10,15);buildings.push({type:'farm',x:7,z:30,mesh:root,position:new T.Vector3(7,0,30),radius:6},{type:'farm',x:-7,z:30,mesh:root,position:new T.Vector3(-7,0,30),radius:6});
  // Town square cobbles, fountain, garden and everyday details.
  const square=cyl(5,5,.05,8,M.road,0,.04,0);square.rotation.y=Math.PI/8;
  cyl(1.65,1.8,.4,12,M.stone,0,.23,0);cyl(1.4,1.4,.05,24,M.water,0,.46,0);cyl(.3,.45,1.8,10,M.stone,0,1,0);cyl(.85,.3,.2,12,M.stone,0,1.9,0);cyl(.65,.65,.04,20,M.water,0,2.02,0);
  for(let i=0;i<25;i++){const x=(rand()-.5)*40,z=(rand()-.5)*35;if(Math.abs(x)<3||Math.abs(z)<3)continue;const barrel=cyl(.35,.35,.7,9,M.wood,x,.35,z);for(const y of [.15,.55])cyl(.365,.365,.045,9,M.dark,x,y,z);}
  for(const [x,z] of [[-3,4],[3,-3],[10,2],[-10,2]]){box(1.8,.14,.6,M.wood,x,.65,z);for(const a of [-.65,.65])box(.13,.6,.4,M.wood,x+a,.3,z);box(1.8,.55,.12,M.wood,x,.95,z-.25);}
  for(let i=0;i<60;i++){const z=rand()*140-70,x=-27+Math.sin(z*.065)*3+(rand()>.5?4.4:-4.4);const o=mesh(new T.DodecahedronGeometry(.2+rand()*.65),M.stone,[x,.15,z]);o.scale.y=.6;}
  const walkers=[];for(let i=0;i<24;i++){const p=new T.Group();root.add(p);const cloth=mat(['#7e6754','#6c7880','#9d745f','#879078','#a18d61'][i%5]);cyl(.16,.21,.55,7,cloth,0,.65,0,p);mesh(new T.SphereGeometry(.14,7,6),mat('#c5a78a'),[0,1.03,0],p);box(.12,.35,.12,M.timber,-.1,.22,0,p);box(.12,.35,.12,M.timber,.1,.22,0,p);walkers.push({p,phase:rand()*Math.PI*2,speed:.4+rand()*.35,axis:i%2,offset:(rand()-.5)*1.8});}
  const birds=[];for(let i=0;i<7;i++){const p=new T.Group();root.add(p);const a=box(.65,.035,.17,M.dark,-.3,0,0,p),b=box(.65,.035,.17,M.dark,.3,0,0,p);birds.push({p,a,b,phase:rand()*6.28});}
  // Bake static detail into shared-material batches. Animated objects retain their
  // local hierarchies; placement records retain their original world coordinates.
  const dynamicRoots=new Set([...sails,...ripples,...walkers.map(v=>v.p),...birds.map(v=>v.p)]);
  root.updateMatrixWorld(true);
  const batches=new Map(), originals=[];
  root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p&&p!==root;p=p.parent)if(dynamicRoots.has(p))return;if(Array.isArray(o.material))return;
    const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
    if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,geometries:[]});
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);batches.get(key).geometries.push(g);originals.push(o);
  });
  for(const batch of batches.values()){const geometry=mergeGeometries(batch.geometries,false);if(!geometry)continue;const merged=new T.Mesh(geometry,batch.material);merged.castShadow=batch.cast;merged.receiveShadow=batch.receive;merged.name='Static village batch';root.add(merged);for(const g of batch.geometries)g.dispose();}
  for(const o of originals)o.removeFromParent();
  function update(dt,time){sails.forEach(s=>s.rotation.z-=dt*.25);ripples.forEach((r,i)=>r.position.z+=dt*.12*(i%2?1:-1));walkers.forEach(v=>{const q=Math.sin(time*v.speed*.1+v.phase)*19;if(v.axis){v.p.position.set(v.offset,Math.abs(Math.sin(time*6+v.phase))*.025,q);v.p.rotation.y=Math.cos(time*v.speed*.1+v.phase)>0?0:Math.PI;}else{v.p.position.set(q,Math.abs(Math.sin(time*6+v.phase))*.025,v.offset);v.p.rotation.y=Math.cos(time*v.speed*.1+v.phase)>0?Math.PI/2:-Math.PI/2;}});birds.forEach((b,i)=>{const t=time*.09+b.phase;b.p.position.set(Math.cos(t)*(23+i),17+i*.5,Math.sin(t)*(23+i));b.p.rotation.y=-t;b.a.rotation.z=Math.sin(time*5+i)*.25;b.b.rotation.z=-Math.sin(time*5+i)*.25;});}
  return {update,pickGround(raycaster){return raycaster.intersectObject(ground)[0]?.point||null;},placeBuilding(type,x,z){return building(type,x,z);},buildings,terrainHeight};
}
