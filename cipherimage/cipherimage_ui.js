/*
 *  CipherImage UI Support 2021, Greg Sidal, MIT licence
 */


/*
 *  UI main
 */
var CI = {open:false,views:[],fresh:true,default:0,opencallback:function(id){},filename:""};
CI.waitsize = 1600000;         /*2022-12 ADD min img size for wait prompt*/
CI.forcedisallowcanvasdata = false; //true: simulate Tor Browser for testing

CI.setup = function( id, srcu, srcname ) {
  function notify( msg, img ) {
    if (msg) {
      if (msg.slice(0,6) == 'ERROR:')
        alert( msg );
      else
        UI.puts( id+'_stats', msg );
        CI.filename = msg;
    }
    else
      if (CI.views[id]) {
        CI.open=true, CI.fresh=true, CI.default++;
        CI.setupctrls( id, CI.views[id].isCipherimg() );
        CI.resize( id );  /*2022-12 ADD*/
        CI.opencallback( id );
      }
  }
  CI.views[id] = new CipherImage.FileViewer( UI.el(id+'_canv'), notify );
  if (srcu) {
    setTimeout( "CI.drawimg('"+id+"',null,'"+srcu+"')", 100 );
    notify( srcname ? srcname : srcu );
  }
  else {
    CI.default = 1;
    CI.resize( id );  /*2023-03 ADD*/
  }
  //UI.setstyle( id+'_canvasdata', 'display', CI.forcedisallowcanvasdata?'block':'none' );
}
CI.clickback = function( id ) {
  //if (UI.style( id+'_isimgopen', 'display' ) == 'none')
  if (CI.open)
    UI.toggle( 'menubar', 'controlpane' );
  else
    CI.clickopen( id );
}
CI.clickopen = function( id ) {
  if (CI.testcanvas( id ))
    UI.el( id+'_file' ).click();
}
CI.togglecanvasdata = function() {CI.forcedisallowcanvasdata = !CI.forcedisallowcanvasdata;}
/*2022-12 ADD*/ CI.canvasdatamsg =  
'Web browser is blocking use of canvas data.\n\n' +
'Some privacy-oriented browsers such as Tor do this by default to prevent an ' + 
'exploit used by "ad" (surveillance) networks to uniquely identify users.\n\n' + 
'Browser may have a setting that allows canvas data, ' + 
'or the offline version of this page can be downloaded and run locally ' + 
"(select 'Self-contained downloadable' to download, then open HTML file " + 
"from prompt or from downloads folder using device's file manager).";
CI.testcanvas = function( id ) {
  try {
    var c = document.createElement( 'canvas' );
    c.width = c.height = 1;
    var cx = c.getContext( '2d' );
    var i = cx.getImageData( 0, 0, 1, 1 );
    i.data[0] = 10, i.data[1] = 20, i.data[2] = 30, i.data[3] = 255;
    cx.putImageData( i, 0, 0 );
    i = cx.getImageData( 0, 0, 1, 1 );
    if (CI.forcedisallowcanvasdata)
      i.data[0] = 255;
    if (i.data[0] == 10 && i.data[1] == 20 && i.data[2] == 30 && i.data[3] == 255)
      return true;
    alert( CI.canvasdatamsg );
  }
  catch( e ) {
    alert( "Browser lacks full support for canvas" );
  }
  return false;
}
CI.drawimg = function( id, f, u ) {
  CI.views[id].setsrc( f, u );
  //CI.testcanvas( id );
}
CI.setsrc = function( id, f, u ) {
  if (f || u)
    CI.views[id].setsrc( f, u );
}
CI.resize = function( id, chg ) {  /*2022-12 ADD*/
  UI.center( id+'_canv' );
}
CI.resize_NOTUSED = function( id, chg ) {
  CI.setsizectrls( id, chg );
  if (CI.views[id])
    CI.views[id].resize( UI.int(id+'_wid',10,10000,900), UI.int(id+'_hgt',10,10000,800) );
}
CI.save = function( id ) {
  if (CI.views[id]) {
    /*var bin = CI.views[id].getrgbdata();
    var blob = new Blob( [bin] );
    var url = URL.createObjectURL( blob ); */

    if (CI.default <= 1)
      alert( "Demo image can not be saved (Chrome security policy).  Images opened locally can be saved." );
    else {
      var url = CI.views[id].getBmpDataUrl();
      UI.el(id+'_save').href = url;
      UI.el(id+'_save').download = UI.v( id+'_savefilename', "cipherimage.png" );  /*2022-10 ADD*/
      UI.el(id+'_save').click();
    }

    //URL.revokeObjectURL( url );
  }
}
CI.setupctrls = function( id, iscry ) {
  UI.setstyle( id+'_wait', 'display', 'none' );      /*2022-10 ADD*/
  UI.setstyle( id+'_isimgopen', 'display', 'block' );
  UI.setstyle( id+'_encryptbtn', 'display', iscry?'none':'inline-block' );
  UI.setstyle( id+'_randpass', 'display', iscry?'none':'block' );
  UI.setstyle( id+'_decryptbtn', 'display', iscry?'inline-block':'none' );
  UI.setstyle( id+'_iscipherimg', 'display', iscry?'block':'none' );
  UI.setstyle( id+'_savebtn', 'display', CI.fresh?'none':'inline-block' );
  UI.setstyle( id+'_savectrls', 'display', CI.fresh?'none':'block' );   /*2022-10 ADD*/
  //UI.el(id+'_save').disabled = iscry;
  var canv = UI.el( id+'_canv' );
  if (canv && CI.filename)
    UI.puts( id+'_subtitle', CI.filename+" ("+canv.width+"x"+canv.height+")" );
  else
    UI.puts( id+'_subtitle', "" );
}
CI.showpass = function( id, pass ) {
  UI.putv( id+'_pass', pass );
  UI.puts( id+'_title', pass );
}
CI.randpass = function( id, numbytes ) {
  if (!window.crypto || !window.crypto.getRandomValues)   /*2022-10 ADD*/
    return alert( "Browser lacks support for secure random number generation" );
  numbytes = numbytes ? numbytes : UI.int(id+'_randbytes',1,32);
  var ra = Rand.bytearray( numbytes );
  var pass = Rand.bytes2hexstr( ra );
  CI.showpass( id, pass );
  UI.putv( id+'_numbytes', numbytes );
}
CI.wait = function( id, act ) {     /*2022-10 ADD*/
  if (!CI.testcanvas( id ))
    return;
  var canv = UI.el( id+'_canv' );
  if (!canv)
    return;
  if ((canv.width*canv.height) > CI.waitsize)
    UI.setstyle( id+'_wait', 'display', 'block' );
  setTimeout( "CI._" + act + "('" + id + "')", 10 );
}

