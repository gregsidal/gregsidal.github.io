/*
 *  Greg Sidal 2015-2023, Source code MIT Licence
 */


/*
 *  UI control
 */
var UI = { };
UI.onload = function( drawpic, id ) {
  /* 2023-03 REM 
  var ua = navigator.userAgent.toLowerCase();
  UI.displayasimg = ua.indexOf( "msie" ) >= 0;
  if (UI.displayasimg)
    UI.swapstyle( 'canv', 'canvimg', 'display' );
  */
  if (drawpic) drawpic( id );
}
UI.resize = function( canvid ) {  /*2022-12 ADD*/
  UI.center( canvid );
}
UI.canvtoimg = function( canvas ) {
  if (UI.displayasimg) {
    var img = UI.gete( canvas.id+'img' );
    if (img) {
      img.width = canvas.width;
      img.height = canvas.height;
      img.src = canvas.toDataURL();
    }
  }
}
UI.mkid = function( id, sub ) {
  return id.split('_')[0] + sub;
}
UI.showtitle = function( canvid, title ) {
  if (!title) title = {main:"",sub:""}; /*2022-10 EDIT*/
  UI.putin( UI.mkid(canvid,'_title'), title.main );
  UI.putin( UI.mkid(canvid,'_subtitle'), title.sub );
  UI.putin( UI.mkid(canvid,'_title2'), title.main );   /*2022-10 ADD*/
  UI.putin( UI.mkid(canvid,'_subtitle2'), title.sub ); /*2022-10 ADD*/
}
UI.notify = function( act, i, count, id, canvas, pic ) { /*2022-10 REPLACE*/
  if (count < 0)
    return;
  var statselem = UI.gete( id+'_stats' );
  var stopelem = UI.gete( id+'_stopbtn' );
  var restartelem = UI.gete( id+'_nextbtn' );
  var msg = "";
  if (i < count)
    msg = i ? act + " " + (i+1) + " of " + count + " lines" : act;
  else
    msg = count + " lines drawn";
  if (statselem)
    statselem.innerHTML = msg;
  if (i <= 0) {
    UI.swapstyle( stopelem, restartelem, 'display', 'none' );
    UI.resize( canvas );  /*2022-12 ADD*/
  }
  if (i >= 0 && i < count && pic)
    UI.showtitle( canvas.id, {main:"",sub:msg} );
  if (i >= count) {
    UI.swapstyle( restartelem, stopelem, 'display', 'none' );
    if (pic)
      UI.showtitle( canvas.id, pic.getmetadata().title );
  }
  if (i >= count && canvas)
    UI.canvtoimg( canvas );
}
/* 
2022-10 REM
UI.notify = function( act, i, count, id, canvas, pic ) {
  if (count < 0)
    return;
  var statselem = UI.gete( id+'_stats' );
  var stopelem = UI.gete( id+'_stopbtn' );
  var restartelem = UI.gete( id+'_nextbtn' );
  if (statselem)
    if (i < count)
      statselem.innerHTML = i ? act + " " + (i+1) + " of " + count + " lines" : act;
    else
      statselem.innerHTML = count + " lines drawn";
  if (i <= 0) {
    UI.swapstyle( stopelem, restartelem, 'display', 'none' );
    if (pic)
      UI.showtitle( canvas.id, pic.getmetadata().title );
  }
  if (i >= count)
    UI.swapstyle( restartelem, stopelem, 'display', 'none' );
  if (i >= count && canvas)
    UI.canvtoimg( canvas );
}
*/
UI.drawpic = function( pic, canvas, id ) {
  function drawcallback( i, count ) {UI.notify('drawing',i,count,id,canvas,pic);}
  pic.draw( canvas, drawcallback );
}
UI.drawjsonpicscale = function( canvid, jsonid, id, scale ) {
  var json = UI.getv( jsonid );
  var pic = new UI.Pic();
  canvas = pic.fromjson( UI.gete(canvid), json, scale );
  UI.drawpic( pic, canvas, id );
  return pic;
}
UI.drawjsonpic = function( canvid, id, n ) {
  if (n == undefined) n = "";
  return UI.drawjsonpicscale( canvid, id+'_json'+n, id, UI.getnum(id+'_scale',0.001,100000,1.0) );
}
UI.drawjsonpics = function( id, count, scale ) {
  if (!scale) scale = 0.1;
  for( var i=0; i<count; i++ )
    UI.drawjsonpicscale( id+'_'+i, id+'_json'+i, id, scale );
}
UI.drawjsondirectscale = function( canvid, json, id, scale ) {
  var pic = new UI.Pic();
  canvas = pic.fromjson( UI.gete(canvid), json, scale );
  UI.drawpic( pic, canvas, id );
  return pic;
}
UI.drawjsondirect = function( canvid, id, json ) {
  return UI.drawjsondirectscale( canvid, json, id, UI.getnum(id+'_scale',0.001,100000,1.0) );
}

