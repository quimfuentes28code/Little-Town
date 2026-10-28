const paths = {
 house:'M3 11 12 3l9 8M5 10v11h14V10M10 21v-7h4v7M8 8V4H5v7',
 lumber:'m12 2-7 10h4l-5 6h6v4h4v-4h6l-5-6h4L12 2Z',
 farm:'M4 21V9m0 6 5-4M4 11l5-4M4 7l5-4M14 21V9m0 6 5-4m-5 0 5-4m-5 0 5-4',
 market:'M3 9h18l-2-6H5L3 9Zm1 0v11h16V9M8 20v-7h8v7M3 9v2a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 2-2V9',
 well:'M3 9 12 3l9 6M6 9v10m12-10v10M4 19h16v3H4v-3Zm8-10v6m-3-3h6v5H9v-5Z',
 church:'M9 21V9l3-4 3 4v12M5 21V12h4m6 0h4v9M3 21h18M12 5V1m-2 2h4m-3 18v-5h2v5',
 people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7.87a4 4 0 0 1 0 7.75',
 wood:'m4 17 11-11a4 4 0 0 1 6 6L10 23M3 17a4 4 0 1 0 6 6 4 4 0 0 0-6-6Zm3 2 1 2',
 stone:'m3 17 3-9 9-4 6 7-2 9H6l-3-3Zm3-9 6 5 9-2m-9 2-2 7m2-7 3-9',
 food:'M12 22V6m0 9c-6 0-9-4-9-9 6 0 9 4 9 9Zm0-5c6 0 9-4 9-9-6 0-9 4-9 9Z',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
 compass:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm0 7-3 6 6-3-3-3Z',
 arrow:'M5 12h14m-6-6 6 6-6 6',
 pause:'M8 5v14M16 5v14',
 play:'m8 4 12 8-12 8V4Z',
 rotate:'M20 8a8 8 0 1 0 0 8m0-14v6h-6',
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 close:'m6 6 12 12M6 18 18 6',
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.house}"/></svg>`;
const catalog=[
 {id:'house',name:'Vivienda',tag:'HOGAR Y COMUNIDAD',description:'Un refugio cálido para nuevas familias. El comienzo de toda una vida en el valle.',wood:20,stone:5,detail:'+6 plazas',key:'1'},
 {id:'lumber',name:'Aserradero',tag:'PRODUCCIÓN',description:'Los bosques nos dan el material con el que construiremos nuestro futuro.',wood:25,stone:10,detail:'Produce madera',key:'2'},
 {id:'farm',name:'Granja',tag:'ALIMENTACIÓN',description:'Campos fértiles, cosechas abundantes. Alimento para una comunidad que crece.',wood:15,stone:5,detail:'Produce alimento',key:'3'},
 {id:'market',name:'Mercado',tag:'COMERCIO',description:'Un lugar de encuentro donde los frutos del valle cambian de manos.',wood:40,stone:20,detail:'Mejora el bienestar',key:'4'},
 {id:'well',name:'Pozo',tag:'SERVICIOS',description:'Agua limpia en el corazón del pueblo. Un pequeño cuidado que lo cambia todo.',wood:10,stone:20,detail:'Mejora el bienestar',key:'5'},
 {id:'church',name:'Iglesia',tag:'COMUNIDAD',description:'Un campanario sobre los tejados. Un símbolo de esperanza para las generaciones futuras.',wood:60,stone:45,detail:'Mejora el bienestar',key:'6'},
];
export function setupUI({onBuild=()=>{},onSpeed=()=>{},onPause=()=>{},onReset=()=>{},onRotate=()=>{}}={}){
 const root=document.createElement('div');root.id='town-ui';
 root.innerHTML=`<header class="topbar"><div class="brand"><span class="brand-emblem">${icon('lumber')}</span><div><div class="brand-name">LITTLE TOWN<span class="brand-dot">.</span></div><div class="brand-sub">UN NUEVO HOGAR EN EL VALLE</div></div></div><div class="resources" aria-label="Recursos del pueblo">${[['people','population','Habitantes'],['wood','wood','Madera'],['stone','stone','Piedra'],['food','food','Alimento']].map(([i,id,label])=>`<div class="resource" title="${label}">${icon(i)}<div><span class="resource-value" data-value="${id}">—</span><span class="resource-name">${label}</span></div></div>`).join('')}</div><button class="round-button rotate-button" title="Girar vista" aria-label="Girar vista">${icon('rotate')}</button></header>
 <section class="settlement-card panel"><div class="eyebrow"><span class="live-dot"></span> TU ASENTAMIENTO</div><h1>Valle del Alba</h1><p class="settlement-sub">Pequeños comienzos.<br>Grandes historias por construir.</p><div class="settlement-divider"></div><div class="wellbeing">${icon('heart')}<span>Bienestar</span><strong data-value="happiness">—</strong></div><div class="progress-track"><i id="happiness-fill"></i></div><div class="objective"><span class="objective-number">01</span><div><strong>Echa raíces</strong><p>Construye un hogar y haz<br>crecer tu comunidad.</p></div></div><div class="tip">${icon('compass')}<span>El futuro del valle<br>está en tus manos.</span></div></section>
 <aside class="inspector panel" id="inspector" hidden></aside>
 <div class="world-label"><span class="world-label-line"></span> EL VALLE DEL ALBA <span class="world-label-line"></span></div>
 <section class="build-dock"><div class="dock-heading"><span class="eyebrow">CONSTRUYE TU HISTORIA</span><span class="dock-help">Selecciona un edificio para colocarlo</span></div><div class="build-row">${catalog.map(b=>`<button class="build-tile" data-build="${b.id}" aria-label="Construir ${b.name}"><span class="tile-key">${b.key}</span><span class="tile-icon">${icon(b.id)}</span><span class="tile-name">${b.name}</span><span class="tile-cost">${icon('wood')} ${b.wood} <span>·</span> ${icon('stone')} ${b.stone}</span></button>`).join('')}</div></section>
 <footer class="bottom-bar"><div class="date-control">${icon('sun')}<span data-value="season">Primavera</span><span class="date-dot">·</span><span>Año <b data-value="year">1</b></span></div><div class="controls-legend"><span><kbd>↔</kbd> Arrastrar: mover</span><span><kbd>DER</kbd> Botón derecho: girar</span><span><kbd>⌕</kbd> Rueda: zoom</span></div><div class="time-controls"><button class="pause-button" title="Pausar" aria-label="Pausar">${icon('pause')}</button>${[1,2,4].map(n=>`<button class="speed-button ${n===1?'active':''}" data-speed="${n}">${n}×</button>`).join('')}</div></footer><div class="toast" role="status" id="town-toast"></div><div class="placement-hint" id="placement-hint" hidden><span class="live-dot"></span><span>Haz clic en el terreno para construir</span><kbd>ESC</kbd><span>Cancelar</span></div>`;
 document.body.append(root);
 const inspector=root.querySelector('#inspector'),hint=root.querySelector('#placement-hint');let selected=null,toastTimer;
 function selectBuilding(type){selected=type;root.querySelectorAll('[data-build]').forEach(el=>el.classList.toggle('selected',el.dataset.build===type));const b=catalog.find(x=>x.id===type);inspector.hidden=!b;hint.hidden=!b;if(!b)return;inspector.innerHTML=`<div class="inspector-top"><span class="eyebrow">${b.tag}</span><button class="close-inspector" aria-label="Cancelar construcción">${icon('close')}</button></div><div class="inspector-art">${icon(b.id)}<span></span></div><h2>${b.name}</h2><p>${b.description}</p><div class="building-effect">${icon('arrow')} ${b.detail}</div><div class="inspector-price"><span>COSTE DE CONSTRUCCIÓN</span><div>${icon('wood')}<strong>${b.wood}</strong>${icon('stone')}<strong>${b.stone}</strong></div></div><div class="inspector-footer">Elige un lugar en el valle ${icon('arrow')}</div>`;inspector.querySelector('.close-inspector').onclick=()=>onBuild(null);}
 root.querySelectorAll('[data-build]').forEach(el=>el.onclick=()=>{const id=el.dataset.build;onBuild(selected===id?null:id);});
 root.querySelectorAll('[data-speed]').forEach(el=>el.onclick=()=>onSpeed(Number(el.dataset.speed)));
 root.querySelector('.pause-button').onclick=()=>onPause();root.querySelector('.rotate-button').onclick=()=>onRotate();
 let lastPause=null;function update(state){for(const key of ['population','wood','stone','food','year']){const el=root.querySelector(`[data-value="${key}"]`);if(el&&state[key]!=null)el.textContent=Math.floor(state[key]).toLocaleString('es-ES');}if(state.season)root.querySelector('[data-value="season"]').textContent=state.season;if(state.happiness!=null){root.querySelector('[data-value="happiness"]').textContent=`${Math.round(state.happiness)}%`;root.querySelector('#happiness-fill').style.width=`${Math.max(0,Math.min(100,state.happiness))}%`;}root.querySelectorAll('[data-speed]').forEach(el=>el.classList.toggle('active',Number(el.dataset.speed)===state.speed&&!state.paused));if(lastPause!==state.paused){root.querySelector('.pause-button').innerHTML=icon(state.paused?'play':'pause');root.querySelector('.pause-button').classList.toggle('active',!!state.paused);lastPause=state.paused;}if('selected' in state&&state.selected!==selected)selectBuilding(state.selected);}
 function notify(message){const toast=root.querySelector('#town-toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),4200);}
 return {update,notify,selectBuilding};
}
