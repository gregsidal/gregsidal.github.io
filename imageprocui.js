/*
 *  Widgets for image viewer/processor, 2022 Greg Sidal, MIT licence
 *    requires {lib}/imageproc.js, {lib}/uiutil.js
 *
 *  UI.ImageViewer:     viewer with manipulation (panning, zooming)
 *  UI.ImageProcessor:  UI.ImageViewer with image data processing
 */


/*
 *  Image viewer
 */
UI.ImageViewer = {
  def: {
    /* ID names: wgtid + def.id[sfx] */
    sfx: {
      /* required canvas or image (container is immediate parent) */
      canv:       '_canv',

      /* optional */
      stats:      '_stats',         //file name
      title:      '_subtitle',      //file name
      size:       '_size',          //img size
      file:       '_file',          //open file "button"
      save:       '_save',          //save file "button"
      savefn:     '_savefilename',  //input box for save file name

      /* optional sections reflecting states (css class names 'opened' or 'closed' applied) */
      manip:      '_manip',         /*when image is UI.responsive.ismanipview*/
      fit:        '_fitbtn',        /*when image is Manipulator.fitted*/
      actual:     '_actualbtn',     /*when image is Manipulator.actual (1px==1devicepx)*/
      isopen:     '_isimgopen',     /*when image is open*/
      wait:       '_wait',          /*when large image is processing*/
      saveable:   '_savectrls',     /*when image is changed*/
    },
    id: {
      mk:         function( pfx, sfx ) {return pfx + (UI.ImageViewer.def.sfx[sfx] ? UI.ImageViewer.def.sfx[sfx] : '');},
      el:         function( pfx, sfx ) {return UI.el( UI.ImageViewer.def.id.mk(pfx,sfx) );}
    },
    css: {
      default:    'stretch',
      get:        function( n ) {return (UI.ImageViewer.def.css[n] ? UI.ImageViewer.def.css[n] : '');}
    }
  },
  views: [],
  forcedisallowcanvasdata: false     //true: simulate Tor Browser for testing
};
UI.ImageViewer.init = function( wgtid, params ) {
  params = params ? params : {};
  var initviewresize = UI.responsive.isresizeview( UI.ImageViewer.def.id.el(wgtid,'canv') );
  /*
  var params = {src: {url: srcu}, 
                dim: {wid: 0, hgt: 0},
                name: srcname, 
                setinitviewfromcss: false, 
                callbacks: {open: opencallback, resize: resizecallback}, 
                CanvasImageFile: CanvasImage.File, 
                metadata: {} };
  */
  function notify( msg ) {
    if (UI.ImageViewer.views[wgtid].cif)
      if (msg) {
        if (msg.slice(0,6) == 'ERROR:')
          alert( msg );
        else
          UI.ImageViewer.views[wgtid].filename = msg;
      }
      else {
        if (!UI.ImageViewer.views[wgtid].open)
          UI.remclass( UI.ImageViewer.def.id.mk(wgtid,'canv'), UI.ImageViewer.def.css.get('default') );
        UI.ImageViewer.views[wgtid].open=true, UI.ImageViewer.views[wgtid].default++;
        if (params.setinitviewfromcss && initviewresize)
          UI.ImageViewer.setresizeview( wgtid );
        else
          UI.ImageViewer.setmanipview( wgtid );
        UI.ImageViewer.setupctrls( wgtid, false );
        UI.ImageViewer.views[wgtid].opencallback( wgtid );
      }
  }
  UI.ImageViewer.views[wgtid] = {open: false,
                    default: 0, 
                    opencallback: (params.callbacks && params.callbacks.open) ? params.callbacks.open : function(){}, 
                    resizecallback: (params.callbacks && params.callbacks.resize) ? params.callbacks.resize : function(){}, 
                    filename: "", 
                    metadata: params.metadata};
  if (params.CanvasImageFile)
    UI.ImageViewer.views[wgtid].cif = new params.CanvasImageFile( UI.ImageViewer.def.id.el(wgtid,'canv'), notify );
  else
    UI.ImageViewer.views[wgtid].cif = new CanvasImage.File( UI.ImageViewer.def.id.el(wgtid,'canv'), notify );
  if (params.src.url)
    UI.ImageViewer.setsrc( wgtid, null, params.src.url );
  else
    UI.ImageViewer.views[wgtid].default = 1;
  if (params.dim)
    UI.ImageViewer.views[wgtid].cif.getcanvasimageobj().setsize( params.dim.wid, params.dim.hgt );
  if (!params.src.url)
    UI.ImageViewer.resizeid( wgtid, true );
}
UI.ImageViewer.setsrc = function( wgtid, f, u ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif)
    if (f || u)
      UI.ImageViewer.views[wgtid].cif.getcanvasimagefileobj().setsrc( f, u );
}
UI.ImageViewer.clickopen = function( wgtid ) {
  if (UI.ImageViewer.testcanvas( wgtid ))
    UI.ImageViewer.def.id.el( wgtid, 'file' ).click();
}
UI.ImageViewer.ismanipview = function( wgtid ) {
  return UI.responsive.ismanipview( UI.ImageViewer.def.id.mk(wgtid,'canv') );
}
UI.ImageViewer.isfitted = function( wgtid ) {
  var m = UI.manipulation.getmanipulator( UI.ImageViewer.def.id.mk(wgtid,'canv') );
  return m ? m.getstates().fitted : false;
}
UI.ImageViewer.isactual = function( wgtid ) {
  var m = UI.manipulation.getmanipulator( UI.ImageViewer.def.id.mk(wgtid,'canv') );
  return m ? m.getstates().actualsize : false;
}
UI.ImageViewer.isopen = function( wgtid ) {
  return (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].open);
}
UI.ImageViewer.clickback = function( wgtid ) {
  if (UI.ImageViewer.isopen( wgtid ))
    return false;
  UI.ImageViewer.clickopen( wgtid );
  return true;
}
UI.ImageViewer.onmanipstatechg = function( wgtid, states ) {
  if (wgtid instanceof HTMLElement)
    wgtid = wgtid.id.split('_')[0];
  UI.ImageViewer.opensection( wgtid, 'fit', !states.fitted );
  UI.ImageViewer.opensection( wgtid, 'actual', !states.actualsize );
}
UI.ImageViewer.resizeid = function( wgtid, init ) {
  if (wgtid instanceof HTMLElement)
    wgtid = wgtid.id.split('_')[0];
  if (!UI.ImageViewer.views[wgtid])
    throw( "No ImageViewer has been created for Id '" + wgtid + "' (call UI.ImageViewer.init)" );
  var canv = UI.el( UI.ImageViewer.def.id.mk(wgtid,'canv') );
  UI.responsive.resize( canv, null, init );
  var m = UI.manipulation.getmanipulator( canv );
  if (!m)
    return;
  m.setstatechangelistener( UI.ImageViewer.onmanipstatechg );
  UI.ImageViewer.views[wgtid].resizecallback( wgtid );
}
UI.ImageViewer.resize = function( wgtid ) {
  if (wgtid)
    UI.ImageViewer.resizeid( wgtid );
  else
    UI.responsive.processelems( UI.ImageViewer.resizeid );
}
UI.ImageViewer.setmanipstate = function( wgtid, vw ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    var m = UI.manipulation.getmanipulator( UI.ImageViewer.def.id.mk(wgtid,'canv') );
    if (m)
      m.reset( vw );
  }
}
UI.ImageViewer.setresizeview = function( wgtid ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    if (UI.responsive.setresizeview( UI.ImageViewer.def.id.mk(wgtid,'canv') ))
      UI.ImageViewer.opensection( wgtid, 'manip', false );
    return UI.ImageViewer.resize( wgtid );
  }
}
UI.ImageViewer.setmanipview = function( wgtid ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    if (UI.responsive.setmanipview( UI.ImageViewer.def.id.mk(wgtid,'canv') ))
      UI.ImageViewer.opensection( wgtid, 'manip', true );
    return UI.ImageViewer.resize( wgtid );
  }
}
UI.ImageViewer.toggleview = function( wgtid ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif)
    if (UI.responsive.ismanipview( UI.ImageViewer.def.id.mk(wgtid,'canv') ))
      UI.ImageViewer.setresizeview( wgtid );
    else
      UI.ImageViewer.setmanipview( wgtid );
}
UI.ImageViewer.save = function( wgtid ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif)
    if (UI.ImageViewer.views[wgtid].default <= 1)
      alert( "Demo image can not be saved (Chrome security policy).  Images opened locally can be saved locally." );
    else {
      var url = UI.ImageViewer.views[wgtid].cif.getcanvasimagefileobj().getBmpDataUrl();
      UI.ImageViewer.def.id.el(wgtid,'save').href = url;
      UI.ImageViewer.def.id.el(wgtid,'save').download = UI.v( UI.ImageViewer.def.id.mk(wgtid,'savefn'), wgtid+".png" );
      UI.ImageViewer.def.id.el(wgtid,'save').click();
    }
}
UI.ImageViewer.opensection = function( wgtid, sfx, op ) {
  var f = UI.ImageViewer.def.id.mk( wgtid, sfx );
  if (op)
    UI.replaceclass( f, 'closed', 'opened' );
  else
    UI.replaceclass( f, 'opened', 'closed' );
}
UI.ImageViewer.showwait = function( wgtid, show ) {
  //UI.ImageViewer.opensection( wgtid, 'wait', show );
  UI.show( UI.ImageViewer.def.id.mk(wgtid,'wait'), show );
}
UI.ImageViewer.setupctrls = function( wgtid, ismod ) {
  UI.ImageViewer.showwait( wgtid, false );
  UI.ImageViewer.opensection( wgtid, 'isopen', true );
  UI.ImageViewer.opensection( wgtid, 'saveable', ismod );
  var canv = UI.el( UI.ImageViewer.def.id.mk(wgtid,'canv') );
  if (canv && UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].filename) {
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'title'), UI.ImageViewer.views[wgtid].filename );
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'stats'), UI.ImageViewer.views[wgtid].filename );
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'size'), canv.width + "x" + canv.height );
  }
  else {
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'title'), "" );
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'stats'), "" );
    UI.puts( UI.ImageViewer.def.id.mk(wgtid,'size'), "" );
  }
  //UI.showinline( UI.ImageViewer.def.id.mk(wgtid,'manip'), true );
}
UI.ImageViewer.waitdo = function( wgtid, dofunstr ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    UI.ImageViewer.showwait( wgtid, true );
    setTimeout( dofunstr, 100 );
  }
}


