/*
 *  "Digital Image Processing" Editor, 2022-2023 Greg Sidal, MIT licence
 *  requires {lib}/imageproc.js, {lib}/uiutil.js, imageprocui.js
 */


/*
 *  UI main, uses UI.ImageProcessor widget
 */
var DIP = {debug: false, debugmsg: function(msg) {if (DIP.debug) console.log(msg);} };
DIP.setup = function( wgtid, srcu, srcname ) {
  function onresize( wgtid ) {
    //var toosmall = UI.responsive.hasmode( IPUI.def.id.mk(wgtid,'canv'), 'small' );
    //UI.showinline( IPUI.def.id.mk(wgtid,'zoom'), !toosmall && IPUI.isopen(wgtid) );
  }
  IPUI.setup( wgtid, srcu, srcname, null, onresize );
}
DIP.togglemenu = function( menuid, paneid ) {
}
DIP.clickback = function( wgtid, x, y ) {
  if (!IPUI.clickback( wgtid )) {
    var cid  = IPUI.def.id.mk( wgtid, 'canv' );
    if (document.elementFromPoint( x, y ) != UI.el(cid))
      UI.togglemenu( 'menubar', 'controlpane' );
  }
}
DIP.clickbackevent = function( event ) {
  return DIP.clickback( 'dip', event.pageX, event.pageY );
}

DIP.clickopen = IPUI.clickopen;
DIP.togglecanvasdata = IPUI.togglecanvasdata;
UI.ImageProcessor.canvasdatamsg += 
'\n\nAlternatively, the offline version of this page can be run locally. ' + 
"Select 'Self-contained downloadable' to download, then open HTML file " + 
"from prompt or from downloads folder using device's file manager.";
//UI.ImageProcessor.forcedisallowcanvasdata = true;
DIP.setsrc = IPUI.setsrc;
DIP.resize = IPUI.resize;
DIP.setview = IPUI.setview;
DIP.toggleview = IPUI.toggleview;
DIP.undo = IPUI.undo;
DIP.save = IPUI.save;
DIP.setupctrls = IPUI.setupctrls;
DIP.super_decorateop = UI.ImageProcessor.decorateop;
UI.ImageProcessor.decorateop = function( opname ) {
  /*
  .text.icon.r:after {content: '  \25B8 ' ;}
  .text.icon.l:before {content: '\25C2  ' ;}
  .text.icon.sw:before {content: ' \21C4  ' ;} 
  .text.icon.xo:before {content: ' \2295  ' ;} 
  .text.icon.a:before {content: ' \2227  ' ;}  
  .text.icon.o:before {content: ' \2228  ' ;}  
  */
  var op = opname.slice( opname.length-1 );
  if (op == "l" || op == "r")
    return "<div class='text icon " + op + "'>" + opname + "</div> ";
  return DIP.super_decorateop( opname );
}


DIP.op = function( wgtid, act ) {
  IPUI.op( wgtid, 'DIP._'+act, act );
}

