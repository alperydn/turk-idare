(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var norm=function(s){return s.toLocaleLowerCase('tr').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i')};

/* tema */
$('#themeBtn').addEventListener('click',function(){
  var d=document.documentElement,n=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=n;
  try{localStorage.setItem('theme',n)}catch(e){}
});

/* ilerleme */
var bar=$('#progress');
function prog(){var h=document.documentElement;var m=h.scrollHeight-h.clientHeight;bar.style.width=(m>0?h.scrollTop/m*100:0)+'%'}
addEventListener('scroll',prog,{passive:true});prog();

/* mobil menü */
function menu(o){document.body.classList.toggle('menu-open',o);$('#menuBtn').setAttribute('aria-expanded',o)}
$('#menuBtn').addEventListener('click',function(){menu(!document.body.classList.contains('menu-open'))});
$('#scrim').addEventListener('click',function(){menu(false)});
$$('#nav a').forEach(function(a){a.addEventListener('click',function(){menu(false)})});

/* h3 bağlantıları */
$$('.prose h3[id]').forEach(function(h){
  var a=document.createElement('a');a.className='anchor';a.href='#'+h.id;a.textContent='#';a.setAttribute('aria-label','Bağlantı');h.prepend(a);
});

/* scrollspy */
var heads=$$('.prose section.chapter, .prose h3[id]');
var navLinks={};$$('#nav a[data-id]').forEach(function(a){navLinks[a.dataset.id]=a});
var cur=null;
function spy(){
  var y=innerHeight*0.28,best=null;
  for(var i=0;i<heads.length;i++){
    var el=heads[i],t=el.tagName==='SECTION'?(el.querySelector('.ch-title')||el):el;
    if(t.getBoundingClientRect().top<=y)best=el;else if(el.tagName!=='SECTION')break;
  }
  if(!best){best=heads[0]}
  var sub=null,ch=null;
  if(best.tagName==='SECTION'){ch=best}else{sub=best;ch=best.closest('section.chapter')}
  var key=(sub?sub.id:'')+'|'+(ch?ch.id:'');
  if(key===cur)return;cur=key;
  $$('#nav .active').forEach(function(a){a.classList.remove('active')});
  $$('#nav .nav-ch.open').forEach(function(a){a.classList.remove('open')});
  if(ch){var top=navLinks[ch.id];if(top){top.classList.add('active');top.parentNode.classList.add('open')}}
  if(sub&&navLinks[sub.id]){var a=navLinks[sub.id];a.classList.add('active');
    var sb=$('#sidebar'),r=a.getBoundingClientRect(),sr=sb.getBoundingClientRect();
    if(r.top<sr.top+40||r.bottom>sr.bottom-40)sb.scrollTop+=r.top-sr.top-sr.height/2}
  else if(ch&&navLinks[ch.id]){var b=navLinks[ch.id],sb2=$('#sidebar'),r2=b.getBoundingClientRect(),s2=sb2.getBoundingClientRect();
    if(r2.top<s2.top+20||r2.bottom>s2.bottom-20)sb2.scrollTop+=r2.top-s2.top-60}
}
var tick=false;addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(function(){spy();tick=false})}},{passive:true});spy();

