(function(){
'use strict';
var mq=matchMedia('(max-width:640px)');
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

/* tablolar: telefonda kart görünümü + sıralama menüsü */
$$('.table-wrap').forEach(function(w){
  var tb=w.querySelector('table');if(!tb)return;
  var heads=$$('thead th',tb).map(function(th){return th.textContent.trim()});
  $$('tbody tr',tb).forEach(function(tr){
    Array.prototype.forEach.call(tr.cells,function(td,i){if(heads[i])td.setAttribute('data-label',heads[i])});
  });
  var ths=$$('thead th',tb);
  if(ths.length&&+w.dataset.rows>=3){
    var sel=document.createElement('select');sel.className='tw-sort';sel.setAttribute('aria-label','Sırala');
    sel.innerHTML='<option value="">Sırala…</option>'+heads.map(function(h,i){return '<option value="'+i+'">'+h.replace(/</g,'&lt;')+'</option>'}).join('');
    sel.addEventListener('change',function(){var th=ths[+sel.value];if(th)th.click()});
    var place=function(){
      var bar=w.querySelector('.tw-bar');
      if(!bar){bar=document.createElement('div');bar.className='tw-bar';w.insertBefore(bar,w.firstChild)}
      bar.appendChild(sel);
    };
    sel.hidden=true;setTimeout(place,0);
    w._sort=sel;
  }
});
function apply(){
  $$('.table-wrap').forEach(function(w){
    var cols=(w.querySelector('thead tr')||{}).children;
    var stack=mq.matches&&cols&&cols.length>=3;
    w.classList.toggle('stack',!!stack);
    if(w._sort)w._sort.hidden=!stack;
  });
}
apply();
mq.addEventListener?mq.addEventListener('change',apply):mq.addListener(apply);

/* haritalar: dokunmatik ipucu */
$$('.zoom-hint').forEach(function(h){if(matchMedia('(hover:none)').matches)h.textContent='Büyütmek için dokun'});

/* açılışta menüyü göster (mobil/tablet; belirli bir bölüme bağlantıyla gelindiyse açma) */
if(matchMedia('(max-width:980px)').matches&&!location.hash){
  document.body.classList.add('menu-open');
  var mb=document.getElementById('menuBtn');if(mb)mb.setAttribute('aria-expanded','true');
}

/* yukarı çık */
var b=document.createElement('button');b.className='to-top';b.type='button';b.setAttribute('aria-label','Başa dön');b.textContent='↑';
b.addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})});
document.body.appendChild(b);
var t=false;addEventListener('scroll',function(){if(t)return;t=true;requestAnimationFrame(function(){b.classList.toggle('show',scrollY>900);t=false})},{passive:true});
})();
