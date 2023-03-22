/*
 *  DriveScroll (javascript version) Greg Sidal 2015-2021
 *  License: Creative Commons Attribution Non-Commercial
 *    https://creativecommons.org/licenses/by-nc/4.0/
 */
var DS = {anims:[],defaulturls:[],prev:{w:0,h:0}};


DS.setup = function( id ) {
  function notify( msg ) {
    if (msg)
      UI.el(id+'_stats').innerHTML = msg;
  }
  if (DS.anims[id]) DS.anims[id].stop();
  /*if (window.innerWidth < window.innerHeight)
    if (UI.ischk( id+'_autosize', true ))
      UI.putv( id+'_autoperc', 100 );*/

  /*2023-03 ADD*/
  UI.putv( id+'_autoperc', window.innerWidth<window.innerHeight?100:40 );
  UI.chk( id+'_autosizewid', window.innerWidth>=window.innerHeight );
  UI.chk( id+'_autosizehgt', window.innerWidth<window.innerHeight );
  var sizetoel = window.innerWidth >= window.innerHeight ? UI.el( id+'_autosizewid' ) :
                                                           UI.el( id+'_autosizehgt' );
  DS.resetsize( id, sizetoel );
  var w = UI.num( id+'_wid' );
  var h = UI.num( id+'_hgt' );
  var pixelratio = UI.num( id+'_pixelratio' );
  /*2023-03 END ADD*/

  DS.anims[id] = new DS.Animator( Math.floor(w*pixelratio), Math.floor(h*pixelratio), /*2023-03 EDIT*/
                                  UI.el(id+'_canv'), 
                                  UI.int(id+'_delay',1,100000,25), 
                                  UI.int(id+'_steplines',1,10000,3), notify );

  DS.addurls( id, DS.defaulturls );
}
DS.forcedisallowcanvasdata = false; //true: simulate Tor Browser for testing
DS.togglecanvasdata = function() {DS.forcedisallowcanvasdata = !DS.forcedisallowcanvasdata;}
/*2022-12 ADD*/ DS.canvasdatamsg =  
'Web browser is blocking use of canvas data. ' +
'Some privacy-oriented browsers such as Tor do this by default to prevent ' + 
'identification exploits used by surveillance ("ad") networks.\n\n' + 
'Browser may have a setting that allows canvas data. ' + 
'Alternatively, the offline version of this program can be downloaded and run locally ' + 
"(select 'Self-contained downloadable' to download, then open file " + 
"from prompt or from downloads folder using device's file manager).";
DS.testcanvas = function( id ) {
  try {
    var c = document.createElement( 'canvas' );
    c.width = c.height = 1;
    var cx = c.getContext( '2d' );
    var i = cx.getImageData( 0, 0, 1, 1 );
    i.data[0] = 10, i.data[1] = 20, i.data[2] = 30, i.data[3] = 255;
    cx.putImageData( i, 0, 0 );
    i = cx.getImageData( 0, 0, 1, 1 );
    if (DS.forcedisallowcanvasdata)
      i.data[0] = 255;
    if (i.data[0] == 10 && i.data[1] == 20 && i.data[2] == 30 && i.data[3] == 255)
      return true;
    alert( DS.canvasdatamsg );
  }
  catch( e ) {
    alert( "Browser lacks full support for canvas" );
  }
  return false;
}
DS.run = function( id ) {
  //DS.resize( id );
  if (DS.anims[id].start())
    UI.setstyle( id+'_runbtn', 'display', 'none' ),
    UI.setstyle( id+'_pausebtn', 'display', 'inline-block' ),
    UI.setstyle( id+'_options', 'display', 'none' );
}
DS.setpausectrls = function( id ) {
  if (UI.el(id+'_pausebtn').innerHTML == 'PAUSE')
    UI.setstyle( id+'_options', 'display', 'block' ),
    UI.el(id+'_pausebtn').innerHTML = 'RESUME',
    UI.setstyle( id+'_savebtn', 'display', 'inline-block' );
  else
    UI.setstyle( id+'_options', 'display', 'none' ),
    UI.setstyle( id+'_savebtn', 'display', 'none' ),
    UI.el(id+'_pausebtn').innerHTML = 'PAUSE';
}
DS.pause = function( id ) {
  DS.setspeed( id );
  DS.anims[id].pause();
  DS.setpausectrls( id );
  return true;
}
DS.ispaused = function( id ) {
  return DS.anims[id].ispaused();
}
DS.resetsizectrls = function( id, e ) { /*2023-03 ADD*/
  if (e) {
    if (e.id == id+'_autosizewid' || e.id == id+'_autosizehgt') {
      UI.chk( id+'_autosizewid', e.id == id+'_autosizewid' );
      UI.chk( id+'_autosizehgt', e.id == id+'_autosizehgt' );
      UI.chk( id+'_autosize', true );
    }
    else
      if (e.id == id+'_autoperc')
        UI.chk( id+'_autosize', true );
  }
  else
    UI.chk( id+'_autosize', false );
  if (UI.ischk( id+'_autosize' )) {
    UI.replaceclass( id+'_autosize', 'dulled', 'bright' );
    UI.replaceclass( id+'_autosizewid', 'dulled', 'bright' );
    UI.replaceclass( id+'_autosizehgt', 'dulled', 'bright' );
    UI.replaceclass( id+'_autoperc', 'dulled', 'bright' );
    UI.replaceclass( id+'_wid', 'bright', 'dulled' );
    UI.replaceclass( id+'_hgt', 'bright', 'dulled' );
  }
  else {
    UI.replaceclass( id+'_autosize', 'bright', 'dulled' );
    UI.replaceclass( id+'_autosizewid', 'bright', 'dulled' );
    UI.replaceclass( id+'_autosizehgt', 'bright', 'dulled' );
    UI.replaceclass( id+'_autoperc', 'bright', 'dulled' );
    UI.replaceclass( id+'_wid', 'dulled', 'bright' );
    UI.replaceclass( id+'_hgt', 'dulled', 'bright' );
  }
}
DS.userespsize = function( id, e ) { /*2023-03 ADD*/
  DS.resetsizectrls( id, e );
}
DS.usecustomsize = function( id, e ) { /*2023-03 ADD*/
  DS.resetsizectrls( id );
}
DS.resetsize = function( id, e ) { /*2023-03 ADD*/
  DS.resetsizectrls( id, e );
  DS.resize( id );
}
DS.usecustompixelratio = function( id, e ) { /*2023-03 ADD*/
  UI.chk( id+'_devicepixelratio', false );
}
DS.resetpixelratio = function( id, e ) { /*2023-03 ADD*/
  if (e && e.id == id+'_pixelratio')
    DS.usecustompixelratio( id, e );
  if (UI.ischk( id+'_devicepixelratio' )) {
    UI.replaceclass( id+'_devicepixelratio', 'dulled', 'bright' );
    UI.replaceclass( id+'_pixelratio', 'bright', 'dulled' );
  }
  else {
    UI.replaceclass( id+'_devicepixelratio', 'bright', 'dulled' );
    UI.replaceclass( id+'_pixelratio', 'dulled', 'bright' );
  }
  DS.resize( id );
}
DS.resize = function( id ) { /*2023-03 ADD*/
  /* w, h */
  var w = window.innerWidth;
  var h = window.innerHeight;
  var autosz = UI.ischk( id+'_autosize' );
  if (autosz) {
    var perc = UI.num( id+'_autoperc', 1, 100, 50 );
    if (UI.ischk( id+'_autosizewid' ))
      w = Math.floor( w*perc/100 );
    else
      h = Math.floor( h*perc/100 );
  }
  else {
    w = UI.num( id+'_wid', 10, w, w );
    h = UI.num( id+'_hgt', 10, h, h );
  }
  /* resize vp */
  w = UI.clipnum( w, 10, 10000, 400 );
  h = UI.clipnum( h, 10, 10000, 500 );
  UI.setstyle( id+'_canv', 'width', Math.floor(w)+'px' );
  UI.setstyle( id+'_canv', 'height', Math.floor(h)+'px' );
  UI.el(id+'_wid').value = w;
  UI.el(id+'_hgt').value = h;
  /* pixel ratio */
  var usedpr = UI.ischk( id+'_devicepixelratio', true );
  var pixelratio = UI.num( id+'_pixelratio', 0.05, 10.0, 1.0 );
  if (usedpr)
    pixelratio = window.devicePixelRatio;
  UI.el(id+'_pixelratio').value = pixelratio;
  /* resize canvas */
  if (DS.anims[id])
    DS.anims[id].resize( Math.floor(w*pixelratio), Math.floor(h*pixelratio) );
}
DS.setspeed = function( id ) {
  if (DS.anims[id])
    DS.anims[id].setspeed( UI.int(id+'_delay',1,100000,25), 
                           UI.int(id+'_steplines',1,10000,3) );
  DS.resize( id );
}
DS.save = function( id ) {
  if (DS.anims[id])
    UI.el(id+'_save').href = DS.anims[id].view.canvas.toDataURL(),
    UI.el(id+'_save').click();
}
DS.addfilesorurls = function( id, count, keep, namefun, addfun ) {
  var s = "";
  if (keep)
    s = UI.v( id+'_drive' );
  for( var i=0; i<count; i++ )
    s += namefun(i) + '\n',
    addfun( i );
  //UI.el(id+'_drive').value = s;
  UI.el(id+'_drive').innerHTML = s;
}
DS.addurls = function( id, urls ) {
  /*DS.addfilesorurls( id, urls.length, DS.anims[id].params.urls.length, 
                     function(i){return urls[i];}, 
                     function(i){DS.anims[id].addurl(urls[i]);} );*/
  DS.addfilesorurls( id, urls.length, DS.anims[id].params.urls.length, 
                           function(i){return DS.defaultnames?DS.defaultnames[i]:urls[i];}, 
                           function(i){DS.anims[id].addurl(urls[i]);} );
}
DS.addfiles = function( id, files ) {
  DS.addfilesorurls( id, files.length, DS.anims[id].params.files.length, 
                     function(i){return files[i].name;}, 
                     function(i){DS.anims[id].addfile(files[i]);} );
}
DS.nextstep = function() {
  for( var id in DS.anims )
    DS.anims[id].onstep();
}