/* tablolar: sırala + filtre */
function cellVal(td){
  var t=td.textContent.trim(),n=t.replace(/\s/g,'').replace(/\./g,'').replace(',','.').match(/^[~≈]?(-?\d+(\.\d+)?)/);
  return n?{n:parseFloat(n[1]),s:t}:{n:null,s:norm(t)};
}
$$('.table-wrap').forEach(function(w){
  var tb=$('table',w),rows=+w.dataset.rows,body=$('tbody',tb);
  var sc=document.createElement('div');sc.className='tw-scroll';tb.parentNode.insertBefore(sc,tb);sc.appendChild(tb);
  var bodyRows=$$('tr',body);
  if(rows>=8){
    var b=document.createElement('div');b.className='tw-bar';
    b.innerHTML='<input type="search" placeholder="Tabloda filtrele…" aria-label="Tabloda filtrele"><span class="cnt">'+rows+' satır</span>';
    w.insertBefore(b,sc);
    var inp=$('input',b),cnt=$('.cnt',b),nm=document.createElement('div');nm.className='no-match';nm.textContent='Eşleşen satır yok.';nm.hidden=true;w.appendChild(nm);
    inp.addEventListener('input',function(){
      var q=norm(inp.value.trim()),c=0;
      bodyRows.forEach(function(r){var ok=!q||norm(r.textContent).indexOf(q)>-1;r.hidden=!ok;if(ok)c++});
      cnt.textContent=(q?c+' / ':'')+rows+' satır';nm.hidden=c>0;
    });
  }
  $$('th',tb).forEach(function(th,ci){
    if(rows<3)return;th.classList.add('sortable');th.tabIndex=0;th.title='Sırala';
    function sort(){
      var asc=th.getAttribute('aria-sort')!=='ascending';
      $$('th',tb).forEach(function(o){o.removeAttribute('aria-sort')});th.setAttribute('aria-sort',asc?'ascending':'descending');
      var data=bodyRows.map(function(r,i){return {r:r,i:i,v:cellVal(r.cells[ci]||r.cells[0])}});
      var numeric=data.every(function(d){return d.v.n!==null});
      data.sort(function(a,b){var x=numeric?a.v.n-b.v.n:a.v.s.localeCompare(b.v.s,'tr');return (asc?x:-x)||a.i-b.i});
      data.forEach(function(d){body.appendChild(d.r)});
    }
    th.addEventListener('click',sort);th.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();sort()}});
  });
});

/* harita büyütme */
var lb=$('#lightbox'),stage=$('#lbStage'),vb=null,vb0=null,svgEl=null;
function setVB(){svgEl.setAttribute('viewBox',vb.map(function(n){return n.toFixed(2)}).join(' '))}
function zoom(f,cx,cy){
  var nw=Math.max(vb0[2]/12,Math.min(vb0[2]*1.0,vb[2]/f)),k=nw/vb[2];
  var nh=vb[3]*k;vb[0]+= (vb[2]-nw)*cx;vb[1]+=(vb[3]-nh)*cy;vb[2]=nw;vb[3]=nh;setVB();
}
function openLB(fig){
  var src=$('.map-box svg',fig);if(!src)return;
  svgEl=src.cloneNode(true);svgEl.removeAttribute('width');svgEl.removeAttribute('height');
  stage.innerHTML='';stage.appendChild(svgEl);
  vb0=svgEl.getAttribute('viewBox').split(/\s+/).map(Number);vb=vb0.slice();
  $('#lbTitle').textContent=($('.fig-no',fig)||{}).textContent+' · '+($('.fig-title',fig)||{}).textContent;
  lb.hidden=false;document.body.style.overflow='hidden';
}
function closeLB(){lb.hidden=true;document.body.style.overflow='';stage.innerHTML=''}
$$('figure.map .map-box').forEach(function(b){
  var open=function(){openLB(b.closest('figure'))};
  b.addEventListener('click',open);b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
});
$('#lbClose').addEventListener('click',closeLB);
$('#lbIn').addEventListener('click',function(){zoom(1.5,.5,.5)});
$('#lbOut').addEventListener('click',function(){zoom(1/1.5,.5,.5)});
$('#lbReset').addEventListener('click',function(){vb=vb0.slice();setVB()});
stage.addEventListener('wheel',function(e){e.preventDefault();var r=stage.getBoundingClientRect();zoom(e.deltaY<0?1.15:1/1.15,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)},{passive:false});
var drag=null;
stage.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY};stage.classList.add('drag');stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',function(e){if(!drag)return;var r=stage.getBoundingClientRect();
  var s=Math.max(vb[2]/r.width,vb[3]/r.height);vb[0]-=(e.clientX-drag.x)*s;vb[1]-=(e.clientY-drag.y)*s;drag={x:e.clientX,y:e.clientY};setVB()});
stage.addEventListener('pointerup',function(){drag=null;stage.classList.remove('drag')});
stage.addEventListener('dblclick',function(e){var r=stage.getBoundingClientRect();zoom(2,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)});

