/* Shared renderer: content.json -> page DOM for the flipbooks. Used by index.html and admin.html */
window.LB=(function(){
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var resolve=function(p,map){ return (map&&map[p])?map[p]:p; };   // admin passes a map path->objectURL for unsaved uploads

  /* average colour of an image, darkened -> spread background */
  var tintCache={};
  function tint(src,el){
    if(tintCache[src]){ el.style.background=tintCache[src]; return; }
    var im=new Image(); im.onload=function(){
      try{ var c=document.createElement('canvas'); c.width=16; c.height=16; var x=c.getContext('2d'); x.drawImage(im,0,0,16,16);
        var d=x.getImageData(0,0,16,16).data, r=0,g=0,b=0,n=256; for(var i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}
        r/=n;g/=n;b/=n; var L=(0.2126*r+0.7152*g+0.0722*b)/255||.001, k=0.04/L; var m=(r+g+b)/3;
        var f=function(v){return Math.round(Math.min(255,(m+(v-m)*.75)*k));};
        var col='rgb('+f(r)+','+f(g)+','+f(b)+')'; tintCache[src]=col; el.style.background=col; }catch(e){}
    }; im.src=src;
  }

  function spreadHTML(p,map){
    var R=function(k){return esc(resolve(p[k],map));};
    switch(p.type){
      case 'statement': return '<div class="sp-in statement"><p class="st">'+esc(p.text)+'</p><div class="mono lines">'+(p.lines||[]).map(function(l){return '<div>'+esc(l)+'</div>';}).join('')+'</div></div>';
      case 'opener':    return '<div class="sp-in opener"><p class="mono num">'+esc(p.num)+'</p><h2>'+esc(p.title)+'</h2></div>';
      case 'openerimg': return '<div class="sp-in opener"><p class="mono num">'+esc(p.num)+'</p><h2>'+esc(p.title)+'</h2><img class="col right" src="'+R('image')+'" alt=""></div>';
      case 'bleed':     return '<div class="sp-in bleed" style="background-image:url(\''+R('image')+'\');background-position:'+(p.anchor==null?50:p.anchor)+'% 50%"></div>';
      case 'strip':     return '<div class="sp-in strip"><img src="'+R('image')+'" alt=""></div>';
      case 'stack':     return '<div class="sp-in stack"><img src="'+R('top')+'" alt=""><img src="'+R('bottom')+'" alt=""></div>';
      case 'pair':      return '<div class="sp-in pair"><img src="'+R('left')+'" alt=""><img src="'+R('right')+'" alt=""></div>';
      case 'colsq':     return '<div class="sp-in colsq'+(p.columnLeft===false?' rev':'')+'"><img class="c" src="'+R('column')+'" alt=""><img class="s" src="'+R('square')+'" alt=""></div>';
      default: return '<div class="sp-in"></div>';
    }
  }
  function tintSources(p,map){ var k={bleed:['image'],strip:['image'],stack:['top','bottom'],pair:['left','right'],colsq:['column','square'],openerimg:['image']}[p.type]||[]; return k.map(function(x){return resolve(p[x],map);}); }

  /* returns array of page elements for the image book */
  function buildImagePages(content,map){
    var site=content.site, book=content.images, out=[];
    book.pages.forEach(function(p){
      if(p.type==='cover'){ var d=document.createElement('div'); d.className='page page-cover pg-right'; d.setAttribute('data-density','hard');
        d.innerHTML='<div class="cover-inner"><img class="cover-img" src="'+esc(resolve(p.image,map))+'" alt=""><div class="cover-text"><h1>'+esc(p.title||site.name)+'</h1><p class="mono">'+esc(p.sub||'')+'</p></div><p class="mono corner">'+esc(p.corner||'')+'</p></div>'; out.push(d); return; }
      if(p.type==='back'){ var b=document.createElement('div'); b.className='page page-back pg-left'; b.setAttribute('data-density','hard');
        b.innerHTML='<div class="back-inner"><h2>'+esc(site.name)+'</h2><p class="mono">'+esc(site.email)+' &nbsp;·&nbsp; '+esc(site.phone)+'</p><p class="mono">'+esc(site.url)+'</p></div>'; out.push(b); return; }
      var html=spreadHTML(p,map), srcs=tintSources(p,map);
      ['left','right'].forEach(function(side){ var pg=document.createElement('div'); pg.className='page half-sp pg-'+side;
        pg.innerHTML='<div class="sp '+side+'">'+html+'</div>'; if(srcs.length) tint(srcs[0],pg); else pg.style.background='#0C0C0C'; out.push(pg); });
    });
    return out;
  }
  /* single spread preview element (admin) */
  function spreadPreview(p,content,map){ var d=document.createElement('div'); d.className='sp-preview';
    if(p.type==='cover'||p.type==='back'){ var pages=buildImagePages({site:content.site,images:{pages:[p]}},map); d.classList.add('single'); d.appendChild(pages[0]); return d; }
    d.innerHTML=spreadHTML(p,map); var s=tintSources(p,map); if(s.length) tint(s[0],d); else d.style.background='#0C0C0C'; return d; }

  function buildVideoPages(content,map){
    var site=content.site, book=content.video, out=[];
    var c=document.createElement('div'); c.className='page vpage vcover'; c.setAttribute('data-density','hard');
    c.style.backgroundImage='url("'+esc(resolve(book.coverImage,map))+'")';
    c.innerHTML='<div class="vcap"><h3 class="big">'+esc(site.name)+'</h3><p class="mono">'+esc((book.sub||'VIDEO LOOKBOOK').toUpperCase())+' &nbsp;·&nbsp; 2026</p></div>'; out.push(c);
    book.pages.forEach(function(v,i){ var media;
      if(v.youtube) media='<iframe src="https://www.youtube-nocookie.com/embed/'+esc(v.youtube)+'?rel=0&modestbranding=1" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>';
      else if(v.vimeo) media='<iframe src="https://player.vimeo.com/video/'+esc(v.vimeo)+'?title=0&byline=0&portrait=0" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>';
      else media='<video src="'+esc(resolve(v.src,map))+'"'+(v.poster?' poster="'+esc(resolve(v.poster,map))+'"':'')+' controls playsinline preload="metadata"></video>';
      var d=document.createElement('div'); d.className='page vpage';
      d.innerHTML=media+'<div class="vcap"><h3>'+esc(v.title||'')+'</h3><p class="mono">'+esc(v.sub||'')+'</p></div><p class="mono vnum">'+String(i+1).padStart(2,'0')+' / '+String(book.pages.length).padStart(2,'0')+'</p>'; out.push(d); });
    var e=document.createElement('div'); e.className='page vpage vend'; e.setAttribute('data-density','hard');
    e.innerHTML='<h3 class="big">'+esc(site.name)+'</h3><p class="mono">'+esc(site.email)+' &nbsp;·&nbsp; '+esc(site.phone)+'</p><p class="mono">'+esc(site.url)+'</p>'; out.push(e);
    return out;
  }
  return {buildImagePages:buildImagePages,buildVideoPages:buildVideoPages,spreadPreview:spreadPreview,esc:esc};
})();