/*
 *  engine
 */
DS.Animator = function( w, h, canv, delay, steplines, callback ) {
  this.drawframe = function() {
    this.view.context.putImageData( this.frame.data.top, 0, 0 );
    this.view.context.putImageData( this.frame.data.bottom, 0, this.frame.data.top.height );
    return true;
  }
  this.scrollframe = function() {
    var y =  UI.clipnum( this.params.steplines, 1, this.view.canvas.height );
    var d = this.view.context.getImageData( 0, y, this.view.canvas.width, this.view.canvas.height-y );
    this.frame.data.top = d;
    d = this.view.context.getImageData( 0, 0, this.view.canvas.width, y );
    this.frame.data.bottom = d;
    this.frame.filloffset = 0;
  }
  this.appendfiledata = function() {
    var data = this.file.data;
    var i = this.file.offset;
    var datalen = data.length;
    var fill = this.frame.data.bottom.data;
    var j = this.frame.filloffset;
    var filllen = fill.length;
    for( ; i<datalen && j<filllen; i+=3,j+=4 )
      fill[j] = data[i],
      fill[j+1] = data[i+1],
      fill[j+2] = data[i+2],
      fill[j+3] = 255;
    this.file.offset = i;
    this.frame.filloffset = j;
    return j == filllen;
  }
  this.filldata = function( data ) {
    if (this.appendfiledata())
      this.drawframe();
    else
      this.loadfiledata();
  }
  this.addfiledata = function( data ) {
    this.file.data = data;
    this.file.offset = 0;
    this.filldata();
  }
  this.loadfiledata = function() {
    var this_ = this;
    var callbacks = {
      onloaded: function(d) {this_.loadinprogress=false; this_.addfiledata(d);},
      onloaderror: function(m) {this_.loadinprogress=false; this_.onnotify(m);},
      onloadnotify: function(m) {this_.onnotify(m);}
    }
    this.loadinprogress = true;
    var files = this.params.files.length ? this.params.files : this.params.urls;
    if (this.params.files.length)
      DS.loadfile( callbacks, files[this.nextfile] );
    else    
      DS.loadurl( callbacks, files[this.nextfile] );
    this.nextfile++;
    if (this.nextfile >= files.length)
      this.nextfile = 0;
  }
  this.timeout = function() {
    var curtime = (new Date()).getTime();
    var deadtime = this.prevtime + this.params.delay;
    var yes = !this.prevtime || (curtime >= deadtime);
    if (yes)
      this.prevtime = curtime;
    //else    /*2022-10 ADD 4DEBUG*/
      //if (DS.debug)
        //console.log( "Not enough time elapsed: "+(deadtime-curtime) );
    return yes;
  }
  this.onstep = function() {
    if (this.paused)
      return;
    if (!this.loadinprogress && this.timeout()) {
      this.scrollframe();
      this.filldata();
    }
    //console.log( 'next step' );
    window.requestAnimationFrame( DS.nextstep );
  }
  this.onnotify = function( msg ) {
    if (this.callback)
      this.callback( msg );
  }
  this.ispaused = function() {
    return this.paused;
  }
  this.pause = function() {
    this.paused = !this.paused;
    if (!this.paused)
      //window.requestAnimationFrame( DS.nextstep );
      this.start();
  }
  this.initcanvas = function( canv ) {
    if (!this[canv].canvas) return;
    this[canv].context = this[canv].canvas.getContext( '2d' );
    var smooth = false;
    this[canv].context.imageSmoothingEnabled = smooth;
    this[canv].context.fillStyle = 'rgb(255,255,255)';
    this[canv].context.fillRect( 0, 0, this[canv].canvas.width, this[canv].canvas.height );
    return true;
  }
  this.start = function() {
    if (!this.view.canvas) return;
    //this.nextfile = 0;
    if (this.params.files.length || this.params.urls.length)
      {/*console.log( 'start' );*/  window.requestAnimationFrame( DS.nextstep );}
    else
      this.onnotify( "No files on drive" );
    return this.params.files.length || this.params.urls.length;
  }
  this.resize = function( w, h, canv ) {
    if (canv) this.view.canvas = canv;
    if (!this.view.canvas)
      return;
    if (!w) w = this.view.canvas.width;
    if (!h) h = this.view.canvas.height;
    if (this.view.canvas.width == w && this.view.canvas.height == h)
      return;
    this.view.canvas.width = w;
    this.view.canvas.height = h;
    return this.initcanvas( 'view' );
  }
  this.setspeed = function( delay, steplines ) {
    if (delay < 1) delay = 1;
    if (steplines < 1) steplines = 1;
    this.params.delay = delay;
    this.params.steplines = steplines;
  }
  this.getmetadata = function() {
    return this.params.metadata;
  }
  this.setmetadata = function( part, md ) {
    if (!this.params.metadata) this.params.metadata = {};
    if (part)
      this.params.metadata[part] = md;
  }
  this.addfile = function( file ) {
    if (this.params.urls.length) this.nextfile = 0;
    this.params.urls = [];
    this.params.files.push( file );
  }
  this.addurl = function( u ) {
    if (this.params.files.length) this.nextfile = 0;
    this.params.files = [];
    this.params.urls.push( u );
  }
  this.nextfile = 0;
  this.view = {};
  this.params = {metadata:{}, files:[], urls:[]};
  this.frame = {filloffset:0,data:{}};
  this.file = {offset:0,data:[]};
  this.callback = callback;
  this.setspeed( delay, steplines );
  this.resize( w, h, canv );
}