UI.slideshow = {n:-1, count:1, curpic:null, imgloading:false};  /*2022-12 EDIT (add imgloading)*/
UI.slideshow.step = function( draw, dir, id, count ) {
  if (UI.slideshow.imgloading)  /*2022-12 ADD*/
    return;
  if (id) UI.slideshow.id = id;
  if (count) UI.slideshow.count = count;
  UI.slideshow.n += dir ? dir : 1;
  if (UI.slideshow.n >= UI.slideshow.count)
    UI.slideshow.n = 0;
  if (UI.slideshow.n < 0)
    UI.slideshow.n = UI.slideshow.count - 1;
  UI.drawstop();
  draw( UI.slideshow.id, UI.slideshow.n );
}
UI.jsonslideshow = function( dir, id, count ) {
  function draw( id, n ) {
    UI.slideshow.curpic = UI.drawjsonpic( 'canv', id, n );
  }
  UI.slideshow.step( draw, dir, id, count );
}
UI.jsonslideshowarray = function( dir, id, jsonpics ) {
  if (jsonpics) UI.slideshow.array = jsonpics;
  function drawimg( id, n, i ) {
    UI.setstyle( 'canv', 'display', 'none' );
    UI.setstyle( 'canvimg', 'visibility', 'hidden' ); //2023-03 ADD
    UI.setstyle( 'canvimg', 'display', 'block' );
    UI.gete( 'canvimg' ).src = i.image;
    /*2022-12 ADD*/
    function onimgloaded() {
      UI.slideshow.imgloading = false;
      var t = i.metadata ? i.metadata.title : {main:"",sub:""};
      t.main = t.main ? t.main : "";
      t.sub = t.sub ? t.sub : "";
      UI.remclass( UI.mkid('canv','_subtitle'), 'waitmsg' );
      UI.remclass( UI.mkid('canv','_subtitle2'), 'waitmsg' );
      UI.showtitle( "canv", t );
      UI.resize( 'canvimg' );
      UI.setstyle( 'canvimg', 'visibility', 'visible' ); //2023-03 ADD
    }
    function onwait() {
      if (!UI.slideshow.imgloading)
        return;
      UI.addclass( UI.mkid('canv','_subtitle'), 'waitmsg' );
      UI.addclass( UI.mkid('canv','_subtitle2'), 'waitmsg' );
      UI.showtitle( "canv", {main:"", sub:"l o a d i n g . . ."} );
    }
    UI.slideshow.imgloading = true;
    UI.gete( 'canvimg' ).onload = onimgloaded;
    //(debug) setTimeout( onimgloaded, 10000 );
    setTimeout( onwait, 500 );
    /*2022-12 END ADD*/
  }
  function drawpic( id, n ) {
    UI.setstyle( 'canvimg', 'display', 'none' );
    UI.setstyle( 'canv', 'display', 'block' );
    var m = UI.slideshow.array[n].metadata;
    if (!m.title)
      UI.slideshow.array[n].metadata.title = { main:"Untitled #"+n, sub:"" }; /*2022-10 EDIT 'untitled'*/
    if (m.client && m.client.name)
      UI.slideshow.array[n].metadata.title.sub = m.client.name;
    if (m.client && m.client.function) {
      if (m.client.function == "trunc")
        UI.slideshow.array[n].metadata.title.sub = "from Truncations Generator";
      else
        if (m.client.function == "nocross")
          UI.slideshow.array[n].metadata.title.sub = "from No Crossings Generator";
        else
          if (m.client.function == "rand")
            UI.slideshow.array[n].metadata.title.sub = "from AE Generator";
    }
    var j = JSON.stringify( UI.slideshow.array[n] );
    UI.slideshow.curpic = UI.drawjsondirect( 'canv', id, j );
  }
  function draw( id, n ) {
    if (UI.slideshow.array[n].image)
      drawimg( id, n, UI.slideshow.array[n] );
    else
      drawpic( id, n, UI.slideshow.array[n] );
  }
  UI.slideshow.step( draw, dir, id, UI.slideshow.array.length );
}
UI.imgslideshow = function( dir, id, imgs ) {
  if (imgs) UI.slideshow.imgs = imgs;
  function draw( id, n ) {
    UI.gete( 'canvimg' ).src = UI.slideshow.imgs[n].image;
    var t = UI.slideshow.imgs[n].metadata ? UI.slideshow.imgs[n].metadata.title : {main:"",sub:""};
    t.main = t.main ? t.main : "";
    t.sub = t.sub ? t.sub : "";
    UI.showtitle( "canv", t );
  }
  UI.swapstyle( 'canvimg', 'canv', 'display', 'none' );
  UI.slideshow.step( draw, dir, id, UI.slideshow.imgs.length );
}
UI.drawstop = function() {
  if (UI.slideshow.curpic) UI.slideshow.curpic.stop();
}


