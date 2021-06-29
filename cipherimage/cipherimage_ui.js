/*
 *  CipherImage UI Support 2021, Greg Sidal, MIT licence
 */


/*
 *  UI main
 */
var CI = {open:false,views:[],fresh:true,default:0,opencallback:function(id){},filename:""};
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
        CI.opencallback( id );
      }
  }
  CI.views[id] = new CipherImage.FileViewer( UI.el(id+'_canv'), notify );
  if (srcu) {
    setTimeout( "CI.drawimg('"+id+"',null,'"+srcu+"')", 100 );
    notify( srcname ? srcname : srcu );
  }
  else
    CI.default = 1;
  UI.setstyle( id+'_canvasdata', 'display', CI.forcedisallowcanvasdata?'block':'none' );
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
    alert( "Canvas data must be enabled for this browser" );
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
CI.resize = function( id, chg ) {
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
      UI.el(id+'_save').click();
    }

    //URL.revokeObjectURL( url );
  }
}
CI.setupctrls = function( id, iscry ) {
  UI.setstyle( id+'_isimgopen', 'display', 'block' );
  UI.setstyle( id+'_encryptbtn', 'display', iscry?'none':'inline-block' );
  UI.setstyle( id+'_randpass', 'display', iscry?'none':'block' );
  UI.setstyle( id+'_decryptbtn', 'display', iscry?'inline-block':'none' );
  UI.setstyle( id+'_iscipherimg', 'display', iscry?'block':'none' );
  UI.setstyle( id+'_savebtn', 'display', CI.fresh?'none':'inline-block' );
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
  numbytes = numbytes ? numbytes : UI.int(id+'_randbytes',1,32);
  var ra = Rand.bytearray( numbytes );
  var pass = Rand.bytes2hexstr( ra );
  CI.showpass( id, pass );
  UI.putv( id+'_numbytes', numbytes );
}
CI.encrypt = function( id ) {
  if (!CI.testcanvas( id ))
    return;
  CI.views[id].encrypt( UI.v(id+'_pass') );
  CI.fresh = false;
  CI.setupctrls( id, true );
}
CI.decrypt = function( id ) {
  if (!CI.testcanvas( id ))
    return;
  //if (!CI.views[id].testpass( UI.v(id+'_pass') ))
    //return alert( "Wrong key!!!" );
  var plain = CI.views[id].decrypt( UI.v(id+'_pass') );
  if (!plain)
    alert( "Wrong key!!!" );
  CI.setupctrls( id, plain?false:true );
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
  },
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
  }
};