/*
 *  Fetch file from local drive
 */
DS.loadfile = function( callbacks, file ) {
  var reader = new FileReader();
  reader.onerror = function( e ) {callbacks.onloaderror('Error reading file');}
  reader.onload = function( e ) {callbacks.onloaded(new Uint8Array(e.target.result));}
  callbacks.onloadnotify( file.name );
  reader.readAsArrayBuffer( file );
}


/*
 *  Fetch file from web
 */
/*
DS.loadurl = function( callbacks, url ) {
  function progress( e ) {
    callbacks.onloadnotify( url + !e.lengthComputable || e.loaded==e.total ?
                                  '' : ' (loading '+((e.loaded*100)/e.total)+'%)' );
  }
  function complete( e ) {callbacks.onloaded(new Uint8Array(this.response));}
  function err( m ) {callbacks.onloaderror(m);}
  function failed() {err(this.status==404 ? "URL not found" : "Server busy");}
  function canceled( e ) {err( "Canceled" );}
  callbacks.onloadnotify( url );
  try {
    var req = new XMLHttpRequest();
    req.addEventListener( "progress", progress, false );
    req.addEventListener( "load", complete, false );
    req.addEventListener( "error", failed, false );
    req.addEventListener( "abort", canceled, false );
    req.open( "GET", url, true );
    req.responseType = "arraybuffer";
    req.send();
  }
  catch( e ) {
    err( "ERROR: " + url );
  }
}
*/


