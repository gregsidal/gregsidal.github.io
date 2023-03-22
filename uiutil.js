/*
 *  UI Utilities, 2023 Greg Sidal, MIT licence
 *
 *    UI.Manipulator:       Adds pan/pinch-zoom/hold-zoom to elem
 *    UI.manipulation:      Attaches UI.Manipulators to elems
 *    UI.transform.css:     Cumulative matrix tranforms on elem
 *    UI.transform.matrix:  4x4 matrix ops
 *    UI.NCEventEmitter:    Emits non-conflicting hold, multi-drag, click, dblclick events
 *    UI.PointerEventShim:  Low-level pointer events with multi-touch simulation on hover devices
 *    UI.responsive:        Sets css class names on elems to indicate size and position (for responsive tweaks)
 *    UI.class:             Elem class list management helpers
 *    UI.view:              View helpers
 *    UI.util:              Basic helpers
 *
 *  id: either Id string or HTMLElement
 */
var UI = {};


/*
 * UI.Manipulator: pan/pinch-zoom/hold-zoom
 *
 *   ctrl-hold:   alternating zoom in/out
 *   dblclick:    fit-center
 *   drag:        pan
 *   multidrag:   pinch-zoom on multi-pointer devices
 *
 *   start:       var m = new UI.Manipulator( idOrElem[, defs[, idvp]] )
 *   stop:        m.disable()
 *   listen:      m.setstatechangelistener( callback )
 *
 *   idvp:        plain viewport container; default immediate parent (no borders or padding)
 *   callback:    function( elem, states ); states={actualsize, fitted, moved, zoomed}
 *
 * sets/removes css classes defs.css['panning'], defs.css['zooming-in'], and defs.css['zooming-out']
 * defs.scalefactor.dec, defs.scalefactor.inc are the factors used to decrease and increase scale
 * defs.eventemitter.multisim==true: enable multi-touch simulator (see UI.PointerEventShim)
 */
UI.Manipulator = function( id, defs, idvp ) {
  var elem = UI.el( id );
  var vpelem = idvp ? UI.el(idvp) : UI.getparent( elem );
  var emitter = null;
  var zoomdir = false;
  var held = false;
  var panning = 0;
  var states = {};
  var onstatechg = null;
  this.enable = function() {
    var callbacks = {
      click2: function( el, ptr ) {
        /* zoom in or out by factor */
        var sf = zoomdir ? UI.manipulation.getdef(defs).scalefactor.dec
                           : UI.manipulation.getdef(defs).scalefactor.inc;
        UI.transform.css.zoom( el, {x:sf, y:sf}, vppos(ptr.pos) );
        chgstates( ['scaled'] );
      },
      click: function( el, ptr ) {
        if (canhover( ptr.event )) {
          callbacks.click2( el, ptr, true );
          zoomdir = zoomdir ? false : true;
        }
      },
      hold: function( el, ptr, prevholdpos ) {
        if (!ptr.event.ctrlKey) //(!canhover( ptr.event ))
          callbacks.holdend( el, ptr );
        else
          if (samepos( ptr.pos, prevholdpos )) {
            held = true;
            UI.manipulation.remclass( el, 'panning', defs );
            UI.manipulation.addclass( el, zoomdir ? 'zooming-out' : 'zooming-in', defs );
            callbacks.click2( el, ptr );
          }
      },
      holdend: function( el, ptr ) {
        if (held) {
          UI.manipulation.remclass( el, 'zooming-in', defs );
          UI.manipulation.remclass( el, 'zooming-out', defs );
          zoomdir = zoomdir ? false : true;
          held = false;
        }
      },
      dblclick: function( el, ptr ) {
        fit();
        zoomdir = false;
      },
      drag: function( el, ptrs, i ) {
        if (ptrs.length == 1) {
          UI.manipulation.addclass( el, 'panning', defs );
          /* pan */
          UI.transform.css.pan( el, vppos(ptrs[i].pos), vppos(ptrs[i].prevpos) );
          chgstates( ['moved'] );
          panning = true;
        }
        else
          if (ptrs.length == 2) {
            UI.manipulation.addclass( el, 'panning', defs );
            UI.manipulation.addclass( el, 'zooming-in', defs );
            UI.manipulation.addclass( el, 'zooming-out', defs );
            /* pinch-zoom */
            var pos = [vppos(ptrs[i].pos), vppos(ptrs[i?0:1].pos)];
            var prevpos = [vppos(ptrs[i].prevpos), vppos(ptrs[i?0:1].prevpos)];
            UI.transform.css.pinchzoom( el, pos, prevpos );
            chgstates( ['moved', 'scaled'] );
          }
      },
      dragend: function( el, ptrs, i ) {
        if (ptrs.length == 1) {
          UI.manipulation.remclass( el, 'panning', defs );
          panning = false;
        }
        else
          if (ptrs.length == 2) {
            UI.manipulation.remclass( el, 'zooming-in', defs );
            UI.manipulation.remclass( el, 'zooming-out', defs );
            if (!panning)
              UI.manipulation.remclass( el, 'panning', defs );
          }
      }
    }
    emitter = new UI.NCEventEmitter( elem, callbacks, UI.manipulation.getdef(defs).eventemitter );
    fit();
    return true;
  }
  this.disable = function() {
    UI.manipulation.remclass( elem, 'panning', defs );
    UI.manipulation.remclass( elem, 'zooming-in', defs );
    UI.manipulation.remclass( elem, 'zooming-out', defs );
    emitter.disable();
    //UI.transform.css.clear( id );
    UI.remstyle( elem, 'transform-origin' );
    UI.remstyle( elem, 'transform' );
    resetstates( [] );
    return true;
  }
  var vppos = function( pos, ev ) {
    var r = vpelem.getBoundingClientRect();
    return {x: pos.x - r.left, y: pos.y - r.top};
  }
  var resz = function() {
    if (!transformed())
      return states.fitted ? fit( true ) : (states.actualsize ? actualsize( true ) : false);
  }
  var fit = function( resize ) {
    if (!states.fitted || resize) {
      UI.view.centerfit( elem, UI.manipulation.getdef(defs).fit );
      resetstates( ['fitted'] );
    }
    return states.fitted;
  }
  var actualsize = function( resize ) {
    if (!states.actualsize || resize) {
      UI.view.center( elem, 1.0/(window.devicePixelRatio?window.devicePixelRatio:1.0) );
      resetstates( ['actualsize'] );
    }
    return states.actualsize;
  }
  var chgstates = function( ns ) {
    states.fitted = false, states.actualsize = false;
    for( var i=0; i<ns.length; i++ )
      states[ns[i]] = true;
    if (onstatechg)
      onstatechg( elem, states );
  }
  var resetstates = function( ns ) {
    states = {};
    chgstates( ns );
  }
  var reportstates = function() {
    if (onstatechg)
      onstatechg( elem, states );
  }
  var transformed = function() {return states.scaled || states.moved;}
  var canhover = function( ev ) {
    if (ev.ctrlKey && UI.manipulation.getdef(defs).eventemitter.multisim)
      return UI.devicecanhover();
    return ev.ctrlKey || UI.devicecanhover();
  }
  var samepos = function( pos1, pos2 ) {return UI.transform.algebra.samepos( pos1, pos2 );}
  this.init = function() {return reset( true );}
  this.getelem = function() {return elem;}
  this.changed = function() {return transformed();}
  this.getstates = function() {return states;}
  this.setstatechangelistener = function( listener ) {onstatechg = listener; reportstates();};
  this.resize = function() {resz();}
  this.reset = function( vw ) {
    vw == 'fit' ? fit() : (vw == 'actualsize' ? actualsize() : resz());
  }
  this.enable();
}