/*
UI.ImageProcessor  Image data processing on canvas
*/
UI.ImageProcessor = UI.ImageViewer;
UI.ImageProcessor.def.sfx.oplist = '_oplist';
UI.ImageProcessor.waitsize = 3900000;   //show wait prompt when image larger than this
UI.ImageProcessor.setup = function( wgtid, srcu, srcname, opencallback, resizecallback ) {
  function onopen( wgtid ) {
    if (UI.ImageViewer.views[wgtid].cif) {
      UI.ImageViewer.views[wgtid].processor.ops = [];
      UI.ImageProcessor.pushop( wgtid, 'open' );
      UI.ImageProcessor.views[wgtid].metadata.opencallback( wgtid );
    }
  }
  var params = {src: {url: srcu}, 
                name: srcname, 
                callbacks: {open: onopen, resize: resizecallback}, 
                CanvasImageFile: CanvasImage.File.Data,
                metadata: {'opencallback':opencallback?opencallback:function(){}} };
  UI.ImageViewer.init( wgtid, params );
  UI.ImageViewer.views[wgtid].processor = {maxops:1000, ops:[]};
}
UI.ImageProcessor.setmaxops = function( wgtid, maxops ) {
  UI.ImageViewer.views[wgtid].processor.maxops = maxops;
}
UI.ImageProcessor.decorateop = function( opname ) {
  var op = opname.slice( 0, opname.length-1 );
  return "<div class='text icon " + op + "'>" + opname + "</div>";
}
UI.ImageProcessor.showops = function( wgtid ) {
  var sfx = "", oplist = "";
  for( var i=1; i<UI.ImageProcessor.views[wgtid].processor.ops.length; i++ ) {
    sfx += "-" + UI.ImageProcessor.views[wgtid].processor.ops[i].opname;
    oplist += UI.ImageProcessor.decorateop( UI.ImageProcessor.views[wgtid].processor.ops[i].opname );
  }
  if (oplist) UI.puts( UI.ImageViewer.def.id.mk(wgtid,'oplist'), oplist );
  UI.putv( UI.ImageViewer.def.id.mk(wgtid,'savefn'), UI.ImageViewer.views[wgtid].filename.split('.')[0] + sfx  + ".png" );
  UI.ImageViewer.setupctrls( wgtid, sfx );
}
UI.ImageProcessor.pushop = function( wgtid, op ) {
  if (op && UI.ImageProcessor.views[wgtid].processor.ops.length < UI.ImageViewer.views[wgtid].processor.maxops) {
    UI.ImageProcessor.views[wgtid].processor.ops.push( 
                 {opname: op, undoimg: UI.ImageViewer.views[wgtid].cif.getcanvasimagedataobj().getviewdata()} );
    UI.ImageProcessor.showops( wgtid );
  }
}
UI.ImageProcessor.popops = function( wgtid, num ) {
  var ops = UI.ImageProcessor.views[wgtid].processor.ops;
  if (!num || num > (ops.length-1))
    num = ops.length - 1;
  var i, fin = ops.length-num;
  for( i=ops.length-1; i>=fin; i-- )
    ops.pop();
  UI.ImageViewer.views[wgtid].cif.getcanvasimagedataobj().setdata( ops[i].undoimg );
  UI.ImageProcessor.showops( wgtid );
}
UI.ImageProcessor.undo = function( wgtid, num ) {
  if (UI.ImageViewer.views[wgtid].cif && UI.ImageViewer.views[wgtid].processor)
    UI.ImageProcessor.popops( wgtid, num );
}
UI.ImageProcessor.op = function( wgtid, fun, opname, includealpha ) {
  UI.ImageViewer.wait( wgtid, fun, opname, includealpha );
}
UI.ImageProcessor.wait = function( wgtid, actfun, opname, includealpha ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    if (!UI.ImageViewer.testcanvas( wgtid ))
      return;
    var sz = UI.ImageViewer.views[wgtid].cif.getcanvasimageobj().getsize();
    if ((sz.wid*sz.hgt) > UI.ImageProcessor.waitsize)
      UI.ImageViewer.showwait( wgtid, true );
    var fs = "UI.ImageProcessor.process('" + wgtid + "'," + actfun + ",'" + opname + "'," + (includealpha?'true':'false') + ")";
    setTimeout( fs, 50 );
  }
}
UI.ImageProcessor.opcompleted = function( wgtid, opname ) {
  UI.ImageProcessor.pushop( wgtid, opname );
}
UI.ImageProcessor.process = function( wgtid, processor, opname, includealpha ) {
  if (UI.ImageViewer.views[wgtid] && UI.ImageViewer.views[wgtid].cif) {
    var res;
    if (includealpha)
      res = UI.ImageViewer.views[wgtid].cif.getcanvasimagedataobj().processrgba( processor, {'wgtid':wgtid,'opname':opname} );
    else
      res = UI.ImageViewer.views[wgtid].cif.getcanvasimagedataobj().processrgb( processor, {'wgtid':wgtid,'opname':opname} );
    if (res)
      UI.ImageProcessor.opcompleted( wgtid, opname );
  }
}
UI.ImageProcessor.togglecanvasdata = function() {UI.ImageProcessor.forcedisallowcanvasdata = !UI.ImageProcessor.forcedisallowcanvasdata;}
UI.ImageProcessor.canvasdatamsg = 
'Web browser is blocking use of canvas data. \n\n' +
'Some privacy-oriented browsers such as Tor do this by default to prevent an ' + 
'exploit used by surveillance (ad) networks to uniquely identify users. ' + 
'Browser may have a setting that allows canvas data.';
UI.ImageProcessor.testcanvas = function( wgtid ) {
  var ret = CanvasImage.Image.Data.Util.test( UI.ImageProcessor.forcedisallowcanvasdata );
  if (ret == 'nocanvdata')
    alert( UI.ImageProcessor.canvasdatamsg );
  if (ret == 'nocanv')
    alert( "Browser lacks support for canvas" );
  return !ret;
}
var IPUI = UI.ImageProcessor;