DS.loadurl = function( callbacks, url ) {
        var isdataurl = url.slice( 0, 5 ) == "data:";
        var file = isdataurl ? "" : url;
        function progress( e ) {
          callbacks.onloadnotify( file + !e.lengthComputable || e.loaded==e.total ?
                                        '' : ' (loading '+((e.loaded*100)/e.total)+'%)' );
        }
        function complete( e ) {
          var d = new Uint8Array( this.response );
          if (isdataurl)
            d = new Uint8Array( [...d, ...d, ...d, ...d, ...d, ...d, ...d, ...d] );
          callbacks.onloaded( d );
        }
        function err( m ) {callbacks.onloaderror(m);}
        function failed() {err(this.status==404 ? "URL not found" : "Server busy");}
        function canceled( e ) {err( "Canceled" );}
        callbacks.onloadnotify( file );
        try {
          var req = new XMLHttpRequest();
          req.addEventListener( "progress", progress, false );
          req.addEventListener( "load", complete, false );
          req.addEventListener( "error", failed, false );
          req.addEventListener( "abort", canceled, false );
          req.open( "GET", url, true );
          req.responseType = "arraybuffer";
          req.send();
        }
        catch( e ) {
          err( "ERROR: " + url );
        }
}


/*
 *  UI support
 */