/*
 * UI.manipulation: controller for Manipulators
 *
 *   create: UI.Manipulator = UI.manipulator.create( idOrElem )
 *   delete: UI.manipulator.delete( idOrElem )
 */
UI.manipulation = {
  defaultdefs: {
    css: {
      'panning':     'manip-panning',
      'zooming-in':  'manip-zooming-in',
      'zooming-out': 'manip-zooming-out'
    },
    scalefactor: {
      dec: 0.85,
      inc: 1.15
    },
    fit: {
      portrait: {position: 'top', tweak: {high: 0.0, medhigh: 0.03, short: 0.06, dwarf: 0.10}},
      landscape: {position: 'center'}
    },
    eventemitter: {multisim: false}
  },
  getdef: function( d ) {
    var defs = d ? d : UI.manipulation.defaultdefs;
    defs.css = defs.css ? defs.css : UI.manipulation.defaultdefs.css;
    defs.scalefactor = defs.scalefactor ? defs.scalefactor : UI.manipulation.defaultdefs.scalefactor;
    defs.fit = defs.fit ? defs.fit : UI.manipulation.defaultdefs.fit;
    defs.eventemitter = defs.eventemitter ? defs.eventemitter : UI.manipulation.defaultdefs.eventemitter;
    return defs;
  },
  addclass: function( id, n, defs ) {UI.addclass( id, UI.manipulation.getdef(defs).css[n] );},
  remclass: function( id, n, defs ) {UI.remclass( id, UI.manipulation.getdef(defs).css[n] );},
  elems: [],
  find: function( id ) {
    return UI.manipulation.elems.findIndex( function(m) {return m.getelem() == UI.el(id);} );
  },
  getmanipulator: function( id ) {
    var i = UI.manipulation.find( id );
    return (i<0) ? null : UI.manipulation.elems[i];
  },
  create: function( id, defs ) {
    var m = UI.manipulation.getmanipulator( id );
    if (!m) {
      m = new UI.Manipulator( id, defs );
      UI.manipulation.elems.push( m );
    }
    return m;
  },
  delete: function( id ) {
    var m = UI.manipulation.getmanipulator( id );
    if (m) {
      m.disable();
      UI.manipulation.elems.splice( UI.manipulation.find(id), 1 );
    }
    return m;
  }
}


/*
 * UI.transform.css: cumulative css transforms on elem
 *   UI.transform.css.pandelta( id, delta )         cumulative pan
 *   UI.transform.css.pan( id, topt, frompt )       cumulative pan
 *   UI.transform.css.panto( id, pos )              non-cumulative pan
 *   UI.transform.css.zoom( id, scale, origin )     cumulative zoom
 *   UI.transform.css.zoomnew( id, scale, origin )  non-cumulative zoom
 *   UI.transform.css.panzoom( id, scale, origin, delta )
 *     pan and zoom; cumulative
 *   UI.transform.css.pinchzoom( id, pts, prevpts )
 *     do a "pinchzoom" by introspecting changes between two pts; cumulative
 *
 * UI.transform.matrix: 4x4 matrix ops
 * UI.transform.algebra: helper math
 *
 * matrices always 4x4; params either 3D or 2D, eg. {delta.x, delta.y[, delta.z]}
 */
