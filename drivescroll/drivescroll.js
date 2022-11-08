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
  DS.setsizectrls( id );
  DS.anims[id] = new DS.Animator( UI.int(id+'_wid',10,10000,900), 
                                  UI.int(id+'_hgt',10,10000,800), 
                                  UI.el(id+'_canv'), 
                                  UI.int(id+'_delay',1,100000,25), 
                                  UI.int(id+'_steplines',1,10000,3), notify );
  DS.addurls( id, DS.defaulturls );
}
DS.forcedisallowcanvasdata = false; //true: simulate Tor Browser for testing
DS.togglecanvasdata = function() {DS.forcedisallowcanvasdata = !DS.forcedisallowcanvasdata;}
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
    alert( "Canvas data must be enabled for this browser" );
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
DS.setsizectrls = function( id, chg ) {
  var chk = UI.ischk( id+'_autosize', true );

  var pw = DS.prev.w;
  var ph = DS.prev.h;

  /*2022-10 ADD*/
  var usedpr = UI.ischk( id+'_devicepixelratio', true );
  var pixelratio = UI.num( id+'_pixelratio', 0.01, 20.0, 1.0 );
  if (usedpr)
    pixelratio = window.devicePixelRatio;
  if (usedpr)
    UI.el(id+'_pixelratio').value = pixelratio;
  UI.el(id+'_pixelratio').disabled = usedpr;
  /*END 2022-10 ADD*/

  var w = Math.floor( window.innerWidth*pixelratio );   /*2022-10 EDIT add pr*/
  var h = Math.floor( window.innerHeight*pixelratio );  /*2022-10 EDIT add pr*/

  if (w < h && pw == 0 && ph == 0)  /*2022-10 EDIT*/
    if (UI.ischk( id+'_autosize', true ))
      UI.putv( id+'_autoperc', 100 );

  DS.prev.w = w;
  DS.prev.h = h;

  UI.setstyle( id+'_sizebox', 'display', chk?'none':'block' );
  UI.el(id+'_autoperc').disabled = !chk;
  var perc = UI.num( id+'_autoperc', 1, 100, 50 );
  //var w = parseFloat( UI.style(id+'_back','width') );
  //var h = parseFloat( UI.style(id+'_back','height') );

  /*2022-10 DEL*/
  /*UI.el(id+'_size2msg').innerHTML = w>h ? 'width' : 'height';
  UI.el(id+'_size1msg').innerHTML = w>h ? 'height' : 'width';*/

  if (w > h)
    w = Math.floor( w*perc/100 );
  else
    h = Math.floor( h*perc/100 );
  if (chk || chg) {
    UI.el(id+'_wid').value = w;
    UI.el(id+'_hgt').value = h;
  }
}
DS.resize = function( id, chg ) {
  DS.setsizectrls( id, chg );
  if (DS.anims[id])
    DS.anims[id].resize( UI.int(id+'_wid',10,10000,900), UI.int(id+'_hgt',10,10000,800) );
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