/*
 *  vrctor pic renderer
 */
UI.Pic = function( w, h ) {
  this.moveto = function( context, pt ) {
    context.moveTo( (pt.x + this.pic.margin.left) * this.scale.x, 
                    (pt.y + this.pic.margin.top) * this.scale.y );
  }
  this.lineto = function( context, pt ) {
    context.lineTo( (pt.x + this.pic.margin.left) * this.scale.x, 
                    (pt.y + this.pic.margin.top) * this.scale.y );
  }
  this.drawpath = function( context, line ) {
    var pts = line.shape ? line.shape : line.pts;
    context.beginPath();
    this.moveto( context, pts[0] );
    for( var i=1; i<pts.length; i++ )
      this.lineto( context, pts[i] );
    context.closePath();
    if (i == 2 || line.linecol) {
      context.lineWidth = (line.linewid ? line.linewid : line.wid) * this.scale.x;
      context.strokeStyle = line.linecol ? line.linecol : line.col;
      context.stroke();
    }
    if (i > 2 || line.fillcol) {
      context.fillStyle = line.fillcol ? line.fillcol : line.col;
      context.fill();
    }
  }
  this.drawline = function( context, line ) {
    this.drawpath( context, line );
    if (line.debug && line.debug.length)
      for( var i=0; i<line.debug.length; i++ )
        this.drawpath( context, line.debug[i] );
  }
  this.drawlines = function( context, lines, noanim ) {
    if (noanim) {
      for( var i=0; i<lines.length; i++ )
        this.drawline( context, lines[i] );
    }
    else {
      this.context = context;
      this.lines = lines;
      var count = lines.length; /*2022-10 ADD*/
      this.procid = UI.Processes.start( count, this, count>100?(count>300?15:60):150 );  /*2022-10 EDIT*/
    }
  }
  this.onnotify = function( i, linecount ) {
    if (this.callback)
      this.callback( i, linecount );
  }
  this.onstop = function() {
    this.procid = null;
  }
  this.stop = function() {
    UI.Processes.stop( this.procid );
  }
  this.onstep = function( i, linecount ) {
    var batch = linecount > 500 ? 20 : this.batch;   /*2022-10 ADD*/
    for( var j=0; j<batch && i<linecount; i++, j++ )
      this.drawline( this.context, this.lines[i] );
    return i;
  }
  this.setup = function( canv, callback ) {
    if (canv) this.canvas = canv;
    this.context = this.canvas.getContext( '2d' );
    //this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
    this.context.fillStyle = 'rgb(255,255,255)';
    this.context.fillRect( 0, 0, this.canvas.width, this.canvas.height );
    this.pic.wid = this.pic.wid ? this.pic.wid : canv.width;
    this.pic.hgt = this.pic.hgt ? this.pic.hgt : canv.height;
    this.callback = callback;
  }
  this.draw = function( canv, callback, lines ) {
    this.setup( canv, callback );
    lines = lines ? lines : this.pic.lines;
    this.drawlines( this.context, lines );
  }
  this.addline = function( line, render ) {
    if (line) {
      this.pic.lines.push( line );
      if (render && this.context)
        this.drawline( this.context, line );
    }
  }
  this.wid = function( ) {
    return this.pic.wid;
  }
  this.hgt = function( ) {
    return this.pic.hgt;
  }
  this.linecount = function( ) {
    return this.pic.lines.length;
  }
  this.line = function( i ) {
    return this.pic.lines[i];
  }
  this.lines = function( ) {
    return this.pic.lines;
  }
  this.setscale = function( scalex, scaley ) { 
    if (scalex == undefined) scalex = 1;
    if (scaley == undefined) scaley = scalex;
    this.scale = {x: scalex, y: scaley};
  }
  this.setmargin = function( margin ) { 
    this.pic.margin = margin ? margin : {left:0, top:0, right:0, bottom:0};
  }
  this.getmetadata = function( ) {
    return this.pic.metadata;
  }
  this.setmetadata = function( part, md ) {
    if (!this.pic.metadata) this.pic.metadata = {};
    if (part)
      this.pic.metadata[part] = md;
  }
  this.tojson = function( ) {
    this.pic.numlines = this.pic.lines.length;
    return JSON.stringify( this.pic, null, 2 );
  }
  this.fromjson = function( canvas, json, scale ) {
    try {this.pic = JSON.parse( json );} catch(e) {this.pic = null;}
    if (!this.pic || !this.pic.wid) this.pic = {wid:1000,hgt:1000,lines:[]};
    this.setmetadata();
    this.setmargin( this.pic.margin );
    if (scale && this.pic.scale)
      this.setscale( scale * this.pic.scale );
    else
      this.setscale( this.pic.scale ? this.pic.scale : scale );
    canvas.width = (this.pic.margin.left+this.pic.margin.right+this.pic.wid) * this.scale.x;
    canvas.height = (this.pic.margin.top+this.pic.margin.bottom+this.pic.hgt) * this.scale.y;
    return canvas;
  }
  this.batch = 10;  /*2022-10 ADD*/
  this.pic = {metadata:{}, wid:w, hgt:h, lines:[]};
  this.setscale();
  this.setmargin();
}

  
/*
 *  process
 */