UI.transform = { 
  matrix: {
    identity: [ [ 1,    0,    0,    0    ], 
                [ 0,    1,    0,    0    ], 
                [ 0,    0,    1,    0    ], 
                [ 0,    0,    0,    1    ] ],
    /*
    translate:[ [ 1,    0,    0,    'Tx' ], 
                [ 0,    1,    0,    'Ty' ], 
                [ 0,    0,    1,    'Tz' ], 
                [ 0,    0,    0,    1    ] ],

    scale:    [ [ 'Sx', 0,    0,    0    ], 
                [ 0,    'Sy', 0,    0    ], 
                [ 0,    0,    'Sz', 0    ], 
                [ 0,    0,    0,    1    ] ],
    */
    mkidentity: function() {
      return UI.transform.matrix.copy( UI.transform.matrix.identity );
    },
    mktranslate: function( offset ) {
      offset = UI.transform.matrix.defaultparam( offset, 0 );
      var m = Util.copy( UI.transform.matrix.identity );
      m[0][3] = offset.x;
      m[1][3] = offset.y;
      m[2][3] = offset.z;
      return m;
    },
    mkscale: function( scale ) {
      scale = UI.transform.matrix.defaultparam( scale, 1 );
      var m = Util.copy( UI.transform.matrix.identity );
      m[0][0] = scale.x;
      m[1][1] = scale.y;
      m[2][2] = scale.z;
      return m;
    },
    multiply: function( m1, m2 ) {
      var res = [];
      for( var i=0; i<m1.length; i++ ) {
        res[i] = [];
        for( var j=0; j<m2[0].length; j++ ) {
          var sum = 0;
          for( var k=0; k<m1[0].length; k++ )
            sum += m1[i][k] * m2[k][j];
          res[i][j] = sum;
        }
      }
      return res;
    },
    copy: function( m ) {
      return UI.transform.matrix.multiply( UI.transform.matrix.identity, m );
    },
    defaultparam: function( pin, def ) {
      pin = pin ? pin : {};
      var p = {};
      p.x = pin.x == undefined ? def : pin.x;
      p.y = pin.y == undefined ? def : pin.y;
      p.z = pin.z == undefined ? def : pin.z;
      return p;
    },
    translate: function( offset, m ) {
      m = m ? m : UI.transform.matrix.mkidentity();
      return UI.transform.matrix.multiply( UI.transform.matrix.mktranslate(offset), m );
    },
    scale: function( scale, origin, m ) {
      origin = UI.transform.matrix.defaultparam( origin, 0 );
      m = UI.transform.matrix.translate( {x:-origin.x, y:-origin.y, z:-origin.z}, m );
      m = UI.transform.matrix.multiply( UI.transform.matrix.mkscale(scale), m );
      return UI.transform.matrix.translate( {x:origin.x, y:origin.y, z:origin.z}, m );
    }
  },
  css: {
    fromstr: function( ts ) {
      var m = UI.transform.matrix.mkidentity();
      if (!ts)
        return m;
      ts = ts.split( 'matrix(' );
      if (ts.length != 2)
        ts = ts[0].split( 'matrix3d(' );
      if (ts.length != 2)
        return m;
      ts = ts[1].split( ')' );
      if (ts.length != 2)
        return m;
      var toks = ts[0].split( ',' );
      if (toks.length == 16) {
        /*
        [ [ a,    e,    i,    m ], 
          [ b,    f,    j,    n ], 
          [ c,    g,    k,    o  ], 
          [ d,    h,    l,    p  ] ]
        */
        for( var i=0; i<4; i++ )
          for( var j=0; j<4; j++ )
            m[j][i] = parseFloat( toks[i*j] );
      }
      else
        if (toks.length == 6) {
          /*
          [ [ a,    c,    0,    e ], 
            [ b,    d,    0,    f ], 
            [ 0,    0,    1,    0  ], 
            [ 0,    0,    0,    1  ] ] 
          */
          m[0][0] = parseFloat( toks[0] );
          m[0][1] = parseFloat( toks[2] );
          m[0][3] = parseFloat( toks[4] );
          m[1][0] = parseFloat( toks[1] );
          m[1][1] = parseFloat( toks[3] );
          m[1][3] = parseFloat( toks[5] );
        }
      return m;
    },
    tostr: function( m ) {
      m = m ? m : UI.transform.matrix.mkidentity();
      var mstr = "matrix3d(";
      for( var i=0, k=0; i<4; i++ )
        for( var j=0; j<4; j++, k++ )
          mstr += (k ? "," : "") + m[j][i];
      mstr += ")";
      return mstr;
    },
    from: function( id ) {
      var t = UI.style( id, 'transform' );
      return UI.transform.css.fromstr( t );
    },
    to: function( id, m ) {
      UI.setstyle( id, 'transform-origin', "0 0 0" );
      UI.setstyle( id, 'transform', UI.transform.css.tostr(m) );
    },
    pandelta: function( id, delta ) {
      var m = UI.transform.css.from( id );
      m = UI.transform.matrix.translate( delta, m );
      //console.log( "pan MATRIX: " + JSON.stringify(m) );
      UI.transform.css.to( id, m );
    },
    pan: function( id, topt, frompt ) {
      UI.transform.css.pandelta( id, UI.transform.algebra.delta(topt,frompt) );
    },
    panto: function( id, pos ) {
      m = UI.transform.matrix.translate( pos );
      UI.transform.css.to( id, m );
    },
    zoom: function( id, scale, origin ) {
      var m = UI.transform.css.from( id );
      m = UI.transform.matrix.scale( scale, origin, m );
      //console.log( "addzoom MATRIX: " + JSON.stringify(m) );
      UI.transform.css.to( id, m );
    },
    zoomnew: function( id, scale, origin ) {
      var m = UI.transform.matrix.scale( scale );
      m = UI.transform.matrix.translate( origin, m );
      UI.transform.css.to( id, m );
      //console.log( "newzoom MATRIX: " + JSON.stringify(m) );
    },
    panzoom: function( id, scale, origin, delta ) {
      var m = UI.transform.css.from( id );
      m = UI.transform.matrix.translate( delta, m );
      m = UI.transform.matrix.scale( scale, origin, m );
      //console.log( "panzoom MATRIX: " + JSON.stringify(m) );
      UI.transform.css.to( id, m );
    },
    /* do a "pinchzoom" by introspecting changes between two pts */
    pinchzoom: function( id, pts, prevpts ) {
      /* pan by change in midpts */
      var mid = {prev: UI.transform.algebra.midpt( prevpts[1], prevpts[0] ),
                 cur: UI.transform.algebra.midpt( pts[1], pts[0] )};
      var delta = UI.transform.algebra.delta( mid.cur, mid.prev );
      /* scale by change in distance between pts */
      var dist = {prev: UI.transform.algebra.distance( prevpts[1], prevpts[0] ),
                  cur: UI.transform.algebra.distance( pts[1], pts[0] )};
      var scale = dist.prev ? (dist.cur / dist.prev) : 1.0;
      scale = Math.max( Math.min(scale,10), 0.1 );
      //console.log( "PINCHZOOM: dist: " + JSON.stringify(dist) + ",  scale: " + scale );
      UI.transform.css.panzoom( id, {x:scale, y:scale}, mid.prev, delta );
    },
    clear: function( id ) {
      UI.transform.css.to( id );
    }
  },
  algebra: {
    distance: function( pt1, pt0 ) {
      return Math.hypot( pt1.x - pt0.x, pt1.y - pt0.y );
    },
    midpt: function( pt1, pt0 ) {
      return {x: (pt0.x + pt1.x) / 2, y: (pt0.y + pt1.y) / 2};
    },
    delta: function( pt1, pt0 ) {
      return {x: pt1.x - pt0.x, y: pt1.y - pt0.y};
    },
    samepos: function( pos1, pos2 ) {
      var delta = UI.transform.algebra.delta( pos1, pos2 );
      return (delta.x == 0 && delta.y == 0);
    }
  }
};


