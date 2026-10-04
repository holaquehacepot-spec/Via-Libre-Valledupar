import {useEffect,useRef,useState} from 'react';
export type Report={id:string;kind:string;address:string;lat:number;lng:number;observed:string;note:string;status:string;photo:string|null;created:string;history:string;example:number};
const colors:Record<string,string>={'Recibido':'#2369a7','En revisión':'#d38312','Validado':'#087953','Atendido/Cerrado':'#566374','Descartado':'#9d465a'};
const empty={type:'FeatureCollection',features:[]} as const;
let loading:Promise<any>|null=null;
function mapLibrary(){
 if(!loading){
  if(!document.querySelector('link[data-via-map-style]')){
   const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/maplibre-gl@6.12.0/dist/maplibre-gl.css';css.dataset.viaMapStyle='true';document.head.appendChild(css);
  }
  const moduleURL='https://unpkg.com/maplibre-gl@6.12.0/dist/maplibre-gl.mjs';
  loading=import(moduleURL).catch(error=>{loading=null;throw error;});
 }
 return loading;
}
function densityFeatures(reports:Report[]){
 const groups=new Map<string,Report[]>();
 reports.filter(r=>!['Descartado','Atendido/Cerrado'].includes(r.status)).forEach(r=>{
  const key=Math.floor(r.lat/.002)+':'+Math.floor(r.lng/.002);groups.set(key,[...(groups.get(key)||[]),r]);
 });
 return {type:'FeatureCollection',features:[...groups.values()].map(rows=>{
  const lat=rows.reduce((s,r)=>s+r.lat,0)/rows.length,lng=rows.reduce((s,r)=>s+r.lng,0)/rows.length;
  const radius=100+rows.length*35;
  const ring=Array.from({length:65},(_,i)=>{const angle=i/64*2*Math.PI;return [lng+radius*Math.cos(angle)/(111320*Math.cos(lat*Math.PI/180)),lat+radius*Math.sin(angle)/111320];});
  return {type:'Feature',properties:{count:rows.length,opacity:Math.min(.25+rows.length*.1,.75)},geometry:{type:'Polygon',coordinates:[ring]}};
 })};
}
export default function MapView({reports=[],point,onPoint,onSelect,heat=false}:{reports?:Report[];point?:[number,number]|null;onPoint?:(p:[number,number])=>void;onSelect?:(r:Report)=>void;heat?:boolean}){
 const element=useRef<HTMLDivElement>(null),map=useRef<any>(null),library=useRef<any>(null),markers=useRef<any[]>([]);
 const callbacks=useRef({onPoint,onSelect});callbacks.current={onPoint,onSelect};
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true,observer:ResizeObserver|undefined;
  const timeout=window.setTimeout(()=>{if(active)setError(true);},18000);
  mapLibrary().then(lib=>{
   if(!active||!element.current)return;
   library.current=lib;
   const m=new lib.Map({container:element.current,style:'https://tiles.openfreemap.org/styles/liberty',
    center:[-73.249,10.475],zoom:13,maxZoom:19,scrollZoom:false,dragRotate:false,touchPitch:false,
    pitchWithRotate:false,attributionControl:false,
    locale:{'NavigationControl.ZoomIn':'Acercar','NavigationControl.ZoomOut':'Alejar','AttributionControl.ToggleAttribution':'Mostrar créditos'}});
   map.current=m;
   m.addControl(new lib.NavigationControl({showCompass:false}),'top-left');
   m.addControl(new lib.AttributionControl({compact:false}),'bottom-right');
   m.on('error',()=>{if(active)setError(true);});
   m.on('load',()=>{
    if(!active)return;window.clearTimeout(timeout);
    m.addSource('report-density',{type:'geojson',data:empty});
    m.addLayer({id:'report-density-fill',type:'fill',source:'report-density',paint:{'fill-color':'#eea247','fill-opacity':['get','opacity']}});
    m.addLayer({id:'report-density-border',type:'line',source:'report-density',paint:{'line-color':'#cb650d','line-width':1}});
    setError(false);setReady(true);
   });
   m.on('click',(e:any)=>callbacks.current.onPoint?.([e.lngLat.lat,e.lngLat.lng]));
   if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(()=>{if(active)m.resize();});observer.observe(element.current);}
  }).catch(()=>{if(active)setError(true);});
  return()=>{
   active=false;window.clearTimeout(timeout);observer?.disconnect();
   markers.current.forEach(item=>{item.popup?.remove();item.marker.remove();});markers.current=[];
   map.current?.remove();map.current=null;
  };
 },[retry]);
 useEffect(()=>{
  if(!ready||!map.current||!library.current)return;
  const m=map.current,lib=library.current;
  markers.current.forEach(item=>{item.popup?.remove();item.marker.remove();});markers.current=[];
  m.getSource('report-density')?.setData(heat?densityFeatures(reports):empty);
  if(point){
   const marker=new lib.Marker({color:'#075b45'}).setLngLat([point[1],point[0]]).addTo(m);
   marker.getElement().setAttribute('aria-label','Ubicación seleccionada');
   markers.current.push({marker});m.easeTo({center:[point[1],point[0]],duration:0});
  }
  if(!heat)reports.forEach(r=>{
   const button=document.createElement('button');button.type='button';button.className='report-map-dot';button.style.backgroundColor=colors[r.status];
   const label=r.kind+' · '+r.address;button.setAttribute('aria-label','Abrir reporte: '+label);button.title=label;
   const item:any={marker:new lib.Marker({element:button}).setLngLat([r.lng,r.lat]).addTo(m)};
   button.addEventListener('click',e=>{e.stopPropagation();callbacks.current.onSelect?.(r);});
   button.addEventListener('mouseenter',()=>{item.popup=new lib.Popup({closeButton:false,closeOnClick:false,offset:15}).setLngLat([r.lng,r.lat]).setText(label).addTo(m);});
   button.addEventListener('mouseleave',()=>{item.popup?.remove();item.popup=undefined;});
   markers.current.push(item);
  });
 },[ready,reports,point,heat]);
 return <div className="map-wrapper"><div ref={element} className="map" role="region" aria-label={onPoint?'Mapa para seleccionar la ubicación':'Mapa de reportes de Valledupar'}/>{!ready&&!error&&<div className="map-message">Cargando mapa…</div>}{error&&<div className="map-error">No se pudo cargar el mapa. Revisa tu conexión o usa las coordenadas del formulario. <button type="button" onClick={()=>{setReady(false);setError(false);setRetry(r=>r+1);}}>Reintentar</button></div>}</div>;
}