UI.Process = function( id, count, service, delay ) {
  this.timeout = function() {    /*2022-10 ADD*/
    var curtime = (new Date()).getTime();
    var deadtime = this.prevtime ? (this.prevtime+this.delay) : 0;
    var yes = curtime >= deadtime;
    if (yes)
      this.prevtime = curtime;
    /*else 
      if (UI.debug)
        console.log( "Not enough time elapsed: "+(deadtime-curtime) );*/
    return yes;
  }
  this.step = function() {
    if (this.paused)
      return;
    if (this.i < this.count) {     /*2022-10 EDIT*/  /*|| this.count == undefined*/
      if (!this.timeout()) {       /*2022-10 ADD*/
        //setTimeout( 'UI.Processes.step("'+this.id+'")', 25 );
        window.requestAnimationFrame( UI.Processes.stepall );
        return;
      }
      if (this.service.onnotify)
        this.service.onnotify( this.i, this.count );
      var n = this.service.onstep( this.i, this.count );
      if (n == undefined)
        this.i++;
      else
        this.i = n;
      //setTimeout( 'UI.Processes.step("'+this.id+'")', this.delay );
      window.requestAnimationFrame( UI.Processes.stepall );
      return;
    }
    if (this.service.onnotify)
      this.service.onnotify( this.i, this.i );
    if (this.service.onstop)
      this.service.onstop( this.i, this.count );
    UI.Processes.del( this.id );
  }
  this.stop = function() {
    this.count = this.i;
    this.paused = false;
    this.step();
  }
  this.pause = function() {
    this.paused = !this.paused;
    this.step();
  }
  this.setdelay = function( delay ) {
    this.delay = delay ? delay : 10;
  }
  this.i = 0;
  this.id = id;
  this.count = count;
  this.service = service;
  this.paused = false;
  this.setdelay( delay );
  this.step();
}

UI.Processes = {
  nextid: 1,
  current: {},
  start: function( count, service, delay ) {
    var id = 'proc' + UI.Processes.nextid;
    UI.Processes.nextid++;
    UI.Processes.stop( id );
    UI.Processes.current[id] = new UI.Process( id, count, service, delay );
    return id;
  },
  del: function( id ) { if (id && UI.Processes.current[id]) delete UI.Processes.current[id]; },
  step: function( id ) { if (id && UI.Processes.current[id]) UI.Processes.current[id].step(); },
  stop: function( id ) { if (id && UI.Processes.current[id]) UI.Processes.current[id].stop(); },
  pause: function( id ) { if (id && UI.Processes.current[id]) UI.Processes.current[id].pause(); },
  setdelay: function( id, delay ) { if (id && UI.Processes.current[id]) UI.Processes.current[id].setdelay(delay); },
  stopall: function( ) { for (var id in UI.Processes.current) UI.Processes.stop(id); },
  stepall: function( ) { for (var id in UI.Processes.current) UI.Processes.step(id); }  /*2022-10 ADD*/
}