/* arama */
var pal=$('#palette'),q=$('#q'),res=$('#results'),idx=null,sel=-1,items=[];
function load(){if(idx)return Promise.resolve();return fetch('assets/search.json').then(function(r){return r.json()}).then(function(d){idx=d.map(function(x){x.n=norm(x.t+' '+x.h);return x})})}
function openP(){pal.hidden=false;document.body.style.overflow='hidden';q.value='';res.innerHTML='<div class="empty">Bir terim yazın. Başlıklar, paragraflar ve tablo satırları taranır.</div>';load();setTimeout(function(){q.focus()},10)}
function closeP(){pal.hidden=true;document.body.style.overflow=''}
function esc(s){return s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function snippet(t,terms){
  var n=norm(t),p=-1;for(var i=0;i<terms.length;i++){p=n.indexOf(terms[i]);if(p>-1)break}
  var s=Math.max(0,p-60),e=Math.min(t.length,s+190),out=t.slice(s,e),h=esc(out);
  terms.forEach(function(w){
    var no=norm(out),pos=0,parts='';var seg=out;var res2='',last=0,j;
    while((j=no.indexOf(w,pos))>-1){res2+=esc(seg.slice(last,j))+'<mark>'+esc(seg.slice(j,j+w.length))+'</mark>';last=j+w.length;pos=last}
    if(last){h=res2+esc(seg.slice(last))}
  });
  return (s>0?'… ':'')+h+(e<t.length?' …':'');
}
function search(){
  if(!idx)return;var v=norm(q.value.trim());sel=-1;
  if(v.length<2){res.innerHTML='<div class="empty">En az iki harf yazın.</div>';items=[];return}
  var terms=v.split(/\s+/).filter(Boolean),out=[];
  for(var i=0;i<idx.length&&out.length<200;i++){
    var x=idx[i],sc=0,ok=true;
    for(var k=0;k<terms.length;k++){var p=x.n.indexOf(terms[k]);if(p<0){ok=false;break}sc+=(x.h&&norm(x.h).indexOf(terms[k])>-1?3:0)+(p<80?1:0)}
    if(ok)out.push({x:x,sc:sc});
  }
  out.sort(function(a,b){return b.sc-a.sc});items=out.slice(0,30);
  if(!items.length){res.innerHTML='<div class="empty">“'+esc(q.value)+'” için sonuç bulunamadı.</div>';return}
  res.innerHTML=items.map(function(o,i){return '<a class="res" data-i="'+i+'" href="#'+o.x.i+'"><div class="ctx">'+esc(o.x.c+(o.x.h?' › '+o.x.h:''))+'</div><div class="snip">'+snippet(o.x.t,terms)+'</div></a>'}).join('')+(out.length>30?'<div class="empty">'+out.length+' sonuçtan ilk 30’u gösteriliyor.</div>':'');
}
function go(i){
  var o=items[i];if(!o)return;var terms=norm(q.value.trim()).split(/\s+/);closeP();
  var el=document.getElementById(o.x.i);if(el)el.scrollIntoView({block:'start'});history.replaceState(null,'','#'+o.x.i);
}
q.addEventListener('input',search);
res.addEventListener('click',function(e){var a=e.target.closest('.res');if(a){e.preventDefault();go(+a.dataset.i)}});
function mark(){$$('.res').forEach(function(r,i){r.classList.toggle('sel',i===sel)});var s=$('.res.sel');if(s)s.scrollIntoView({block:'nearest'})}
q.addEventListener('keydown',function(e){
  if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(items.length-1,sel+1);mark()}
  else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);mark()}
  else if(e.key==='Enter'){e.preventDefault();go(sel<0?0:sel)}
});
pal.addEventListener('click',function(e){if(e.target===pal)closeP()});
$('#searchBtn').addEventListener('click',openP);
addEventListener('keydown',function(e){
  var tag=(document.activeElement||{}).tagName;
  if(e.key==='Escape'){if(!pal.hidden)closeP();else if(!lb.hidden)closeLB();else menu(false)}
  else if((e.key==='/'||(e.key==='k'&&(e.ctrlKey||e.metaKey)))&&tag!=='INPUT'&&tag!=='TEXTAREA'){e.preventDefault();openP()}
});
})();