/*
 * UI.NCEventEmitter
 *
 * Emits non-conflicting click, drag, multidrag, dblclick, hold events for elem
 *
 *   start:    var ee = new UI.NCEventEmitter( elemOrID, callbacks[, defs] )
 *   stop:     ee.disable()
 *
 *   callbacks.dblclick:    two clicks in same place within defs.dblclick.delay
 *   callbacks.click:       down+up in same place (fires after defs.dblclick.delay)
 *   callbacks.holdstart:   hold in same place for defs.hold.duration.start
 *   callbacks.hold:        during hold, fires every defs.hold.duration.strobe
 *   callbacks.holdend:     hold released
 *   callbacks.drag:        pointer(s) moving
 *   callbacks.dragend:     drag ended (at least one pointer released)
 *
 * UI.Manipulator implements pan, hold-zoom, pinch-zoom
 */
UI.NCEventEmitter = function( id, _callbacks, _defs ) {
  var callbacks = _callbacks;
  var initcb = function( fn ) {callbacks[fn] = callbacks[fn] ? callbacks[fn] : function(){}};
  initcb( 'click' ), initcb( 'keyclick' ), initcb( 'dblclick' ), initcb( 'keydblclick' );
  initcb( 'holding' ), initcb( 'keyholding' ), initcb( 'holdend' );
  initcb( 'drag' ), initcb( 'dragend' ), initcb( 'keydrag' ), initcb( 'multidrag' ), initcb( 'keymultidrag' );
  var defs = _defs ? _defs : {};
  defs.dblclick = defs.dblclick ? defs.dblclick : {delay: 250};
  defs.hold = defs.hold ? defs.hold : {duration: {start: 500, strobe: 500}};
  defs.multisim = defs.multisim ? true : false;
  var lastclick = null;
  var hold = null;
  var el = UI.el( id );
  var handlers = {
    ptrdown: function( el, ptrs, i ) {
      ptrs[i].event.preventDefault();
      handlers.clearhold();
      if (ptrs.length == 1)
        handlers.starthold( ptrs[i] );
    },
    ptrmove: function( el, ptrs, i ) {
      ptrs[i].event.preventDefault();
      handlers.clearpendingclick();
      if (!handlers.held())
        handlers.clearhold();
      callbacks.drag( el, ptrs, i );
    },
    ptrup: function( el, ptrs, i ) {
      ptrs[i].event.preventDefault();
      var held = handlers.clearhold();
      if (ptrs.length == 1) {
        if (!ptrs[i].moved)
          handlers.processclick( el, ptrs[i], held );
      }
      if (ptrs[i].moved)
        callbacks.dragend( el, ptrs, i );
    },
    startpendingclick: function( el, ptr ) {
      lastclick = {'ptr': ptr, time: (new Date()).getTime()};
      setTimeout( handlers.click, defs.dblclick.delay );
    },
    clearpendingclick: function() {
      if (lastclick)
        clearTimeout( handlers.click );
      lastclick = null;
    },
    processclick: function( el, ptr, held ) {
      if (lastclick) {
        if (!elapsed( lastclick.time, defs.dblclick.delay )) {
          callbacks.dblclick( el, ptr );
          handlers.clearpendingclick();
        }
      }
      else
        if (!held)
          handlers.startpendingclick( el, ptr );
    },
    click: function() {
      if (lastclick) {
        var ptr = lastclick.ptr;
        handlers.clearpendingclick();
        callbacks.click( el, ptr );
      }
    },
    starthold: function( ptr ) {
      hold = {'ptr': ptr, held: 0, prevpos: {x: ptr.pos.x, y: ptr.pos.y}};
      setTimeout( handlers.hold, defs.hold.duration.start );
    },
    hold: function() {
      if (hold) {
        setTimeout( handlers.hold, defs.hold.duration.strobe );
        callbacks.hold( el, hold.ptr, hold.prevpos, hold.held );
        hold.prevpos = {x: hold.ptr.pos.x, y: hold.ptr.pos.y};
        //console.log( "HOLD "+ JSON.stringify(hold) );
        hold.held++;
      }
    },
    held: function() {
      return (hold && hold.held) ? hold.held : 0;
    },
    clearhold: function() {
      clearTimeout( handlers.hold );
      var held = handlers.held();
      if (hold) {
        var ptr = hold.ptr;
        hold = null;
        if (held)
          callbacks.holdend( el, ptr, held );
      }
      return held;
    }
  };
  var pes = new UI.PointerEventShim( el, handlers, {multisim: defs.multisim} );
  this.enable = function() {
    pes.enable();
  };
  this.disable = function() {
    clearTimeout( handlers.hold );
    clearTimeout( handlers.click );
    pes.disable();
  };
  var elapsed = function( time, delay ) {
    var deadtime = time + delay;
    var curtime = (new Date()).getTime();
    return curtime >= deadtime;
  };
};