/*
 *  support
 */
UI.gete = function( id ) {
  var e;
  if (id && id instanceof HTMLElement)
    e = id;
  else
    e = document.getElementById( id );
  return e;
}
UI.setstyle = function( id, s, v ) {
  var e = UI.gete( id );
  if (e) e.style[s] = v;
}
UI.getstyle = function( id, prop ) {
  var e = UI.gete( id );
  if (!e) return;
  return window.getComputedStyle( e ).getPropertyValue( prop );
}
UI.swapstyle = function( id1, id2, prop, iseq ) {
  var e1 = UI.gete( id1 );
  var e2 = UI.gete( id2 );
  if (e1 && e2) {
    var s1 = UI.getstyle( e1, prop );
    var s2 = UI.getstyle( e2, prop );
    if (s1 || s2)
      if (!iseq || s1 == iseq)
        UI.setstyle( e1, prop, s2 ),
        UI.setstyle( e2, prop, s1 );
  }
}
UI.ischk = function( id, def ) {
  var e = UI.gete( id );
  if (!e) return def;
  return e.checked;
}
UI.chk = function( id, v ) {
  var e = UI.gete( id );
  e.checked = v;
}
UI.en = function( id, on ) {
  var e = UI.gete( id );
  e.disabled = !on;
}
UI.clipnum = function( n, min, max ) {
  n = isFinite(n) ? n : 0;
  if (min != undefined)
    n = n < min ? min : n;
  if (max != undefined)
    n = n > max ? max : n;
  return n;
}
UI.getv = function( id, def ) {
  var e = UI.gete( id );
  if (!e) return def;
  if (!e.value && def) return def+"";
  return e.value;
}
UI.putv = function( id, vn ) {
  var e = UI.gete( id );
  if (e) e.value = vn;
}
UI.putin = function( id, i ) {
  var e = UI.gete( id );
  if (e) e.innerHTML = i ? i.toString() : "";
}
UI.getnum = function( id, min, max, def ) {
  var n = parseFloat( UI.getv(id,def) );
  n = UI.clipnum( n, min, max );
  UI.putv( id, n );
  return n;
}
UI.getint = function( id, min, max, def ) {
  var n = parseInt( UI.getv(id,def) );
  n = UI.clipnum( n, min, max );
  UI.putv( id, n );
  return n;
}

/*2022-10 ADD*/
UI.addclass = function( id, cls ) {
  //2022-12 REM var e = document.getElementById( id );
  var e = UI.gete( id );
  if (e) e.classList.add( cls );
}
UI.remclass = function( id, cls ) {
  //2022-12 REM var e = document.getElementById( id );
  var e = UI.gete( id );
  if (e) e.classList.remove( cls );
}
UI.replaceclass = function( id, cls1, cls2 ) {
  //2022-12 REM var e = document.getElementById( id );
  var e = UI.gete( id );
  if (e) {
    e.classList.remove( cls1 );
    e.classList.add( cls2 );
  }
}
UI.swapclass = function( id, cls1, cls2 ) {
  //2022-12 REM var e = document.getElementById( id );
  var e = UI.gete( id );
  if (e)
    if (e.classList.contains( cls1 ))
      UI.replaceclass( id, cls1, cls2 );
    else
      if (e.classList.contains( cls2 ))
        UI.replaceclass( id, cls2, cls1 );
      else
        e.classList.add( cls2 );
}
UI.unfold = function( idunfoldbtn, idfoldbtn, idfoldpane ) {
  UI.setstyle( idunfoldbtn, 'display', 'none' );
  UI.setstyle( idfoldbtn, 'display', 'inline-block' );
  UI.replaceclass( idfoldpane, 'closed', 'opened' );
}
UI.fold = function( idunfoldbtn, idfoldbtn, idfoldpane ) {
  UI.setstyle( idunfoldbtn, 'display', 'inline-block' );
  UI.setstyle( idfoldbtn, 'display', 'none' );
  UI.replaceclass( idfoldpane, 'opened', 'closed' );
}
UI.toggle = function( id1, id2 ) {
  UI.swapclass( id1, 'hidden', 'visible' );
  UI.swapclass( id2, 'visible', 'hidden' );
}
UI.toggleall = function( id1, ids2 ) {
  UI.swapclass( id1, 'hidden', 'visible' );
  for( var i=0; i<ids2.length; i++ )
    UI.swapclass( ids2[i], 'visible', 'hidden' );
}
/*END 2022-10 ADD*/