/*2022-10 ADD*/
CI._encrypt = function( id ) {
  CI.views[id].encrypt( UI.v(id+'_pass') );
  CI.fresh = false;
  CI.setupctrls( id, true );
}
CI._decrypt = function( id ) {
  var plain = CI.views[id].decrypt( UI.v(id+'_pass') );
  if (!plain)
    alert( "Wrong key!!!" );
  CI.setupctrls( id, plain?false:true );
}
/*2022-10 END ADD*/

CI.encrypt = function( id ) {   /*2022-10 EDIT*/
  CI.wait( id, 'encrypt' );
}
CI.decrypt = function( id ) {    /*2022-10 EDIT*/
  CI.wait( id, 'decrypt' );
}


/*
 *  miner
 */
CI.miner = {
  key: [0],
  paused: true,
  keylen: 0,
  setupctrls: function( id ) {
    UI.setstyle( id+'_minebtn', 'display', CI.miner.paused?'inline-block':'none' );
    UI.setstyle( id+'_pausebtn', 'display', CI.miner.paused?'none':'inline-block' );
    UI.setstyle( id+'_passvw', 'display', UI.v(id+'_pass')?'inline-block':'none' );
    UI.el(id+'_randbytes').disabled = !CI.miner.paused;
  },
  inckey: function() {
    CI.miner.key = Rand.incbytes( CI.miner.key );
    return CI.miner.key.length <= (CI.miner.keylen ? CI.miner.keylen : 32);
  },
  trynextkey: function( id ) {
    if (CI.miner.paused)
      return;
    if (!CI.miner.origimgdata)
      CI.miner.origimgdata = CI.views[id].getviewdata();
    var pass = Rand.bytes2hexstr( CI.miner.key );
    CI.showpass( id, pass );
    var plain = CI.views[id].decryptreset( pass, CI.miner.origimgdata );
    if (plain) {
      CI.miner.pause( id );
      CI.setupctrls( id, false );
      alert( "Found key!!!" );
    }
    else {
      if (CI.miner.inckey())
        setTimeout( "CI.miner.trynextkey('"+id+"')", 10 );
      else {
        CI.miner.pause( id );
        CI.setupctrls( id, true );
        CI.miner.setupctrls( id );
        CI.miner.keylen = 0;
        CI.miner.key = [0];
      }
    }
  },
  start: function( id ) {
    if (!CI.testcanvas( id ))
      return;
    if (!CI.miner.paused)
      if (!CI.views[id].isCipherimg())
        return alert( "Open a CipherImage first" );
    var keylen = UI.int( id+'_randbytes', 0, 32, 0 );
    if (keylen != CI.miner.keylen) {
      CI.miner.keylen = keylen;
      CI.miner.key = keylen ? Rand.initbytes( keylen ) : [0];
    }
    if (!CI.miner.keylen)
      UI.putv( id+'_randbytes', "" );
    CI.miner.paused = false;
    CI.showpass( id, Rand.bytes2hexstr(CI.miner.key) );
    CI.miner.setupctrls( id );
    CI.miner.trynextkey( id );
  },
  pause: function( id ) {
    CI.miner.paused = true;
    CI.miner.setupctrls( id );
  },
  setup: function( id ) {
    CI.opencallback = CI.miner.setup;
    CI.miner.origimgdata = null;
    CI.miner.paused = true;
    CI.miner.keylen = 0;
    CI.miner.key = [0];
    CI.showpass( id, "" );
    CI.miner.setupctrls( id );
    if (CI.default > 0)
      if (!CI.views[id].isCipherimg())
        return alert( "Not a CipherImage" );
  },
  init: function( id ) {
    CI.opencallback = CI.miner.setup;
    CI.miner.origimgdata = null;
    CI.miner.paused = true;
    CI.miner.key = [0];
  }
}