/*
 * UI.PointerEventShim: wrapper for pointers API with multi-touch simulation on hover devices
 *
 *   start:    var pes = new UI.PointerEventShim( elemOrID, callbacks[, opts] )
 *   stop:     pes.disable()
 *
 *   callbacks.ptrdown: function( elem, pointers, evpointerindex )
 *   callbacks.ptrmove: function( elem, pointers, evpointerindex )
 *   callbacks.ptrup:   function( elem, pointers, evpointerindex )
 *
 *   pointers: active pointers with start, previous, and current positions for each
 *   evpointerindex: pointer that caused event to emit
 *   pointers[evpointerindex].event: event struct from browser
 *
 * move events are drags (hover events do not emit)
 * out, leave, and cancel events emit ptrup event; one ptrup will fire for each ptrdown
 * (See UI.Manipulator for implementations of pan, pinch-zoom, hold-zoom)
 *
 * Multi-touch simulation (opts.multisim defined):
 *
 *   Works when using desktop browser's mobile emulator in devtools (Chrome)
 *   Ctrl-click is treated as if "finger" remains on surface (ptrup event suppressed)
 *   Subsequent drags fire events with multiple pointers
 *   Alt-click releases the last saved point; treated as if that "finger" is lifted off surface
 *   Alt-click also emits the suppressed ptrup (w cached Event struct from actual ptrup)
 */
UI.PointerEventShim = function( id, _callbacks, opts ) {
  var initcb = function( fn ) {callbacks[fn] = callbacks[fn] ? callbacks[fn] : function(){}};
  var callbacks = _callbacks; initcb( 'ptrdown' ), initcb( 'ptrmove' ), initcb( 'ptrup' );
  opts = opts ? opts : {};
  var activeptrs = [];
  var el = UI.el( id );
  var handlers = {
    ptrdown: function( ev ) {
      var i = findactiveptr( ev.pointerId );
      if (i >= 0)
        return;
      var pos = evpos( ev );
      activeptrs.push( {ptrid:    ev.pointerId ? ev.pointerId : 1,
                        event:    ev, 
                        'pos':    pos, 
                        startpos: pos, 
                        prevpos:  pos} );
      var i = activeptrs.length-1;
      debugptr( 'PtrDOWN', i );
      return callbacks.ptrdown( el, activeptrs, i );
    },
    ptrmove: function( ev ) {
      var i = findactiveptr( ev.pointerId );
      if (i < 0)
        return;
      for( var j=0; j<activeptrs.length; j++ )
        activeptrs[j].prevpos = activeptrs[j].pos;
      activeptrs[i].pos = evpos( ev );
      activeptrs[i].moved = true;
      activeptrs[i].event = ev;
      return callbacks.ptrmove( el, activeptrs, i );
    },
    ptrup: function( ev ) {
      i = findactiveptr( ev.pointerId );
      if (i < 0)
        return;
      if (opts.multisim && initsim != sim())
        return alert( "PointerEventShim simulation mode changed - reload required" );
      /* (position should only change during move, so this code probably not needed) */
      for( var j=0; j<activeptrs.length; j++ )
        activeptrs[j].prevpos = activeptrs[j].pos;
      activeptrs[i].pos = evpos( ev );
      /* */
      activeptrs[i].event = ev;
      debugptr( 'PtrUP', i );
      var ret = callbacks.ptrup( el, activeptrs, i );
      activeptrs.splice( i, 1 );
      return ret;
    },
    ptrdownsim: function( ev ) {
      if (ev.altKey)
        return;
      return handlers.ptrdown( ev );
    },
    ptrmovesim: function( ev ) {
      if (ev.altKey)
        return;
      return handlers.ptrmove( ev );
    },
    ptrupsim: function(ev ) {
      if (ev.altKey) {
        for( var i=activeptrs.length-1; i>=0 && !activeptrs[i].sim; i-- );
        if (i < 0)
          return;
        ev = activeptrs[i].sim.ptrupevent;
      }
      else
        if (ev.ctrlKey) {
          var i = findactiveptr( ev.pointerId );
          if (i < 0)
            return;
          activeptrs[i].sim = {ptrupevent: ev};
          return;
        }
      return handlers.ptrup( ev );
    },
    toptrup: function( thisev, consolemsg ) {
      //console.log( consolemsg + thisev.pointerId );
      if (!initsim)
        return handlers.ptrup( thisev );
    },
    ptrout: function( thisev ) {
      return handlers.toptrup( thisev, "event pointerout Id=" );
    },
    ptrleave: function( thisev ) {
      return handlers.toptrup( thisev, "event pointerleave Id=" );
    },
    ptrcancel: function( thisev ) {
      return handlers.toptrup( thisev, "event pointercancel Id=" );
    }
  };
  this.enable = function() {
    if (UI.util.haspointers( el )) {
      el.addEventListener( 'pointerdown', initsim ? handlers.ptrdownsim : handlers.ptrdown );
      el.addEventListener( 'pointermove', initsim ? handlers.ptrmovesim : handlers.ptrmove );
      el.addEventListener( 'pointerup', initsim ? handlers.ptrupsim : handlers.ptrup );
      el.addEventListener( 'pointerout', handlers.ptrout );
      el.addEventListener( 'pointercancel', handlers.ptrcancel );
      el.addEventListener( 'pointerleave', handlers.ptrleave );
    }
    else {
      el.addEventListener( 'mousedown', handlers.ptrdown );
      el.addEventListener( 'mousemove', handlers.ptrmove );
      el.addEventListener( 'mouseup', handlers.ptrup );
      el.addEventListener( 'mouseout', handlers.ptrup );
      el.addEventListener( 'mousecancel', handlers.ptrup );
      el.addEventListener( 'mouseleave', handlers.ptrup );
    }
  };
  this.disable = function() {
    if (UI.util.haspointers( el )) {
      el.removeEventListener( 'pointerdown', initsim ? handlers.ptrdownsim : handlers.ptrdown );
      el.removeEventListener( 'pointermove', initsim ? handlers.ptrmovesim : handlers.ptrmove );
      el.removeEventListener( 'pointerup', initsim ? handlers.ptrupsim : handlers.ptrup );
      el.removeEventListener( 'pointerout', handlers.ptrout );
      el.removeEventListener( 'pointercancel', handlers.ptrcancel );
      el.removeEventListener( 'pointerleave', handlers.ptrleave );
    }
    else {
      el.addEventListener( 'mousedown', handlers.ptrdown );
      el.addEventListener( 'mousemove', handlers.ptrmove );
      el.addEventListener( 'mouseup', handlers.ptrup );
      el.addEventListener( 'mouseout', handlers.ptrup );
      el.addEventListener( 'mousecancel', handlers.ptrup );
      el.addEventListener( 'mouseleave', handlers.ptrup );
    }
  }
  var evpos = function( ev ) {return {x: ev.clientX, y: ev.clientY};}
  var findactiveptr = function( ptrid ) {
    ptrid = ptrid ? ptrid : 1;
    return activeptrs.findIndex( function(p) {return p.ptrid == ptrid;} );
  }
  var debugptr = function( act, i ) {
    if (opts.multisim)
      console.log( act + ": " + activeptrs.length + " pointers, " + 
                            "(current: index=" + i + ", id=" + activeptrs[i].ptrid + ")" );
    //console.log( "pointers array: " + JSON.stringify(activeptrs) );
  };
  var sim = function() {return (opts.multisim && !UI.devicecanhover());};
  var initsim = sim();
  this.enable();
};