/* shift ops */
DIP._shr = function( datadescriptor ) {
  var data = datadescriptor.data;
  var len = data.length, ovfl = 0, ovfl2 = 0, cn;
  for( var i=0; i<len; i++ ) {
    cn = data[i];
    ovfl2 = (cn & 0x01) << 7;  //1000 0000
    cn = (cn >> 1) | ovfl;
    ovfl = ovfl2;
    data[i] = cn & 0xff;
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._shl = function( datadescriptor ) {
  var data = datadescriptor.data;
  var len = data.length, ovfl = 0, cn;
  for( var i=len-1; i>=0; i-- ) {
    cn = data[i];
    cn = (cn << 1) | ovfl;
    ovfl = cn > 255;
    data[i] = cn & 0xff;
  }
  datadescriptor.data = data;
  return datadescriptor;
}

/*swap ops*/
DIP._swb = function( datadescriptor ) {
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<len; i++ )
    for( var j=0,mask=0x01,d; j<8; j+=2,mask<<=2 ) {
//if (i<5) DIP.test_showbinstr( mask, " MASK ============", j, 2 );
      d = ((data[i] & mask) << 1) | ((data[i] & (mask<<1)) >> 1);
//if (i<5) DIP.test_showbinstr( data[i], " byte ", j, 2 );
      data[i] &= ~(mask | mask<<1);
      data[i] |= d;
//if (i<5) DIP.test_showbinstr( data[i], " post op", j, 2 );
    }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._swn = function( datadescriptor ) {
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<len; i++ ) {
    data[i] = ((data[i] & 0x0f) << 4) | ((data[i] & 0xf0) >> 4);
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._swy = function( datadescriptor ) {
  var data = datadescriptor.data;
  var len = data.length, cn;
  for( var i=0; i<len; i+=2 ) {
    cn = data[i];
    data[i] = data[i+1];
    data[i+1] = cn;
  }
  datadescriptor.data = data;
  return datadescriptor;
}

/*xor ops*/
DIP._xob = function( datadescriptor ) {
  DIP.debugmsg( "*** XOB ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    var d, mask = 0x01;
    for( var j=0; j<7; j++,mask<<=1 ) {
      if (i<5) DIP.test_showbinstr( mask, "MASK", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op2", j+1, 1 );
      d = (data[i] & mask) ^ ((data[i] & (mask<<1)) >> 1);
      data[i] &= ~mask;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", j, 1 );
    }
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( 0x80, "MASK", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 OVFL", 0, 1 );
      d = (data[i] & 0x80) ^ ((data[i+1] & 0x01) << 7);
      data[i] &= ~0x80;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", 7, 1 );
    }
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._xon = function( datadescriptor ) {
  DIP.debugmsg( "*** XON ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0, d; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1", 0, 4 );
    if (i<5) DIP.test_showbinstr( data[i], "op2", 4, 4 );
    d = (data[i] & 0x0f) ^ ((data[i] & 0xf0) >> 4);
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( data[i], "op1", 4, 4 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 ovfl", 0, 4 );
      d |= (data[i] & 0xf0) ^ ((data[i+1] & 0x0f) << 4);
    }
    data[i] = d;
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._xoy = function( datadescriptor ) {
  DIP.debugmsg( "*** XOY ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<(len-1); i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1" );
    if (i<5) DIP.test_showbinstr( data[i+1], "op2" );
    data[i] = data[i] ^ data[i+1];
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}

/*or ops*/
DIP._ob = function( datadescriptor ) {
  DIP.debugmsg( "*** OB ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    var d, mask = 0x01;
    for( var j=0; j<7; j++,mask<<=1 ) {
      if (i<5) DIP.test_showbinstr( mask, "MASK", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op2", j+1, 1 );
      d = (data[i] & mask) | ((data[i] & (mask<<1)) >> 1);
      data[i] &= ~mask;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", j, 1 );
    }
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( 0x80, "MASK", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 ovfl", 0, 1 );
      d = (data[i] & 0x80) | ((data[i+1] & 0x01) << 7);
      data[i] &= ~0x80;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", 7, 1 );
    }
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._on = function( datadescriptor ) {
  DIP.debugmsg( "*** ON ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0, d; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1", 0, 4 );
    if (i<5) DIP.test_showbinstr( data[i], "op2", 4, 4 );
    d = (data[i] & 0x0f) | ((data[i] & 0xf0) >> 4);
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( data[i], "op1", 4, 4 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 ovfl", 0, 4 );
      d |= (data[i] & 0xf0) | ((data[i+1] & 0x0f) << 4);
    }
    data[i] = d;
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._oy = function( datadescriptor ) {
  DIP.debugmsg( "*** OY ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<(len-1); i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1" );
    if (i<5) DIP.test_showbinstr( data[i+1], "op2" );
    data[i] = data[i] | data[i+1];
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}

/*and ops*/
DIP._ab = function( datadescriptor ) {
  DIP.debugmsg( "*** AB ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    var d, mask = 0x01;
    for( var j=0; j<7; j++,mask<<=1 ) {
      if (i<5) DIP.test_showbinstr( mask, "MASK", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", j, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op2", j+1, 1 );
      d = (data[i] & mask) & ((data[i] & (mask<<1)) >> 1);
      data[i] &= ~mask;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", j, 1 );
    }
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( 0x80, "MASK", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i], "op1", 7, 1 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 ovfl", 0, 1 );
      d = (data[i] & 0x80) & ((data[i+1] & 0x01) << 7);
      data[i] &= ~0x80;
      data[i] |= d;
      if (i<5) DIP.test_showbinstr( data[i], "post op", 7, 1 );
    }
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._an = function( datadescriptor ) {
  DIP.debugmsg( "*** AN ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0, d; i<len; i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1", 0, 4 );
    if (i<5) DIP.test_showbinstr( data[i], "op2", 4, 4 );
    d = (data[i] & 0x0f) & ((data[i] & 0xf0) >> 4);
    if ((i+1) < len) {
      if (i<5) DIP.test_showbinstr( data[i], "op1", 4, 4 );
      if (i<5) DIP.test_showbinstr( data[i+1], "op2 ovfl", 0, 4 );
      d |= (data[i] & 0xf0) & ((data[i+1] & 0x0f) << 4);
    }
    data[i] = d;
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}
DIP._ay = function( datadescriptor ) {
  DIP.debugmsg( "*** AY ***" );
  var data = datadescriptor.data;
  var len = data.length;
  for( var i=0; i<(len-1); i++ ) {
    if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
    if (i<5) DIP.test_showbinstr( data[i], "op1" );
    if (i<5) DIP.test_showbinstr( data[i+1], "op2" );
    data[i] = data[i] & data[i+1];
    if (i<5) DIP.test_showbinstr( data[i], "post op" );
  }
  datadescriptor.data = data;
  return datadescriptor;
}


/*C ops*/
DIP._xoC = function( datadescriptor, params ) {
  return DIP.opC( datadescriptor, params, 'x' );
}
DIP._oC = function( datadescriptor, params ) {
  return DIP.opC( datadescriptor, params, 'o' );
}
DIP._aC = function( datadescriptor, params ) {
  return DIP.opC( datadescriptor, params, 'a' );
}
IPUI.def.sfx.C = '_C';
DIP.opC = function( datadescriptor, params, op ) {
  var hex =   ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
  function hexclean( hs, pad ) {
    function cleanchar( c ) {
      var i = hex.indexOf( c );
      if (i < 0)
        i = hex.indexOf( pad );
      return hex[i];
    }
    hs = hs ? hs.toLowerCase() : "";
    if (hs.length % 2)
      hs += pad;
    var chs = "";
    for( var i=0; i<hs.length; i++ )
      chs += cleanchar( hs[i] );
    return chs;
  }
  function hexstr2bytes( hs ) {
    function hex2byte( c ) {
      return hex.indexOf( c );
    }
    var bytes = new Uint8Array( hs.length/2 );
    for( var i=0; i<bytes.length; i++ )
      bytes[i] = (hex2byte(hs[i*2]) << 4) | hex2byte(hs[(i*2)+1]);
    return bytes;
  }
  DIP.debugmsg( "*** " + op + "C ***" );
  var data = datadescriptor.data;
  var len = data.length;
  var chs = hexclean( UI.v(IPUI.def.id.mk(params.wgtid,'C')), op=='a'?'f':'0' );
  UI.putv( IPUI.def.id.mk(params.wgtid,'C'), chs );
  var C = hexstr2bytes( chs );
  var clen = C.length;
  if (clen)
    for( var i=0, d; i<len; )
      for( var j=0; i<len && j<clen; i++, j++ ) {
        if (i<5) DIP.debugmsg( "============BYTE " + i + "===========" );
        if (i<5) DIP.test_showbinstr( data[i], "d" );
        if (i<5) DIP.test_showbinstr( C[j], "C" );
        if (op == 'x')
          d = data[i] ^ C[j];
        else
          if (op == 'a')
            d = data[i] & C[j];
          else
            d = data[i] | C[j];
        data[i] = d;
        if (i<5) DIP.test_showbinstr( data[i], "d post op" );
      }
  datadescriptor.data = data;
  return datadescriptor;
}


/*test*/
DIP.test_showbinstr = function( byte, msg, highlight, highlightlen ) {
  var binstr = DIP.test_2binstr( byte, highlight, highlightlen );
  DIP.debugmsg( binstr+" "+msg );
  return binstr;
}
DIP.test_2binstr = function( byte, highlight, highlightlen ) {
  var binstr = "";
  for( var j=0,mask=0x01,d; j<8; j++,mask<<=1 )
    binstr = ((byte & mask) ? "1" : "0") + binstr;
  if (highlightlen) {
    var s = 8 - (highlight + highlightlen);
    var e = 8 - highlight;
    var bs = binstr.slice( 0, s ) + "(";
    bs += binstr.slice( s, e ) + ")";
    bs += binstr.slice( e );
    binstr = bs;
  }
  return binstr;
}
