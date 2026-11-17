(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var REG=[{k:'oa',n:'Orta Asya',a:1,b:8},{k:'os',n:'Osmanlı',a:9,b:16},{k:'av',n:'Avrupa',a:17,b:24},{k:'is',n:'İslam',a:25,b:32}];
var regOf=function(n){return n<=8?'oa':n<=16?'os':n<=24?'av':'is'};
var regName=function(k){return REG.filter(function(r){return r.k===k})[0].n};
var ST={read:{},known:{},best:0};
try{var raw=localStorage.getItem('ogren-v1');if(raw){var p=JSON.parse(raw);ST.read=p.read||{};ST.known=p.known||{};ST.best=p.best||0}}catch(e){}
function save(){try{localStorage.setItem('ogren-v1',JSON.stringify(ST))}catch(e){}}
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var shuffle=function(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a};

/* bölüm işaretleri */
$$('section.chapter.numbered').forEach(function(sec){
  var n=+sec.id.slice(1);sec.dataset.reg=regOf(n);
  var box=document.createElement('div');box.className='learn';box.dataset.reg=regOf(n);
  box.innerHTML='<span>Bu bölümü bitirdin mi? İlerlemen bu tarayıcıda saklanır.</span><button type="button" aria-pressed="false"></button>';
  sec.appendChild(box);
  var btn=$('button',box);
  btn.addEventListener('click',function(){ST.read[n]=!ST.read[n];if(!ST.read[n])delete ST.read[n];save();paint()});
});
$$('.part-head').forEach(function(h){var n=+h.id.split('-')[1];h.dataset.reg=regOf(n)});
function paint(){
  $$('section.chapter.numbered').forEach(function(sec){
    var n=+sec.id.slice(1),b=$('.learn button',sec),on=!!ST.read[n];
    b.setAttribute('aria-pressed',on);b.textContent=on?'✓ Öğrendim':'Öğrendim olarak işaretle';
    var a=$('#nav a[data-id="b'+n+'"]');if(a)a.classList.toggle('done',on);
  });
  var tot=0;
  REG.forEach(function(r){
    var c=0;for(var i=r.a;i<=r.b;i++)if(ST.read[i])c++;tot+=c;
    var f=$('.frames a[data-reg="'+r.k+'"]');
    if(f){$('.bar u',f).style.width=(c/8*100)+'%';$('.cnt',f).textContent=c+' / 8 bölüm'}
  });
  var o=$('#overall');if(o)o.textContent=tot+' / 32 bölüm tamamlandı';
}
paint();

/* veri */
var D=null,panel=$('#study'),body=$('#studyBody'),tab='compare',lastFocus=null;
function load(cb){
  if(D)return cb();
  fetch('assets/study.json').then(function(r){return r.json()}).then(function(j){D=j;cb()}).catch(function(){body.innerHTML='<p>Çalışma verisi yüklenemedi. Sayfayı yenileyip tekrar dene.</p>'});
}
function open(t){
  lastFocus=document.activeElement;panel.hidden=false;document.body.style.overflow='hidden';
  load(function(){show(t||tab)});
}
function close(){panel.hidden=true;document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus()}
$('#studyBtn').addEventListener('click',function(){open('compare')});
$('#studyClose').addEventListener('click',close);
panel.addEventListener('click',function(e){if(e.target===panel)close()});
addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden)close()});
$$('[data-study]').forEach(function(b){b.addEventListener('click',function(){open(b.dataset.study)})});
$$('.study-tabs button').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.tab)})});
function show(t){
  tab=t;$$('.study-tabs button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.tab===t)});
  ({compare:vCompare,cards:vCards,quiz:vQuiz,progress:vProgress})[t]();
  panel.scrollTop=0;
}
function goto(id){close();var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth'})}
body.addEventListener('click',function(e){var a=e.target.closest('[data-go]');if(a){e.preventDefault();goto(a.dataset.go)}});

/* ---- Karşılaştır ---- */
var cmpSel=0;
function vCompare(){
  var T=D.table,h='<h3>Dört coğrafya, tek başlık</h3><p class="sub">Bir başlık seç; Orta Asya, Osmanlı, Avrupa ve İslam dünyasında nasıl karşılandığını yan yana oku.</p><div class="chips">';
  T.rows.forEach(function(r,i){h+='<button class="chip" aria-pressed="'+(i===cmpSel)+'" data-i="'+i+'">'+esc(r[0])+'</button>'});
  h+='</div><div class="cmp">';
  var row=T.rows[cmpSel];
  REG.forEach(function(r,j){
    h+='<article data-r="'+r.k+'"><h4>'+r.n+'</h4><p>'+esc(row[j+1])+'</p><a href="#b'+(r.a+cmpSel)+'" data-go="b'+(r.a+cmpSel)+'">Bölüm '+(r.a+cmpSel)+'\'e git →</a></article>';
  });
  h+='</div><p class="cmp-note">Kaynak: raporun Sonuç bölümündeki karşılaştırma tablosu. Ayrıntı için bölüme git.</p>';
  body.innerHTML=h;
  $$('.chip',body).forEach(function(c){c.addEventListener('click',function(){cmpSel=+c.dataset.i;vCompare()})});
}

/* ---- Kartlar ---- */
var deck=[],di=0,dReg='all',hideKnown=false,dKind='all';
function buildDeck(){
  deck=D.cards.filter(function(c){return (dReg==='all'||c.r===dReg)&&(dKind==='all'||(dKind==='term'?c.term:!c.term))&&!(hideKnown&&ST.known[c.k])});
  deck=shuffle(deck);di=0;
}
function vCards(){
  if(!deck.length||!vCards.init){vCards.init=1;buildDeck()}
  var h='<h3>Kartlar</h3><p class="sub">Kartı çevirmek için tıkla ya da Boşluk tuşuna bas. Bildiklerini işaretle; sonra yalnızca bilmediklerini çalış.</p><div class="chips">';
  h+='<button class="chip" data-f="all" aria-pressed="'+(dReg==='all')+'">Tümü</button>';
  REG.forEach(function(r){h+='<button class="chip" data-r="'+r.k+'" data-f="'+r.k+'" aria-pressed="'+(dReg===r.k)+'">'+r.n+'</button>'});
  h+='</div><div class="chips"><button class="chip" data-k="all" aria-pressed="'+(dKind==='all')+'">Kavram + bölüm özeti</button><button class="chip" data-k="term" aria-pressed="'+(dKind==='term')+'">Yalnızca kavramlar</button><button class="chip" data-k="ch" aria-pressed="'+(dKind==='ch')+'">Yalnızca bölüm özetleri</button><button class="chip" id="hk" aria-pressed="'+hideKnown+'">Bildiklerimi gizle</button></div>';
  if(!deck.length){h+='<p>Bu filtrede kart kalmadı. Filtreyi değiştir ya da "Bildiklerimi gizle" seçeneğini kapat.</p>';body.innerHTML=h;bindCards();return}
  var c=deck[di];
  h+='<div class="deck"><button class="fc" id="fc" data-r="'+c.r+'" aria-label="Kartı çevir"><div><span class="f"><small>'+regName(c.r)+(c.term?' · Kavram':' · Bölüm özeti')+'</small><strong>'+esc(c.q)+'</strong><span class="hint">çevir ↻</span></span><span class="b"><small>Cevap</small><span>'+esc(c.a)+'</span></span></div></button>';
  h+='<div class="meter">'+(di+1)+' / '+deck.length+(ST.known[c.k]?' · ✓ bilinen':'')+'</div>';
  h+='<div class="row"><button class="btn" id="prev">←</button><button class="btn" id="again">Tekrar göster</button><button class="btn ok" id="know">Biliyorum ✓</button><button class="btn" id="next">→</button><button class="btn" id="shuf">Karıştır</button>';
  if(c.ch)h+='<button class="btn" data-go="b'+c.ch+'">Bölüme git</button>';
  h+='</div></div>';
  body.innerHTML=h;bindCards();
}
function bindCards(){
  $$('[data-f]',body).forEach(function(b){b.addEventListener('click',function(){dReg=b.dataset.f;buildDeck();vCards()})});
  $$('[data-k]',body).forEach(function(b){b.addEventListener('click',function(){dKind=b.dataset.k;buildDeck();vCards()})});
  var hk=$('#hk',body);if(hk)hk.addEventListener('click',function(){hideKnown=!hideKnown;buildDeck();vCards()});
  var fc=$('#fc',body);if(!fc)return;
  fc.addEventListener('click',function(){fc.classList.toggle('flip')});
  var go=function(d){di=(di+d+deck.length)%deck.length;vCards()};
  $('#next',body).onclick=function(){go(1)};$('#prev',body).onclick=function(){go(-1)};
  $('#shuf',body).onclick=function(){buildDeck();vCards()};
  $('#again',body).onclick=function(){var c=deck.splice(di,1)[0];deck.push(c);if(di>=deck.length)di=0;vCards()};
  $('#know',body).onclick=function(){var c=deck[di];ST.known[c.k]=1;save();if(hideKnown){deck.splice(di,1);if(di>=deck.length)di=0}else di=(di+1)%deck.length;vCards()};
}
addEventListener('keydown',function(e){
  if(panel.hidden||tab!=='cards')return;var fc=$('#fc',body);if(!fc)return;
  if(e.key===' '){e.preventDefault();fc.classList.toggle('flip')}
  else if(e.key==='ArrowRight')$('#next',body).click();else if(e.key==='ArrowLeft')$('#prev',body).click();
});

/* ---- Test ---- */
var Q=[],qi=0,score=0,wrongs=[],qReg='all';
function makeQuiz(){
  var cells=[];D.table.rows.forEach(function(r,i){REG.forEach(function(g,j){cells.push({r:g.k,head:r[0],text:r[j+1],ch:g.a+i})})});
  var cells2=cells.filter(function(c){return qReg==='all'||c.r===qReg}),terms=D.cards.filter(function(c){return c.term&&(qReg==='all'||c.r===qReg)});
  var pool=[];
  shuffle(cells2).slice(0,qReg==='all'?7:4).forEach(function(c){
    pool.push({kind:'Hangi coğrafya?',p:'"'+c.head+'" başlığında şu ifade hangi coğrafyayı anlatır?\n“'+c.text+'”',opts:REG.map(function(g){return g.n}),ans:regName(c.r),ex:regName(c.r)+' · Bölüm '+c.ch+' ('+c.head+')',go:'b'+c.ch});
  });
  shuffle(terms).slice(0,qReg==='all'?7:6).forEach(function(c){
    var others=shuffle(D.cards.filter(function(x){return x.term&&x.k!==c.k})).slice(0,3);
    pool.push({kind:'Kavram',p:'Şu tanım hangi kavrama aittir?\n“'+c.a+'”',opts:shuffle([c].concat(others)).map(function(x){return x.q}),ans:c.q,ex:c.q+' — '+regName(c.r)+' kısmının kavramı.'});
  });
  Q=shuffle(pool).slice(0,10);qi=0;score=0;wrongs=[];
}
function vQuiz(startNow){
  if(!Q.length||startNow!==true){
    var h='<h3>Test</h3><p class="sub">Karşılaştırma tablosundan ve kavram kartlarından üretilen 10 soru. Her cevaptan sonra açıklamayı gör.</p><div class="chips"><button class="chip" data-q="all" aria-pressed="'+(qReg==='all')+'">Dört coğrafya</button>';
    REG.forEach(function(r){h+='<button class="chip" data-r="'+r.k+'" data-q="'+r.k+'" aria-pressed="'+(qReg===r.k)+'">'+r.n+'</button>'});
    h+='</div><div class="row" style="justify-content:flex-start"><button class="btn pri" id="start">Testi başlat</button><span class="meter">'+(ST.best?'En iyi skorun: '+ST.best+' / 10':'Henüz test çözmedin')+'</span></div>';
    body.innerHTML=h;
    $$('[data-q]',body).forEach(function(b){b.addEventListener('click',function(){qReg=b.dataset.q;Q=[];vQuiz()})});
    $('#start',body).onclick=function(){makeQuiz();vQuiz(true)};return;
  }
  if(qi>=Q.length){
    if(score>ST.best){ST.best=score;save()}
    var r='<h3>Sonuç</h3><div class="score">'+score+' / '+Q.length+'</div><p class="sub">'+(score>=9?'Çok iyi. Bu başlıkları rahatça ayırt ediyorsun.':score>=6?'İyi gidiyorsun. Yanlışlarına bakıp kartlarla pekiştir.':'Henüz oturmamış. Karşılaştır sekmesinde başlıkları yan yana oku, sonra tekrar dene.')+'</p>';
    if(wrongs.length){r+='<div class="plist">';wrongs.forEach(function(w){r+='<div class="prow" style="grid-template-columns:1fr"><div><b>'+esc(w.p.split('\n')[0])+'</b><br><em>'+esc(w.p.split('\n')[1]||'')+'</em><br><span style="color:var(--muted)">Doğru cevap: '+esc(w.ans)+'</span>'+(w.go?' · <a href="#'+w.go+'" data-go="'+w.go+'">Bölüme git</a>':'')+'</div></div>'});r+='</div>'}
    r+='<div class="row" style="justify-content:flex-start;margin-top:18px"><button class="btn pri" id="again2">Yeni test</button><button class="btn" data-tab-go="cards">Kartlara geç</button></div>';
    body.innerHTML=r;$('#again2',body).onclick=function(){makeQuiz();vQuiz(true)};
    $('[data-tab-go]',body).onclick=function(){show('cards')};return;
  }
  var q=Q[qi],parts=q.p.split('\n');
  var h2='<div class="qbar"><u style="width:'+(qi/Q.length*100)+'%"></u></div><span class="q-tag">'+q.kind+' · '+(qi+1)+' / '+Q.length+'</span><div class="q-prompt">'+esc(parts[0])+(parts[1]?'<br><em style="font-weight:400">'+esc(parts[1])+'</em>':'')+'</div><div class="opts">';
  q.opts.forEach(function(o){h2+='<button class="opt" data-o="'+esc(o)+'">'+esc(o)+'</button>'});
  h2+='</div><div id="fb"></div>';body.innerHTML=h2;
  $$('.opt',body).forEach(function(b){b.addEventListener('click',function(){
    var ok=b.dataset.o===q.ans;if(ok)score++;else wrongs.push(q);
    $$('.opt',body).forEach(function(x){x.disabled=true;if(x.dataset.o===q.ans)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
    $('#fb',body).innerHTML='<div class="explain"><b>'+(ok?'Doğru.':'Yanlış.')+'</b> '+esc(q.ex)+(q.go?' · <a href="#'+q.go+'" data-go="'+q.go+'">Bölüme git</a>':'')+'</div><div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn pri" id="nq">'+(qi+1<Q.length?'Sonraki soru →':'Sonucu gör')+'</button></div>';
    $('#nq',body).onclick=function(){qi++;vQuiz(true)};$('#nq',body).focus();
  })});
}

/* ---- İlerleme ---- */
function vProgress(){
  var h='<h3>İlerleme</h3><p class="sub">Okuduğun bölümleri işaretle; kartlarda bildiklerin ve test skorun burada toplanır. Veriler yalnızca bu tarayıcıda tutulur.</p><div class="plist">';
  REG.forEach(function(r){
    var c=0;for(var i=r.a;i<=r.b;i++)if(ST.read[i])c++;
    var cards=D.cards.filter(function(x){return x.r===r.k}),kn=cards.filter(function(x){return ST.known[x.k]}).length;
    h+='<div class="prow" data-r="'+r.k+'"><b>'+r.n+'</b><div><div class="bar"><u style="width:'+(c/8*100)+'%"></u></div><span class="meter">'+c+' / 8 bölüm · '+kn+' / '+cards.length+' kart bilindi</span></div><a href="#kisim-'+r.a+'" data-go="kisim-'+r.a+'">Git</a></div>';
  });
  h+='</div><p class="meter" style="margin-top:12px">En iyi test skorun: '+(ST.best?ST.best+' / 10':'—')+'</p>';
  REG.forEach(function(r){
    h+='<div data-r="'+r.k+'" style="margin-top:14px"><b style="color:var(--rc);font-size:13px">'+r.n+'</b><div class="chlist" data-r="'+r.k+'">';
    for(var i=r.a;i<=r.b;i++){h+='<button data-n="'+i+'" aria-pressed="'+!!ST.read[i]+'"><i>'+i+'</i>'+esc(chTitle(i))+'</button>'}
    h+='</div></div>';
  });
  h+='<div class="row" style="justify-content:flex-start"><button class="btn" id="reset">İlerlemeyi sıfırla</button></div>';
  body.innerHTML=h;
  $$('.chlist button',body).forEach(function(b){b.addEventListener('click',function(){var n=+b.dataset.n;if(ST.read[n])delete ST.read[n];else ST.read[n]=1;save();paint();vProgress()})});
  $('#reset',body).onclick=function(){if(confirm('Tüm ilerleme silinsin mi?')){ST={read:{},known:{},best:0};save();paint();vProgress()}};
}
function chTitle(n){var t=$('#b'+n+' .ch-title');return t?t.textContent:'Bölüm '+n}
})();
