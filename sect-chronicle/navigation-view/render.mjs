import { navigationLayers,pickNavigation } from './contract.mjs';
const NS='http://www.w3.org/2000/svg';
export function createNavigationRenderer({root,onActor=()=>{},onFacility=()=>{}}) {
 const doc=root.ownerDocument,svgNode=(tag,attrs={})=>{const el=doc.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
 root.classList.add('navigation-view');
 root.innerHTML='<h3>場景導覽</h3><p class="navigation-help">只看位置；點人跟隨，點地點定位。</p><div class="navigation-layers"><label><input type="checkbox" data-nav-layer="actors" checked>人物</label><label><input type="checkbox" data-nav-layer="facilities" checked>已知地點</label></div><div data-nav-map></div><div class="navigation-actors" aria-label="可見人物"></div><label class="navigation-places">定位已知地點 <select data-nav-facilities><option value="">選擇地點</option></select></label><p class="navigation-legend">● 人物　□ 已知地點　▱ 鏡頭視窗</p><p class="navigation-route"></p><small class="navigation-scale"></small>';
 const svg=svgNode('svg',{'role':'group','aria-label':'場景位置簡圖（原生座標）'}),boundary=svgNode('rect',{'class':'navigation-boundary'}),frame=svgNode('rect',{'class':'navigation-frame'}),points=svgNode('g');
 svg.append(boundary,frame,points);root.querySelector('[data-nav-map]').append(svg);
 const layer={actors:true,facilities:true},marks=new Map(),buttons=new Map(),personList=root.querySelector('.navigation-actors'),places=root.querySelector('select');
 let current=null,drawn=null,identity=null,facilityKey='';
 function clear() {for(const n of marks.values())n.remove();for(const n of buttons.values())n.remove();marks.clear();buttons.clear();places.replaceChildren(new Option('選擇地點',''));facilityKey='';}
 function activate(kind,id) {
  const point=drawn&&pickNavigation(drawn,kind,id);if(!point)return;
  if(kind==='actor')onActor(point.id);else onFacility(point.id);
 }
 function draw() {
  if(!current)return;
  drawn=navigationLayers(current,layer);const {bounds}=drawn;
  svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
  svg.style.aspectRatio=`${bounds.width} / ${bounds.height}`;
  for(const [key,value] of Object.entries({x:0,y:0,width:bounds.width,height:bounds.height}))boundary.setAttribute(key,value);
  for(const [key,value] of Object.entries(drawn.frame))frame.setAttribute(key,value);
  const radius=Math.max(bounds.width,bounds.height)/72,wanted=new Set();
  for(const p of [...drawn.facilities,...drawn.actors]) {
   const key=`${p.kind}:${p.id}`;wanted.add(key);let node=marks.get(key);
   if(!node){node=svgNode('g',{role:'button',tabindex:'0','data-nav-kind':p.kind,'data-nav-id':p.id});node.append(svgNode('title'),svgNode(p.kind==='actor'?'circle':'rect'),svgNode('text'));points.append(node);marks.set(key,node);}
   node.setAttribute('transform',`translate(${p.x} ${p.y})`);node.setAttribute('class',`navigation-point ${p.kind}${p.id===drawn.selectedId?' selected':''}`);
   const title=`${p.label} · ${p.x.toFixed(1)}, ${p.y.toFixed(1)}（只${p.kind==='actor'?'選取跟隨':'移鏡頭'}）`;
   node.setAttribute('aria-label',title);node.querySelector('title').textContent=title;
   const shape=node.children[1];if(p.kind==='actor')shape.setAttribute('r',radius);else for(const [k,v] of Object.entries({x:-radius*.75,y:-radius*.75,width:radius*1.5,height:radius*1.5}))shape.setAttribute(k,v);
   const text=node.querySelector('text');text.textContent=p.label;text.setAttribute('x',radius*1.4);text.setAttribute('y',-radius);text.setAttribute('font-size',radius*2.3);
  }
  for(const [key,node] of marks)if(!wanted.has(key)){node.remove();marks.delete(key);}
  const actorIds=new Set(drawn.actors.map(p=>p.id));
  for(const p of drawn.actors){let b=buttons.get(p.id);if(!b){b=doc.createElement('button');b.className='btn';b.dataset.navKind='actor';b.dataset.navId=p.id;personList.append(b);buttons.set(p.id,b);}b.textContent=p.label;b.setAttribute('aria-pressed',p.id===drawn.selectedId);}
  for(const [id,b] of buttons)if(!actorIds.has(id)){b.remove();buttons.delete(id);}
  const key=JSON.stringify(drawn.facilities.map(p=>[p.id,p.label]));
  if(key!==facilityKey){places.replaceChildren(new Option('選擇地點',''),...drawn.facilities.map(p=>new Option(p.label,p.id)));facilityKey=key;}
  root.querySelector('.navigation-route').textContent=drawn.route.text;
  root.querySelector('.navigation-scale').textContent=`${bounds.width} × ${bounds.height} 原生場景單位 · 僅當下公開座標`;
 }
 const click=e=>{const node=e.target.closest('[data-nav-id]');if(node)activate(node.dataset.navKind,node.dataset.navId);};
 const keydown=e=>{e.stopPropagation();if(e.target.closest('svg [data-nav-id]')&&['Enter',' '].includes(e.key)){e.preventDefault();click(e);}};
 const change=e=>{if(e.target.matches('[data-nav-layer]')){layer[e.target.dataset.navLayer]=e.target.checked;draw();}else if(e.target===places){activate('facility',places.value);places.value='';}};
 const stop=e=>e.stopPropagation(),wheel=e=>{e.preventDefault();e.stopPropagation();};
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('keydown',keydown);
 for(const name of ['pointerdown','pointerup','pointermove','click','contextmenu'])root.addEventListener(name,stop);
 root.addEventListener('wheel',wheel,{passive:false});
 return {render(view){if(identity!==view.identity){clear();identity=view.identity;}current=structuredClone(view);draw();},snapshot:()=>structuredClone(drawn),
  destroy(){root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('keydown',keydown);for(const name of ['pointerdown','pointerup','pointermove','click','contextmenu'])root.removeEventListener(name,stop);root.removeEventListener('wheel',wheel);clear();root.replaceChildren();current=drawn=null;}};
}