/*2022-10 REM
UI.toggle = function( idbtn, id ) {
  UI.swapstyle( idbtn, id, 'visibility' );
}
UI.unfold = function( idunfoldbtn, idfoldbtn, idfoldpane ) {
  UI.setstyle( idunfoldbtn, 'display', 'none' );
  UI.setstyle( idfoldbtn, 'display', 'inline-block' );
  UI.setstyle( idfoldpane, 'display', 'block' );
}
UI.fold = function( idunfoldbtn, idfoldbtn, idfoldpane ) {
  UI.setstyle( idunfoldbtn, 'display', 'inline-block' );
  UI.setstyle( idfoldbtn, 'display', 'none' );
  UI.setstyle( idfoldpane, 'display', 'none' );
}
*/

UI.unroll = function( id ) {
  UI.setstyle( id+'_unfoldbtn', 'display', 'none' );
  UI.setstyle( id+'_foldbtn', 'display', 'inline-block' );
  UI.setstyle( id+'_foldpane', 'display', 'block' );
}
UI.rollup = function( id ) {
  UI.setstyle( id+'_unfoldbtn', 'display', 'inline-block' );
  UI.setstyle( id+'_foldbtn', 'display', 'none' );
  UI.setstyle( id+'_foldpane', 'display', 'none' );
}


/*2023-03 ADD*/
UI.center = function( id, idcontainer, centervert ) {return UI.view.center(id,idcontainer);}
UI.el = UI.gete;
UI.view = {
  getparent: function( id ) {
    var e = UI.el( id );
    return (e && e.parentElement) ? e.parentElement : null;
  },
  getcontainer: function( id, idcontainer ) {
    return idcontainer ? idcontainer : UI.view.getparent( id );
  },
  evp: function( id ) {
    var e = UI.el( id );
    var vp = {wid: (e && e.clientWidth) ? e.clientWidth : window.innerWidth,
              hgt: (e && e.clientHeight) ? e.clientHeight : window.innerHeight};
    if ((e instanceof HTMLImageElement) && e.naturalWidth)
      vp = {wid: e.naturalWidth, hgt: e.naturalHeight};
    else
      if (e.width)
        vp = {wid: e.width, hgt: e.height};
    return vp;
  },
  cvp: function( id ) {
    var e = UI.el( id );
    var vp = {wid: (e && e.clientWidth) ? e.clientWidth : window.innerWidth,
              hgt: (e && e.clientHeight) ? e.clientHeight : window.innerHeight};
    return vp;
  },
  center: function( id, idcontainer ) {
    idcontainer = UI.view.getcontainer( id, idcontainer );
    var ed = UI.view.evp( id, idcontainer );
    var cd = UI.view.cvp( idcontainer );
    var asp = {e: ed.wid / ed.hgt, c: cd.wid / cd.hgt};
    if (asp.e < asp.c)
      UI.replaceclass( id, 'respcenterhgt', 'respcenterwid' );  // too tall for vp
    else
      UI.replaceclass( id, 'respcenterwid', 'respcenterhgt' );  // too wide for vp
    var eh = ed.hgt;
    if (cd.wid > ed.wid && cd.hgt > ed.hgt)
      UI.addclass( id, 'centersmall' );
    else {
      UI.remclass( id, 'centersmall' );
      eh = ed.hgt * (cd.wid / ed.wid);
    }
    UI.remclass( id, 'centertiny' );
    UI.remclass( id, 'centershort' );
    UI.remclass( id, 'centermed' );
    UI.remclass( id, 'centerlong' );
    if (cd.hgt > (eh*3.4))
      UI.addclass( id, 'centertiny' );
    else
      if (cd.hgt > (eh*2.7))
        UI.addclass( id, 'centershort' );
      else
        if (cd.hgt > (eh*2.2))
          UI.addclass( id, 'centermed' );
        else
          if (cd.hgt > (eh*1.7))
            UI.addclass( id, 'centerlong' );
  }
}
/*END 2023-03 ADD*/
