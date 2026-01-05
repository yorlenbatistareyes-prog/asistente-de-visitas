import{y as J,b as Me,aN as Le,G as H,h as w,av as Pe,a as Q,g as V,X as rr,D as ar,H as ir,F as ke,I as W,A as D,ah as tr,aJ as sr,an as Ce,q as R,aO as $,z as q,C as nr,R as Ie,M as or,aH as de,aP as He,aQ as lr,aR as fr,aS as ur,v as Ve,x as ze,aT as ne,a9 as Ue,aD as cr,aU as dr,aG as vr,w as Z,aV as hr,E as gr,aW as _r,Q as pr,J as Ge,aX as Fe,a7 as ve,aY as br,aZ as Er,a_ as he,a$ as Be,b0 as wr,b1 as Ar,b2 as Nr,b3 as yr,b4 as Sr,b5 as kr,b6 as Cr,b7 as Ir,b8 as Or,ad as Tr,e as x,a8 as qe,b9 as ge,p as Rr,m as $r,i as z,n as mr,s as Dr,o as Wr,l as ie,ae as Mr,ba as Lr}from"./DVJt41qR.js";import{d as Pr,i as Hr,g as X,j as Vr,k as zr,l as Ur,n as Gr,o as Fr,p as Br,a as j,c as te}from"./CxbY8cp_.js";import{i as qr}from"./BDIlk-Ch.js";import{B as jr,l as Y,p as P,s as _e}from"./DgNG_9Sq.js";function Yr(e,r){return r}function Xr(e,r,a){for(var i=[],t=r.length,s,n=r.length,o=0;o<t;o++){let g=r[o];ze(g,()=>{if(s){if(s.pending.delete(g),s.done.add(g),s.pending.size===0){var c=e.outrogroups;ce(de(s.done)),c.delete(s),c.size===0&&(e.outrogroups=null)}}else n-=1},!1)}if(n===0){var f=i.length===0&&a!==null;if(f){var v=a,u=v.parentNode;vr(u),u.append(v),e.items.clear()}ce(r,!f)}else s={pending:new Set(r),done:new Set},(e.outrogroups??(e.outrogroups=new Set)).add(s)}function ce(e,r=!0){for(var a=0;a<e.length;a++)Z(e[a],r)}var Oe;function Jr(e,r,a,i,t,s=null){var n=e,o=new Map,f=(r&Le)!==0;if(f){var v=e;n=w?H(Pe(v)):v.appendChild(J())}w&&Q();var u=null,g=rr(()=>{var d=a();return He(d)?d:d==null?[]:de(d)}),c,p=!0;function A(){l.fallback=u,Kr(l,c,n,r,i),u!==null&&(c.length===0?(u.f&$)===0?Ve(u):(u.f^=$,F(u,null,n)):ze(u,()=>{u=null}))}var N=Me(()=>{c=V(g);var d=c.length;let O=!1;if(w){var k=ar(n)===ir;k!==(d===0)&&(n=ke(),H(n),W(!1),O=!0)}for(var b=new Set,I=R,_=nr(),h=0;h<d;h+=1){w&&D.nodeType===tr&&D.data===sr&&(n=D,O=!0,W(!1));var y=c[h],C=i(y,h),E=p?null:o.get(C);E?(E.v&&Ce(E.v,y),E.i&&Ce(E.i,h),_&&I.skipped_effects.delete(E.e)):(E=Qr(o,p?n:Oe??(Oe=J()),y,C,h,t,r,a),p||(E.e.f|=$),o.set(C,E)),b.add(C)}if(d===0&&s&&!u&&(p?u=q(()=>s(n)):(u=q(()=>s(Oe??(Oe=J()))),u.f|=$)),w&&d>0&&H(ke()),!p)if(_){for(const[M,L]of o)b.has(M)||I.skipped_effects.add(L.e);I.oncommit(A),I.ondiscard(()=>{})}else A();O&&W(!0),V(g)}),l={effect:N,items:o,outrogroups:null,fallback:u};p=!1,w&&(n=D)}function Kr(e,r,a,i,t){var E,M,L,be,Ee,we,Ae,Ne,ye;var s=(i&dr)!==0,n=r.length,o=e.items,f=e.effect.first,v,u=null,g,c=[],p=[],A,N,l,d;if(s)for(d=0;d<n;d+=1)A=r[d],N=t(A,d),l=o.get(N).e,(l.f&$)===0&&((M=(E=l.nodes)==null?void 0:E.a)==null||M.measure(),(g??(g=new Set)).add(l));for(d=0;d<n;d+=1){if(A=r[d],N=t(A,d),l=o.get(N).e,e.outrogroups!==null)for(const T of e.outrogroups)T.pending.delete(l),T.done.delete(l);if((l.f&$)!==0)if(l.f^=$,l===f)F(l,null,a);else{var O=u?u.next:f;l===e.effect.last&&(e.effect.last=l.prev),l.prev&&(l.prev.next=l.next),l.next&&(l.next.prev=l.prev),m(e,u,l),m(e,l,O),F(l,O,a),u=l,c=[],p=[],f=u.next;continue}if((l.f&ne)!==0&&(Ve(l),s&&((be=(L=l.nodes)==null?void 0:L.a)==null||be.unfix(),(g??(g=new Set)).delete(l))),l!==f){if(v!==void 0&&v.has(l)){if(c.length<p.length){var k=p[0],b;u=k.prev;var I=c[0],_=c[c.length-1];for(b=0;b<c.length;b+=1)F(c[b],k,a);for(b=0;b<p.length;b+=1)v.delete(p[b]);m(e,I.prev,_.next),m(e,u,I),m(e,_,k),f=k,u=_,d-=1,c=[],p=[]}else v.delete(l),F(l,f,a),m(e,l.prev,l.next),m(e,l,u===null?e.effect.first:u.next),m(e,u,l),u=l;continue}for(c=[],p=[];f!==null&&f!==l;)(v??(v=new Set)).add(f),p.push(f),f=f.next;if(f===null)continue}(l.f&$)===0&&c.push(l),u=l,f=l.next}if(e.outrogroups!==null){for(const T of e.outrogroups)T.pending.size===0&&(ce(de(T.done)),(Ee=e.outrogroups)==null||Ee.delete(T));e.outrogroups.size===0&&(e.outrogroups=null)}if(f!==null||v!==void 0){var h=[];if(v!==void 0)for(l of v)(l.f&ne)===0&&h.push(l);for(;f!==null;)(f.f&ne)===0&&f!==e.fallback&&h.push(f),f=f.next;var y=h.length;if(y>0){var C=(i&Le)!==0&&n===0?a:null;if(s){for(d=0;d<y;d+=1)(Ae=(we=h[d].nodes)==null?void 0:we.a)==null||Ae.measure();for(d=0;d<y;d+=1)(ye=(Ne=h[d].nodes)==null?void 0:Ne.a)==null||ye.fix()}Xr(e,h,C)}}s&&Ue(()=>{var T,Se;if(g!==void 0)for(l of g)(Se=(T=l.nodes)==null?void 0:T.a)==null||Se.apply()})}function Qr(e,r,a,i,t,s,n,o){var f=(n&lr)!==0?(n&fr)===0?or(a,!1,!1):Ie(a):null,v=(n&ur)!==0?Ie(t):null;return{v:f,i:v,e:q(()=>(s(r,f??a,v??t,o),()=>{e.delete(i)}))}}function F(e,r,a){if(e.nodes)for(var i=e.nodes.start,t=e.nodes.end,s=r&&(r.f&$)===0?r.nodes.start:a;i!==null;){var n=cr(i);if(s.before(i),i===t)return;i=n}}function m(e,r,a){r===null?e.effect.first=a:r.next=a,a===null?e.effect.last=r:a.prev=r}function se(e,r,a,i,t){var o;w&&Q();var s=(o=r.$$slots)==null?void 0:o[a],n=!1;s===!0&&(s=r.children,n=!0),s===void 0||s(e,n?()=>i:i)}function Zr(e,r,a,i,t,s){let n=w;w&&Q();var o=null;w&&D.nodeType===hr&&(o=D,Q());var f=w?D:e,v=new jr(f,!1);Me(()=>{const u=r()||null;var g=_r;if(u===null){v.ensure(null,null),X(!0);return}return v.ensure(u,c=>{if(u){if(o=w?o:document.createElementNS(g,u),Pr(o,o),i){w&&Hr(u)&&o.append(document.createComment(""));var p=w?Pe(o):o.appendChild(J());w&&(p===null?W(!1):H(p)),i(o,p)}pr.nodes.end=o,c.before(o)}w&&H(c)}),X(!0),()=>{u&&X(!1)}},gr),Ge(()=>{X(!0)}),n&&(W(!0),H(f))}function xr(e,r){var a=void 0,i;Fe(()=>{a!==(a=r())&&(i&&(Z(i),i=null),a&&(i=q(()=>{ve(()=>a(e))})))})}function je(e){var r,a,i="";if(typeof e=="string"||typeof e=="number")i+=e;else if(typeof e=="object")if(Array.isArray(e)){var t=e.length;for(r=0;r<t;r++)e[r]&&(a=je(e[r]))&&(i&&(i+=" "),i+=a)}else for(a in e)e[a]&&(i&&(i+=" "),i+=a);return i}function ea(){for(var e,r,a=0,i="",t=arguments.length;a<t;a++)(e=arguments[a])&&(r=je(e))&&(i&&(i+=" "),i+=r);return i}function ra(e){return typeof e=="object"?ea(e):e??""}const Te=[...` 	
\r\f \v\uFEFF`];function aa(e,r,a){var i=e==null?"":""+e;if(r&&(i=i?i+" "+r:r),a){for(var t in a)if(a[t])i=i?i+" "+t:t;else if(i.length)for(var s=t.length,n=0;(n=i.indexOf(t,n))>=0;){var o=n+s;(n===0||Te.includes(i[n-1]))&&(o===i.length||Te.includes(i[o]))?i=(n===0?"":i.substring(0,n))+i.substring(o+1):n=o}}return i===""?null:i}function Re(e,r=!1){var a=r?" !important;":";",i="";for(var t in e){var s=e[t];s!=null&&s!==""&&(i+=" "+t+": "+s+a)}return i}function oe(e){return e[0]!=="-"||e[1]!=="-"?e.toLowerCase():e}function ia(e,r){if(r){var a="",i,t;if(Array.isArray(r)?(i=r[0],t=r[1]):i=r,e){e=String(e).replaceAll(/\s*\/\*.*?\*\/\s*/g,"").trim();var s=!1,n=0,o=!1,f=[];i&&f.push(...Object.keys(i).map(oe)),t&&f.push(...Object.keys(t).map(oe));var v=0,u=-1;const N=e.length;for(var g=0;g<N;g++){var c=e[g];if(o?c==="/"&&e[g-1]==="*"&&(o=!1):s?s===c&&(s=!1):c==="/"&&e[g+1]==="*"?o=!0:c==='"'||c==="'"?s=c:c==="("?n++:c===")"&&n--,!o&&s===!1&&n===0){if(c===":"&&u===-1)u=g;else if(c===";"||g===N-1){if(u!==-1){var p=oe(e.substring(v,u).trim());if(!f.includes(p)){c!==";"&&g++;var A=e.substring(v,g).trim();a+=" "+A+";"}}v=g+1,u=-1}}}}return i&&(a+=Re(i)),t&&(a+=Re(t,!0)),a=a.trim(),a===""?null:a}return e==null?null:String(e)}function ta(e,r,a,i,t,s){var n=e.__className;if(w||n!==a||n===void 0){var o=aa(a,i,s);(!w||o!==e.getAttribute("class"))&&(o==null?e.removeAttribute("class"):r?e.className=o:e.setAttribute("class",o)),e.__className=a}else if(s&&t!==s)for(var f in s){var v=!!s[f];(t==null||v!==!!t[f])&&e.classList.toggle(f,v)}return s}function le(e,r={},a,i){for(var t in a){var s=a[t];r[t]!==s&&(a[t]==null?e.style.removeProperty(t):e.style.setProperty(t,s,i))}}function sa(e,r,a,i){var t=e.__style;if(w||t!==r){var s=ia(r,i);(!w||s!==e.getAttribute("style"))&&(s==null?e.removeAttribute("style"):e.style.cssText=s),e.__style=r}else i&&(Array.isArray(i)?(le(e,a==null?void 0:a[0],i[0]),le(e,a==null?void 0:a[1],i[1],"important")):le(e,a,i));return i}function ee(e,r,a=!1){if(e.multiple){if(r==null)return;if(!He(r))return br();for(var i of e.options)i.selected=r.includes(B(i));return}for(i of e.options){var t=B(i);if(Er(t,r)){i.selected=!0;return}}(!a||r!==void 0)&&(e.selectedIndex=-1)}function Ye(e){var r=new MutationObserver(()=>{ee(e,e.__value)});r.observe(e,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["value"]}),Ge(()=>{r.disconnect()})}function wa(e,r,a=r){var i=new WeakSet,t=!0;he(e,"change",s=>{var n=s?"[selected]":":checked",o;if(e.multiple)o=[].map.call(e.querySelectorAll(n),B);else{var f=e.querySelector(n)??e.querySelector("option:not([disabled])");o=f&&B(f)}a(o),R!==null&&i.add(R)}),ve(()=>{var s=r();if(e===document.activeElement){var n=Be??R;if(i.has(n))return}if(ee(e,s,t),t&&s===void 0){var o=e.querySelector(":checked");o!==null&&(s=B(o),a(s))}e.__value=s,t=!1}),Ye(e)}function B(e){return"__value"in e?e.__value:e.value}const U=Symbol("class"),G=Symbol("style"),Xe=Symbol("is custom element"),Je=Symbol("is html");function na(e){if(w){var r=!1,a=()=>{if(!r){if(r=!0,e.hasAttribute("value")){var i=e.value;re(e,"value",null),e.value=i}if(e.hasAttribute("checked")){var t=e.checked;re(e,"checked",null),e.checked=t}}};e.__on_r=a,Ue(a),Sr()}}function oa(e,r){r?e.hasAttribute("selected")||e.setAttribute("selected",""):e.removeAttribute("selected")}function re(e,r,a,i){var t=Ke(e);w&&(t[r]=e.getAttribute(r),r==="src"||r==="srcset"||r==="href"&&e.nodeName==="LINK")||t[r]!==(t[r]=a)&&(r==="loading"&&(e[Ir]=a),a==null?e.removeAttribute(r):typeof a!="string"&&Qe(e).includes(r)?e[r]=a:e.setAttribute(r,a))}function la(e,r,a,i,t=!1,s=!1){if(w&&t&&e.tagName==="INPUT"){var n=e,o=n.type==="checkbox"?"defaultChecked":"defaultValue";o in a||na(n)}var f=Ke(e),v=f[Xe],u=!f[Je];let g=w&&v;g&&W(!1);var c=r||{},p=e.tagName==="OPTION";for(var A in r)A in a||(a[A]=null);a.class?a.class=ra(a.class):a[U]&&(a.class=null),a[G]&&(a.style??(a.style=null));var N=Qe(e);for(const _ in a){let h=a[_];if(p&&_==="value"&&h==null){e.value=e.__value="",c[_]=h;continue}if(_==="class"){var l=e.namespaceURI==="http://www.w3.org/1999/xhtml";ta(e,l,h,i,r==null?void 0:r[U],a[U]),c[_]=h,c[U]=a[U];continue}if(_==="style"){sa(e,h,r==null?void 0:r[G],a[G]),c[_]=h,c[G]=a[G];continue}var d=c[_];if(!(h===d&&!(h===void 0&&e.hasAttribute(_)))){c[_]=h;var O=_[0]+_[1];if(O!=="$$")if(O==="on"){const y={},C="$$"+_;let E=_.slice(2);var k=Fr(E);if(Vr(E)&&(E=E.slice(0,-7),y.capture=!0),!k&&d){if(h!=null)continue;e.removeEventListener(E,c[C],y),c[C]=null}if(h!=null)if(k)e[`__${E}`]=h,Ur([E]);else{let M=function(L){c[_].call(this,L)};c[C]=zr(E,e,M,y)}else k&&(e[`__${E}`]=void 0)}else if(_==="style")re(e,_,h);else if(_==="autofocus")Nr(e,!!h);else if(!v&&(_==="__value"||_==="value"&&h!=null))e.value=e.__value=h;else if(_==="selected"&&p)oa(e,h);else{var b=_;u||(b=Gr(b));var I=b==="defaultValue"||b==="defaultChecked";if(h==null&&!v&&!I)if(f[_]=null,b==="value"||b==="checked"){let y=e;const C=r===void 0;if(b==="value"){let E=y.defaultValue;y.removeAttribute(b),y.defaultValue=E,y.value=y.__value=C?E:null}else{let E=y.defaultChecked;y.removeAttribute(b),y.defaultChecked=E,y.checked=C?E:!1}}else e.removeAttribute(_);else I||N.includes(b)&&(v||typeof h!="string")?(e[b]=h,b in f&&(f[b]=yr)):typeof h!="function"&&re(e,b,h)}}}return g&&W(!0),c}function $e(e,r,a=[],i=[],t=[],s,n=!1,o=!1){wr(t,a,i,f=>{var v=void 0,u={},g=e.nodeName==="SELECT",c=!1;if(Fe(()=>{var A=r(...f.map(V)),N=la(e,v,A,s,n,o);c&&g&&"value"in A&&ee(e,A.value);for(let d of Object.getOwnPropertySymbols(u))A[d]||Z(u[d]);for(let d of Object.getOwnPropertySymbols(A)){var l=A[d];d.description===Ar&&(!v||l!==v[d])&&(u[d]&&Z(u[d]),u[d]=q(()=>xr(e,()=>l))),N[d]=l}v=N}),g){var p=e;ve(()=>{ee(p,v.value,!0),Ye(p)})}c=!0})}function Ke(e){return e.__attributes??(e.__attributes={[Xe]:e.nodeName.includes("-"),[Je]:e.namespaceURI===kr})}var me=new Map;function Qe(e){var r=e.getAttribute("is")||e.nodeName,a=me.get(r);if(a)return a;me.set(r,a=[]);for(var i,t=e,s=Element.prototype;s!==t;){i=Or(t);for(var n in i)i[n].set&&a.push(n);t=Cr(t)}return a}function Aa(e,r,a=r){var i=new WeakSet;he(e,"input",async t=>{var s=t?e.defaultValue:e.value;if(s=fe(e)?ue(s):s,a(s),R!==null&&i.add(R),await Tr(),s!==(s=r())){var n=e.selectionStart,o=e.selectionEnd,f=e.value.length;if(e.value=s??"",o!==null){var v=e.value.length;n===o&&o===f&&v>f?(e.selectionStart=v,e.selectionEnd=v):(e.selectionStart=n,e.selectionEnd=Math.min(o,v))}}}),(w&&e.defaultValue!==e.value||x(r)==null&&e.value)&&(a(fe(e)?ue(e.value):e.value),R!==null&&i.add(R)),qe(()=>{var t=r();if(e===document.activeElement){var s=Be??R;if(i.has(s))return}fe(e)&&t===ue(e.value)||e.type==="date"&&!t&&!e.value||t!==e.value&&(e.value=t??"")})}function Na(e,r,a=r){he(e,"change",i=>{var t=i?e.defaultChecked:e.checked;a(t)}),(w&&e.defaultChecked!==e.checked||x(r)==null)&&a(e.checked),qe(()=>{var i=r();e.checked=!!i})}function fe(e){var r=e.type;return r==="number"||r==="range"}function ue(e){return e===""?null:+e}function ya(e){return function(...r){var a=r[0];a.target===this&&(e==null||e.apply(this,r))}}const Sa=ge("HG-06"),ka=ge([]);function fa(e,r,a,i){if(typeof r=="function"?e!==r||!i:!r.has(e))throw new TypeError("Cannot read private member from an object whose class did not declare it");return a==="m"?i:a==="a"?i.call(e):i?i.value:r.get(e)}function ua(e,r,a,i,t){if(typeof r=="function"?e!==r||!0:!r.has(e))throw new TypeError("Cannot write private member to an object whose class did not declare it");return r.set(e,a),a}var K;function ca(e,r=!1){return window.__TAURI_INTERNALS__.transformCallback(e,r)}async function S(e,r={},a){return window.__TAURI_INTERNALS__.invoke(e,r,a)}class da{get rid(){return fa(this,K,"f")}constructor(r){K.set(this,void 0),ua(this,K,r)}async close(){return S("plugin:resources|close",{rid:this.rid})}}K=new WeakMap;var De;(function(e){e.WINDOW_RESIZED="tauri://resize",e.WINDOW_MOVED="tauri://move",e.WINDOW_CLOSE_REQUESTED="tauri://close-requested",e.WINDOW_DESTROYED="tauri://destroyed",e.WINDOW_FOCUS="tauri://focus",e.WINDOW_BLUR="tauri://blur",e.WINDOW_SCALE_FACTOR_CHANGED="tauri://scale-change",e.WINDOW_THEME_CHANGED="tauri://theme-changed",e.WINDOW_CREATED="tauri://window-created",e.WEBVIEW_CREATED="tauri://webview-created",e.DRAG_ENTER="tauri://drag-enter",e.DRAG_OVER="tauri://drag-over",e.DRAG_DROP="tauri://drag-drop",e.DRAG_LEAVE="tauri://drag-leave"})(De||(De={}));async function va(e,r){window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(e,r),await S("plugin:event|unlisten",{event:e,eventId:r})}async function We(e,r,a){var i;const t=(i=void 0)!==null&&i!==void 0?i:{kind:"Any"};return S("plugin:event|listen",{event:e,target:t,handler:ca(r)}).then(s=>async()=>va(e,s))}async function Ze(e,r){return await ae.load(e,r)}class ae extends da{constructor(r){super(r)}static async load(r,a){const i=await S("plugin:store|load",{path:r,options:a});return new ae(i)}static async get(r){return await S("plugin:store|get_store",{path:r}).then(a=>a?new ae(a):null)}async set(r,a){await S("plugin:store|set",{rid:this.rid,key:r,value:a})}async get(r){const[a,i]=await S("plugin:store|get",{rid:this.rid,key:r});return i?a:void 0}async has(r){return await S("plugin:store|has",{rid:this.rid,key:r})}async delete(r){return await S("plugin:store|delete",{rid:this.rid,key:r})}async clear(){await S("plugin:store|clear",{rid:this.rid})}async reset(){await S("plugin:store|reset",{rid:this.rid})}async keys(){return await S("plugin:store|keys",{rid:this.rid})}async values(){return await S("plugin:store|values",{rid:this.rid})}async entries(){return await S("plugin:store|entries",{rid:this.rid})}async length(){return await S("plugin:store|length",{rid:this.rid})}async reload(r){await S("plugin:store|reload",{rid:this.rid,...r})}async save(){await S("plugin:store|save",{rid:this.rid})}async onKeyChange(r,a){return await We("store://change",i=>{i.payload.resourceId===this.rid&&i.payload.key===r&&a(i.payload.exists?i.payload.value:void 0)})}async onChange(r){return await We("store://change",a=>{a.payload.resourceId===this.rid&&r(a.payload.key,a.payload.exists?a.payload.value:void 0)})}}const xe=ge({}),er={defaults:{},autoSave:!0};async function Ca(){try{const r=await(await Ze("datos_visitas.json",er)).get("registro_analisis");r&&xe.set(r)}catch(e){console.error("Error al cargar desde Windows:",e)}}async function Ia(e){try{xe.set(e);const r=await Ze("datos_visitas.json",er);await r.set("registro_analisis",e),await r.save()}catch(r){console.error("Error al guardar en el JSON:",r)}}/**
 * @license lucide-svelte v0.562.0 - ISC
 *
 * ISC License
 * 
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * 
 * ---
 * 
 * The MIT License (MIT) (for portions derived from Feather)
 * 
 * Copyright (c) 2013-2023 Cole Bemis
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */const ha={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var ga=Br("<svg><!><!></svg>");function pe(e,r){const a=Y(r,["children","$$slots","$$events","$$legacy"]),i=Y(a,["name","color","size","strokeWidth","absoluteStrokeWidth","iconNode"]);Rr(r,!1);let t=P(r,"name",8,void 0),s=P(r,"color",8,"currentColor"),n=P(r,"size",8,24),o=P(r,"strokeWidth",8,2),f=P(r,"absoluteStrokeWidth",8,!1),v=P(r,"iconNode",24,()=>[]);const u=(...A)=>A.filter((N,l,d)=>!!N&&d.indexOf(N)===l).join(" ");qr();var g=ga();$e(g,(A,N)=>({...ha,...i,width:n(),height:n(),stroke:s(),"stroke-width":A,class:N}),[()=>(z(f()),z(o()),z(n()),x(()=>f()?Number(o())*24/Number(n()):o())),()=>(z(t()),z(a),x(()=>u("lucide-icon","lucide",t()?`lucide-${t()}`:"",a.class)))]);var c=mr(g);Jr(c,1,v,Yr,(A,N)=>{var l=Mr(()=>Lr(V(N),2));let d=()=>V(l)[0],O=()=>V(l)[1];var k=te(),b=ie(k);Zr(b,d,!0,(I,_)=>{$e(I,()=>({...O()}))}),j(A,k)});var p=Dr(c);se(p,r,"default",{}),Wr(g),j(e,g),$r()}function Oa(e,r){const a=Y(r,["children","$$slots","$$events","$$legacy"]);/**
 * @license lucide-svelte v0.562.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */const i=[["path",{d:"M5 12h14"}],["path",{d:"M12 5v14"}]];pe(e,_e({name:"plus"},()=>a,{get iconNode(){return i},children:(t,s)=>{var n=te(),o=ie(n);se(o,r,"default",{}),j(t,n)},$$slots:{default:!0}}))}function Ta(e,r){const a=Y(r,["children","$$slots","$$events","$$legacy"]);/**
 * @license lucide-svelte v0.562.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */const i=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"}],["circle",{cx:"12",cy:"12",r:"3"}]];pe(e,_e({name:"settings"},()=>a,{get iconNode(){return i},children:(t,s)=>{var n=te(),o=ie(n);se(o,r,"default",{}),j(t,n)},$$slots:{default:!0}}))}function Ra(e,r){const a=Y(r,["children","$$slots","$$events","$$legacy"]);/**
 * @license lucide-svelte v0.562.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */const i=[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]];pe(e,_e({name:"x"},()=>a,{get iconNode(){return i},children:(t,s)=>{var n=te(),o=ie(n);se(o,r,"default",{}),j(t,n)},$$slots:{default:!0}}))}export{pe as I,Oa as P,da as R,Ta as S,Ra as X,ta as a,Aa as b,ya as c,Ca as d,Jr as e,Sa as f,wa as g,Na as h,Yr as i,S as j,Ia as k,ka as l,xe as o,na as r,se as s};
