/* crop-jig.js  (dev tool, never runs for visitors)

   Open any page with ?jig on the URL, e.g.  http://localhost:8000/?jig
   Every cover-cropped photo on the page gets a dashed outline and becomes draggable.
   Drag to move the focal point; scroll-wheel over a photo to zoom (double-click resets).
   A badge shows the live value; the HUD in the corner lists every value you touched,
   with a Copy all button. Paste that list to your AI and ask it to bake the values in:
   the AI puts them on the element as an inline style (object-position for an <img>,
   background-position for a wash), which wins at every screen width.

   Loaded by the one-line loader at the end of each page, only when ?jig is present.
   Targets: the template's photo slots (below) plus anything with a data-jig attribute.
   data-jig="drag" disables zoom for that element (used on the homepage hero, whose
   parallax owns the transform property).                                             */
(function(){
  if(location.search.indexOf('jig')===-1) return;
  var pop=(getComputedStyle(document.documentElement).getPropertyValue('--pop')||'').trim()||'#3f6fff';
  var TARGETS='.hero__img,.post-hero img,.cover__bg img,figure.tall img,figure.media img,.ba img,[data-jig]';

  var hud=document.createElement('div');
  hud.style.cssText='position:fixed;left:16px;bottom:16px;z-index:5000;background:rgba(10,13,16,.94);border:1px solid '+pop+';border-radius:12px;padding:12px 14px;font:12px/1.5 ui-monospace,Menlo,monospace;color:#f3f4f7;max-width:520px;max-height:44vh;overflow:auto;white-space:pre;';
  var btn=document.createElement('button'); btn.textContent='Copy all'; btn.style.cssText='display:block;margin-bottom:8px;background:'+pop+';color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer;';
  var grip=document.createElement('div'); grip.textContent='☰ crop jig  (drag me)'; grip.style.cssText='cursor:move;color:'+pop+';font-weight:700;margin-bottom:8px;user-select:none;';
  var list=document.createElement('div'); hud.appendChild(grip); hud.appendChild(btn); hud.appendChild(list); document.body.appendChild(hud);
  (function(){ var d=null;
    grip.addEventListener('pointerdown',function(e){ var r=hud.getBoundingClientRect(); d=[e.clientX-r.left,e.clientY-r.top]; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
    grip.addEventListener('pointermove',function(e){ if(!d) return; hud.style.left=(e.clientX-d[0])+'px'; hud.style.top=(e.clientY-d[1])+'px'; hud.style.bottom='auto'; });
    grip.addEventListener('pointerup',function(){ d=null; }); })();

  var vals={};
  function key(el){
    var sec=el.closest('section[id],.page[id],article[id]');
    var src=el.tagName==='IMG'?(el.getAttribute('src')||''):(el.style.backgroundImage||getComputedStyle(el).backgroundImage||'').replace(/^url\(["']?|["']?\)$/g,'');
    return (sec?sec.id:location.pathname.split('/').pop()||'index')+' :: '+(src.split('/').pop()||el.className);
  }
  function render(){ list.textContent=Object.keys(vals).map(function(k){ return k+'  ->  '+vals[k]; }).join('\n')||'(drag a photo)'; }
  btn.onclick=function(){ try{ navigator.clipboard.writeText(list.textContent); btn.textContent='Copied'; setTimeout(function(){btn.textContent='Copy all';},900);}catch(e){} };

  [].slice.call(document.querySelectorAll(TARGETS)).forEach(function(el){
    var isBg=el.tagName!=='IMG';
    var noZoom=isBg||el.getAttribute('data-jig')==='drag';
    el.style.pointerEvents='auto'; el.style.cursor='grab'; el.style.outline='1px dashed '+pop;
    /* photos that sit behind text (hero, case-study cover) are unreachable by the pointer; lift them and any z-indexed ancestor while the jig is on */
    (function(n){ while(n && !n.matches('section,.page,main,body')){ if(getComputedStyle(n).zIndex!=='auto'){ n.style.zIndex='4000'; } if(getComputedStyle(n).pointerEvents==='none'){ n.style.pointerEvents='auto'; } n=n.parentElement; } })(el);
    var badge=document.createElement('div'); badge.style.cssText='position:absolute;left:8px;top:8px;z-index:6000;background:'+pop+';color:#fff;font:11px/1 ui-monospace,Menlo,monospace;padding:4px 7px;border-radius:6px;pointer-events:none;';
    var wrap=isBg?el:el.parentElement; if(getComputedStyle(wrap).position==='static') wrap.style.position='relative'; wrap.appendChild(badge);
    function get(){ var v=isBg?(el.style.backgroundPosition||getComputedStyle(el).backgroundPosition):(el.style.objectPosition||getComputedStyle(el).objectPosition); var m=v.match(/([\d.]+)%\s+([\d.]+)%/); return m?[+m[1],+m[2]]:[50,50]; }
    var pos=get(); var zoom=(function(){ var m=(el.style.transform||'').match(/scale\(([\d.]+)\)/); return m?+m[1]:1; })();
    function set(){
      var v=pos[0].toFixed(0)+'% '+pos[1].toFixed(0)+'%'; var z=zoom>1.001;
      if(isBg){ el.style.backgroundPosition=v; }
      else { el.style.objectPosition=v; if(!noZoom){ el.style.transformOrigin=v; el.style.transform=z?'scale('+zoom.toFixed(2)+')':''; } }
      badge.textContent=v+(z?'  @'+zoom.toFixed(2)+'x':'');
      vals[key(el)]=(isBg?'background-position: ':'object-position: ')+v+(z?'; transform: scale('+zoom.toFixed(2)+'); transform-origin: '+v:'');
      render();
    }
    set();
    if(!noZoom){
      el.addEventListener('wheel',function(e){ e.preventDefault(); zoom=Math.max(1,Math.min(3,zoom*(e.deltaY<0?1.04:1/1.04))); set(); },{passive:false});
      el.addEventListener('dblclick',function(){ zoom=1; set(); });
    }
    var drag=null;
    el.addEventListener('pointerdown',function(e){ drag=[e.clientX,e.clientY,pos[0],pos[1]]; el.setPointerCapture(e.pointerId); e.preventDefault(); });
    el.addEventListener('pointermove',function(e){ if(!drag) return; var r=el.getBoundingClientRect(); pos=[Math.max(0,Math.min(100,drag[2]-(e.clientX-drag[0])/r.width*100)), Math.max(0,Math.min(100,drag[3]-(e.clientY-drag[1])/r.height*100))]; set(); });
    el.addEventListener('pointerup',function(){ drag=null; });
  });
  render();
})();