/*
 * UI.responsive: sets css names for responsive tweaking; also panning/zooming using UI.manipulation
 *
 * Css classes using the names can be defined to adjust size/position, change cursors, etc.
 *
 * setresizeview( id[, idcontainer] ): default
 * setmanipview( id[, idcontainer] ):  attach UI.Manipulator
 * resize( [id[, idcontainer]] ):      changes class names to reflect new size (called from body.onresize)
 * init( [id[, idcontainer]] ):        initializes; looks for 'manip' or 'resize' (default) in class list
 *
 * init(), resize(): all elems with 'responsive' in class list targeted
 * idcontainer: default immediate parent
 */
UI.responsive = {
  defs: {
    css: {
      responsive:  'responsive',       //elem targeted during init, resize
      /* modes */
      manip:       'resp-manip',       //elem will have UI.Manipulator attached
      resize:      'resp-resize',      //default (typically css will fit/center)
      /* sizing indicators */
      small:       'resp-small',       //both wid/hgt too small for container
      tall:        'resp-tall',        //too tall
      wide:        'resp-wide',        //too wide
      aspecttall:  'resp-aspecttall',  //too tall if fitted to wid
      aspectwide:  'resp-aspectwide',  //too wide if fitted to hgt
      high:        'resp-high',        //high in container
      medhigh:     'resp-medhigh',     //med high in container
      short:       'resp-short',       //short in container
      dwarf:       'resp-dwarf'        //very short in container
    },
    szmodes: ['small', 'tall', 'wide', 'aspectwide', 'aspecttall','high','medhigh','short','dwarf']
  },
  getresponsiveelems: function() {return document.getElementsByClassName( UI.responsive.mode2class('responsive') );},
  processelems: function( processor ) {return UI.processelems( UI.responsive.mode2class('responsive'), processor );},
  ismanipview: function( id ) {return UI.responsive.hasmode( id, 'manip' );},
  isresizeview: function( id ) {return UI.responsive.hasmode( id, 'resize' );},
  mode2class: function( mode ) {
    if (!mode || !UI.responsive.defs.css[mode])
      throw( "Responsive error: mode [" + mode + "] not found" );
    return UI.responsive.defs.css[mode];
  },
  hasmode: function( id, mode ) {
    return UI.hasclass( id, UI.responsive.mode2class(mode) );
  },
  remmode: function( id, idcontainer, mode ) {
    UI.remclass( id, UI.responsive.mode2class(mode) );
    UI.remclass( UI.getcontainer(id,idcontainer), UI.responsive.mode2class(mode) );
  },
  addmode: function( id, idcontainer, mode ) {
    UI.addclass( id, UI.responsive.mode2class(mode) );
    UI.addclass( UI.getcontainer(id,idcontainer), UI.responsive.mode2class(mode) );
  },
  replacemodes: function( id, idcontainer, modes1, modes2 ) {
    var i;
    for( i=0; i<modes1.length; i++ )
      UI.responsive.remmode( id, idcontainer, modes1[i] );
    for( i=0; i<modes2.length; i++ )
      UI.responsive.addmode( id, idcontainer, modes2[i] );
  },
  setmanipview: function( id, idcontainer ) {
    if (UI.responsive.hasmode( id, 'manip' ))
      UI.manipulation.delete( id );
    UI.responsive.replacemodes( id, idcontainer, ['resize'], ['manip'] );
    return UI.manipulation.create( id );
  },
  setresizeview: function( id, idcontainer ) {
    if (!UI.responsive.hasmode( id, 'resize' )) {
      UI.responsive.replacemodes( id, idcontainer, ['manip'], ['resize'] );
      return UI.manipulation.delete( id );
    }
  },
  resize: function( id, idcontainer, init ) {
    function set( e, cont ) {
      UI.responsive.setmodes( e, cont );
      if (UI.responsive.hasmode( e, 'manip' )) {
        if (init)
          UI.manipulation.create( id );
        else {
          var m = UI.manipulation.getmanipulator( id );
          if (m)
            m.resize( id, cont );
        }
      }
    }
    if (id)
      set( id, idcontainer );
    else
      UI.responsive.processelems( set );
  },
  init: function( id, idcontainer ) {
    UI.responsive.resize( id, idcontainer, true );
  },
  debugshowdims: function( id ) {
    var e = UI.el( id );
    var dims = {
      'client':  {'wid':e.clientWidth, 'hgt':e.clientHeight},
      'manip':   {'wid':e.scrollWidth, 'hgt':e.scrollHeight},
      'wid,hgt': {'wid':e.width, 'hgt':e.height}
    };
    console.log( "DIMS: " + JSON.stringify(dims) );
  },
  setmodes: function( id, idcontainer ) {
    UI.responsive.replacemodes( id, idcontainer, 
                                UI.responsive.defs.szmodes, UI.responsive.getmodes(id,idcontainer) );
  },
  getmodes: function( id, idcontainer ) {
    return UI.view.characterize( id, UI.getcontainer(id,idcontainer) );
  }
};