/*
 *  UI utils
 */
var UI = {
  el: function( id ) {
    var e;
    if (id && id instanceof HTMLElement)
      e = id;
    else
      e = document.getElementById( id );
    return e;
  },
  setstyle: function( id, s, v ) {
    var e = UI.el( id );
    if (e) e.style[s] = v;
  },
  style: function( id, prop ) {
    var e = UI.el( id );
    if (!e) return;
    return window.getComputedStyle( e ).getPropertyValue( prop );
  },
  swapstyle: function( id1, id2, prop, iseq ) {
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
  },
  ischk: function( id, def ) {
    var e = UI.el( id );
    if (!e) return def;
    return e.checked;
  },
  chk: function( id, v ) {
    var e = UI.el( id );
    e.checked = v;
  },
  en: function( id, on ) {
    var e = UI.el( id );
    e.disabled = !on;
  },
  clipnum: function( n, min, max ) {
    n = isFinite(n) ? n : 0;
    if (min != undefined)
      n = n < min ? min : n;
    if (max != undefined)
      n = n > max ? max : n;
    return n;
  },
  v: function( id, def ) {
    var e = UI.el( id );
    if (!e) return def;
    if (!e.value && def) return def+"";
    return e.value;
  },
  putv: function( id, vn ) {
    var e = UI.el( id );
    if (e) e.value = vn;
  },
  puts: function( id, s ) {
    var e = UI.el( id );
    if (e) e.innerHTML = s ? s : "";
  },
  gets: function( id ) {
    var e = UI.el( id );
    return e ? e.innerHTML : "";
  },
  putin: function( id, i ) {
    UI.puts( id, i, i?i.toString():"" );
  },
  num: function( id, min, max, def ) {
    var n = parseFloat( UI.v(id,def) );
    n = UI.clipnum( n, min, max );
    UI.putv( id, n );
    return n;
  },
  int: function( id, min, max, def ) {
    var n = parseInt( UI.v(id,def) );
    n = UI.clipnum( n, min, max );
    UI.putv( id, n );
    return n;
  } 
  /*  2022-10 REM,
  toggle: function( idbtn, id ) {
    UI.swapstyle( idbtn, id, 'visibility' );
  },
  unfold: function( idunfoldbtn, idfoldbtn, idfoldpane ) {
    UI.setstyle( idunfoldbtn, 'display', 'none' );
    UI.setstyle( idfoldbtn, 'display', 'inline-block' );
    UI.setstyle( idfoldpane, 'display', 'block' );
  },
  fold: function( idunfoldbtn, idfoldbtn, idfoldpane ) {
    UI.setstyle( idunfoldbtn, 'display', 'inline-block' );
    UI.setstyle( idfoldbtn, 'display', 'none' );
    UI.setstyle( idfoldpane, 'display', 'none' );
  }*/
};

/*2022-10 ADD*/
UI.replaceclass = function( id, cls1, cls2 ) {
  var e = UI.el( id );  /*2022-12 EDIT*/
  if (e) {
    e.classList.remove( cls1 );
    e.classList.add( cls2 );
  }
}
UI.swapclass = function( id, cls1, cls2 ) {
  var e = UI.el( id );  /*2022-12 EDIT*/
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



/*2023-03 ADD*/
UI.remclass = function( id, cls ) {
  var e = UI.el( id );
  if (e)
    e.classList.remove( cls );
}
UI.addclass = function( id, cls ) {
  var e = UI.el( id );
  if (e)
    e.classList.add( cls );
}
UI.center = function( id, idcontainer, centervert ) {return UI.view.center(id,idcontainer);}
//UI.el = UI.gete;
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