var UI = {};
UI.el = function( id ) {
  var e;
  if (id && id instanceof HTMLElement)
    e = id;
  else
    e = document.getElementById( id );
  return e;
}
UI.setstyle = function( id, s, v ) {
  var e = UI.el( id );
  if (e) e.style[s] = v;
}
UI.style = function( id, prop ) {
  var e = UI.el( id );
  if (!e) return;
  return window.getComputedStyle( e ).getPropertyValue( prop );
}
UI.remstyle = function( id, s ) {
  var e = UI.el( id );
  if (e) e.style.removeProperty( s );
}
UI.swapstyle = function( id1, id2, prop, iseq ) {
  var e1 = UI.el( id1 );
  var e2 = UI.el( id2 );
  if (e1 && e2) {
    var s1 = UI.style( e1, prop );
    var s2 = UI.style( e2, prop );
    if (s1 || s2)
      if (!iseq || s1 == iseq)
        UI.setstyle( e1, prop, s2 ),
        UI.setstyle( e2, prop, s1 );
  }
}
UI.ischk = function( id, def ) {
  var e = UI.el( id );
  if (!e) return def;
  return e.checked;
}
UI.chk = function( id, v ) {
  var e = UI.el( id );
  e.checked = v;
}
UI.en = function( id, on ) {
  var e = UI.el( id );
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
UI.v = function( id, def ) {
  var e = UI.el( id );
  if (!e) return def;
  if (!e.value && def) return def+"";
  return e.value;
}
UI.putv = function( id, vn ) {
  var e = UI.el( id );
  if (e) e.value = vn;
}
UI.putin = function( id, i ) {
  var e = UI.el( id );
  if (e) e.innerHTML = i ? i.toString() : "";
}
UI.num = function( id, min, max, def ) {
  var n = parseFloat( UI.v(id,def) );
  n = UI.clipnum( n, min, max );
  UI.putv( id, n );
  return n;
}
UI.int = function( id, min, max, def ) {
  var n = parseInt( UI.v(id,def) );
  n = UI.clipnum( n, min, max );
  UI.putv( id, n );
  return n;
}

/*2022-10 ADD*/
UI.replaceclass = function( id, cls1, cls2 ) {
  var e = document.getElementById( id );
  if (e) {
    e.classList.remove( cls1 );
    e.classList.add( cls2 );
  }
}
UI.swapclass = function( id, cls1, cls2 ) {
  var e = document.getElementById( id );
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
/*END 2022-10 ADD*/

/*2022-10 REM
UI.toggle = function( idbtn, id ) {
  UI.swapstyle( idbtn, id, 'visibility' );
}
*/