/*
 * elem view helpers
 */
UI.view = {
  scroll: function( id, delta, idcontainer ) {
    idcontainer = UI.getcontainer( id, idcontainer );
    var e = UI.el( idcontainer );
    e.scrollLeft -= delta.x;
    e.scrollTop -= delta.y;
  },
  center: function( id, scale, idcontainer ) {
    idcontainer = UI.getcontainer( id, idcontainer );
    var ed = UI.view.evp( id, idcontainer );
    var cd = UI.view.cvp( idcontainer );
    scale = scale ? scale : 1.0;
    var origin = {y: (cd.hgt - (ed.hgt*scale)) / 2, x: (cd.wid - (ed.wid*scale)) / 2};
    UI.transform.css.zoomnew( id, {x:scale, y:scale}, origin );
  },
  centerfit: function( id, adjust, idcontainer ) {
    idcontainer = UI.getcontainer( id, idcontainer );
    var ed = UI.view.evp( id, idcontainer );
    var cd = UI.view.cvp( idcontainer );
    var v = UI.view.characterize( id, idcontainer );
    var scale = 1.0, origin = {x:0, y:0};
    if (v.indexOf( 'small' ) >= 0)
      origin.y = (cd.hgt - ed.hgt) / 2, origin.x = (cd.wid - ed.wid) / 2;
    else
      if (v.indexOf( 'aspectwide' ) >= 0)
        scale = cd.wid / ed.wid, origin.y = (cd.hgt - (ed.hgt * scale)) / 2;
      else
        if (v.indexOf( 'aspecttall' ) >= 0)
          scale = cd.hgt / ed.hgt, origin.x = (cd.wid - (ed.wid * scale)) / 2;
    if (adjust) {
      if (cd.wid <= cd.hgt && adjust.portrait) {
        if (adjust.portrait.position == 'top')
          origin.y = 0;
        if (adjust.portrait.tweak)
          if (v.indexOf( 'high' ) >= 0)
            origin.y += cd.hgt * (adjust.portrait.tweak.high ? adjust.portrait.tweak.high : 0);
          else
            if (v.indexOf( 'medhigh' ) >= 0)
              origin.y += cd.hgt * (adjust.portrait.tweak.medhigh ? adjust.portrait.tweak.medhigh : 0);
            else
              if (v.indexOf( 'short' ) >= 0)
                origin.y += cd.hgt * (adjust.portrait.tweak.short ? adjust.portrait.tweak.short : 0);
              else
                if (v.indexOf( 'dwarf' ) >= 0)
                  origin.y += cd.hgt * (adjust.portrait.tweak.dwarf ? adjust.portrait.tweak.dwarf : 0);

        /*
        if (adjust.portrait.position == 'bottom')
          origin.y = cd.hgt - (ed.hgt * scale);
        if (adjust.portrait.tweak && v.indexOf( 'small' ) >= 0  && ed.hgt < (cd.hgt/3.5))
          origin.y += cd.hgt * adjust.portrait.tweak;
        */
      }
      if (cd.wid > cd.hgt && adjust.landscape) {
        if (adjust.landscape.position == 'left')
          origin.x = 0;
        if (adjust.landscape.position == 'right')
          origin.x = cd.wid - (ed.wid * scale);
      }
    }
    UI.transform.css.zoomnew( id, {x:scale, y:scale}, origin );
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
  characterize: function( id, idcontainer ) {
    idcontainer = UI.getcontainer( id, idcontainer );
    var ed = UI.view.evp( id, idcontainer );
    var cd = UI.view.cvp( idcontainer );
    //console.log( "view: ed:" + JSON.stringify(ed) + ", cd:" + JSON.stringify(cd) );
    var modes = [];
    function addmode( m ) {modes.push( m );}
    function aspect() {
      var asp = {e: ed.wid / ed.hgt, c: cd.wid / cd.hgt};
      if (asp.e < asp.c)
        addmode( 'aspecttall' );
      else
        addmode( 'aspectwide' );
      return asp;
    }
    aspect();
    var eh = ed.hgt;
    if (ed.wid <= cd.wid && ed.hgt <= cd.hgt)
      addmode( 'small' );
    else
      eh = ed.hgt * (cd.wid / ed.wid);
    if (cd.hgt > (eh*3.4))
      addmode( 'dwarf' );
    else
      if (cd.hgt > (eh*2.7))
        addmode( 'short' );
      else
        if (cd.hgt > (eh*2.2))
          addmode( 'medhigh' );
        else
          if (cd.hgt > (eh*1.7))
            addmode( 'high' );
    if (ed.wid > cd.wid)
      addmode( 'wide' );
    if (ed.hgt > cd.hgt)
      addmode( 'tall' );
    return modes;
  }
}


/*
 * elem classlist helpers
 */
UI.class = { 
  has: function( id, cls ) {
    var e = UI.el( id );
    return (e && cls && e.classList.contains( cls ));
  },
  swap: function( id, cls1, cls2 ) {
    var e = UI.el( id );
    if (e)
      if (e.classList.contains( cls1 ))
        UI.replaceclass( id, cls1, cls2 );
      else
        if (e.classList.contains( cls2 ))
          UI.replaceclass( id, cls2, cls1 );
        else
          e.classList.add( cls2 );
  },
  rem: function( id, cls ) {
    var e = UI.el( id );
    if (e && cls)
      if (e.classList.contains( cls ))
        e.classList.remove( cls );
  },
  add: function( id, cls ) {
    var e = UI.el( id );
    if (e && cls)
      if (!e.classList.contains( cls ))
        e.classList.add( cls );
  },
  toggle: function( id, cls, toggle ) {
    if (toggle)
      UI.addclass( id, cls );
    else
      UI.remclass( id, cls );
    return toggle ? false : true;
  },
  replace: function( id, cls1, cls2 ) {
    var e = UI.el( id );
    if (e) {
      UI.remclass( e, cls1 );
      UI.addclass( e, cls2 );
    }
  },
  replaces: function( id, clslistrem, clslistadd ) {
    var i;
    for( i=0; i<clslistrem.length; i++ )
      UI.remclass( id, clslistrem[i] );
    for( i=0; i<clslistadd.length; i++ )
      UI.addclass( id, clslistadd[i] );
  },
  process: function( cls, processor ) {
    var elems = document.getElementsByClassName( cls );
    for( var i=0; i<elems.length; i++ )
      processor( elems[i] );
    return elems.length;
  }
};
/*expose legacy names*/
UI.hasclass = UI.class.has,
UI.swapclass = UI.class.swap,
UI.remclass = UI.class.rem,
UI.addclass = UI.class.add,
UI.replaceclass = UI.class.replace,
UI.replaceclasses = UI.class.replaces,
UI.processelems = UI.class.process;


/*
 * UI basic helpers
 *   'id': string or HTMLElement
 */
UI.util = {
  el: function( id ) {
    var e = null;
    if (id)
      if (id instanceof HTMLElement)
        e = id;
      else
        e = document.getElementById( id );
    return e;
  },
  getparent: function( id ) {
    var e = UI.el( id );
    return (e && e.parentElement) ? e.parentElement : null;
  },
  getcontainer: function( id, idcontainer ) {
    return idcontainer ? idcontainer : UI.getparent( id );
  },
  setstyle: function( id, s, v ) {
    var e = UI.el( id );
    if (e) e.style[s] = v;
  },
  remstyle: function( id, s ) {
    var e = UI.el( id );
    if (e) e.style.removeProperty( s );
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
  show: function( id, show ) {
    UI.setstyle( id, 'display', show?'block':'none' );
  },
  showinline: function( id, show ) {
    UI.setstyle( id, 'display', show?'inline-block':'none' );
  },
  unfold: function( idunfoldbtn, idfoldbtn, idfoldpane, scrollto ) {
    UI.setstyle( idunfoldbtn, 'display', 'none' );
    UI.setstyle( idfoldbtn, 'display', 'inline-block' );
    UI.replaceclass( idfoldpane, 'closed', 'opened' );
    if (scrollto)
      UI.el(idfoldpane).scrollIntoView( {behavior: "smooth"} );
  },
  fold: function( idunfoldbtn, idfoldbtn, idfoldpane ) {
    UI.setstyle( idunfoldbtn, 'display', 'inline-block' );
    UI.setstyle( idfoldbtn, 'display', 'none' );
    UI.replaceclass( idfoldpane, 'opened', 'closed' );
  },
  toggle: function( id1, id2 ) {
    UI.swapclass( id1, 'hidden', 'visible' );
    UI.swapclass( id2, 'visible', 'hidden' );
  },
  togglemenu: function( idmenu, idpane ) {
    UI.swapclass( idmenu, 'disabled', 'enabled' );
    UI.swapclass( idpane, 'visible', 'hidden' );
  },
  toggleall: function( id1, ids2 ) {
    UI.swapclass( id1, 'hidden', 'visible' );
    for( var i=0; i<ids2.length; i++ )
      UI.swapclass( ids2[i], 'visible', 'hidden' );
  },
  devicecanhover: function() {
    return (!window.matchMedia( "(hover: none)" ).matches);
  },
  haspointers: function( el ) {
    return true; //return ('onpointerdown' in el);
  }
};
/*expose legacy names*/
for( const p in UI.util)
  UI[p] = UI.util[p];


/*
 * img helpers
 */
UI.img = {
  drawimgoncanv: function( idcanv, img, x, y ) {
    var ce = UI.el( idcanv );
    ce.width = img.width, ce.height = img.height;
    var cxt = ce.getContext( '2d' );
    cxt.drawImage( img, x?x:0, y?y:0 );
  },
  loadurl: function( url, name, callbacks ) {
    var name = name ? name : ((url.slice(0,5) == 'data:') ? "" : url);
    var img = new Image();
    img.onerror = function() {
      callbacks.onerror( 'ERROR: image '+name+' not found, could not be loaded, or is not valid', name );
    }
    img.onload = function() {
      callbacks.onloaded( img, name );
    }
    try {
      img.src = url;
    }
    catch( e ) {
      callbacks.onloaderror( "ERROR: js error attempting to load img " + name, name );
    }
  },
  loadcanvimg: function( idcanv, url, name, callbacks ) {
    function err( msg, n ) {
      if (callbacks && callbacks.onnotify)
        callbacks.onnotify( idcanv, msg, url, n );
    }
    function setimg( img, n ) {
      UI.drawcanvimg( idcanv, img );
      if (callbacks && callbacks.onloaded)
        callbacks.onloaded( idcanv, img, url, n );
    }
    var _callbacks = {
      onloaded: function( img, n ) {setimg( img, n );},
      onerror: function( msg, n ) {err( msg, n );}
    }
    UI.loadimgurl( url, name, _callbacks );
  }
};


/*
 * utils
 */
var Util = {
  copy: function( data ) {
    var res = JSON.stringify( data );
    return JSON.parse( res );
  }
};
