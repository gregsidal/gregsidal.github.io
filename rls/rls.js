/*
 *  AE Generators ("Random Line Studies"), Greg Sidal 2015-2021, source code MIT Licence
 */


/*
 *  simple rand generator
 */
function drawrandpic( id ) {
  gendrawpic( id ? id : "rand" );
}


/*
 *  no crossings generator
 */
function gennocrossfilter( pic, line, opts ) {
  for( var j=pic.linecount()-1, res; j>=0; j-- ) {
    if (opts.nearness != undefined)
      res = Geo.Poly.overlap( Geo.Line.segtorect(line.pts,line.wid),
                              Geo.Line.segtorect(pic.line(j).pts,pic.line(j).wid), 
                              opts.nearness );
    else
      res = Geo.Line.intersectsegs( pic.line(j).pts, line.pts );
    if (res)
      return;
  }
  return line;
}
function drawnocrosspic( id ) {
  gendrawpic( id ? id : "nocross", gennocrossfilter );
}


/*
 *  truncations generator
 */
var test_mode = false;
function gentruncfilter( pic, line, opts ) {
  if (!pic.debug)
    pic.debug = {abutments:{}};
  var debug = pic.debug;
  function doend( j, dir, pic, line ) {
    var res = Geo.Poly.abut( line.shape, pic.line(j).shape, dir );
    if (res.err) {
      if (test_mode) {
        if (debug.abutments[res.msg] == undefined)
          debug.abutments[res.msg] = 0;
        debug.abutments[res.msg]++;
        pic.setmetadata( 'beta_debug', debug );
        /*
        if (res.msg == 'inside' || res.msg == 'far_inside' || res.msg == 'all_inside') {
          line.shape = res.poly;
          if (!line.debug) line.debug = [];
          line.debug.push( {shape: res.poly, linewid: 15,
                            linecol: 'rgb(0,0,0)', fillcol: 'transparent'} );
          if (res.msg == 'all_inside')
            res.err = null;
        }*/
      }
    }
    if (!res.err)
      line.shape = res.poly;
    return res;
  }
  line.shape = Geo.Line.segtorect( line.pts, line.wid );
  var trunc = [false, false];
  for( var j=pic.linecount()-1, dir, res; j>=0; j-- ) { // truncate to nearest crosses
    dir = Rand.range( 0, 1 );
    res = doend( j, dir, pic, line );
    if (!res.err)
      trunc[dir] = true;
    else
      if (res.err == 'complex') {
        res = doend( j, 1-dir, pic, line );
        if (!res.err)
          trunc[1-dir] = true;
        else
          if (res.err == 'complex')
            return;
      }
  }
  if (trunc[0] != trunc[1])
    if (opts.bothends)
      return;
  return line;
}
function drawtruncpic( id ) {
  gendrawpic( id ? id : "trunc", gentruncfilter );
}


/*
 *  test generator
 */
function gentestfilter( pic, line, opts ) {
  if (!pic.n) pic.n = 0;
  pic.n++; 
  var n = pic.n;
  var crosses = 0;
  line.debug = [];
  if (n == 11) {
    line.pts = Geo.Line.tmpseg( 0, {x:1,y:pic.hgt()/2}, pic.wid()-2 ); // horiz
  }
  if (n == 10) {
    line.pts = Geo.Line.tmpseg( undefined, {x:pic.wid()/2,y:1}, pic.hgt()-2 ); // vert
  }
  for( var j=pic.linecount()-1, pt; j>=0; j-- ) {
    pt = Geo.Line.intersectsegs( pic.line(j).pts, line.pts );
    if (pt)
      line.pts[Rand.range(0,1)] = pt,
      pt = Geo.Line.intersectsegs( pic.line(j).pts, line.pts );
    if (pt) {
      line.shape = Geo.Line.segtorect( line.pts, line.wid );
      line.debug.push( {shape: Geo.Pt.torect(pt,50,50), linewid: 15,
                        linecol: 'rgb(255,0,0)', fillcol: 'transparent'} );
      crosses++;
    }
  }
  if (!pic.linecount() || crosses) return line;
}
function drawtestpic( id ) {
  gendrawpic( id ? id : "test", gentestfilter );
}


/*
 *  generator control
 */
function toggle( idbtn, id ) {
  UI.toggle( idbtn, id );
}
function setupcanv( canvid, w, h ) {
  var canvas = UI.gete( canvid );
  canvas.width = w;
  canvas.height = h;
  return canvas;
}
function loadopts( id ) {
  var opts = { };

  /*2022-10 ADD*/
  opts.title = {main:"Untitled"};
  opts.title.sub = id == 'trunc' ? "from Truncations Generator" : 
                                   (id == 'nocross' ? "from No Crossings Generator" : 
                                                      (id == 'rand' ? "from AE Generator" : ""));
  opts.batch = id == 'trunc' ? 7 : (id == 'nocross' ? 1 : 10);
  /*END 2022-10 ADD*/

  opts.wid = UI.getint( id+"_wid", 100, 100000, 3000 );
  opts.hgt = UI.getint( id+"_hgt", 100, 100000, 2800 );
  opts.line = { count:{}, wid:{}, len:{} };
  opts.line.count.min = UI.getint( id+"_minlines", 1, 100000, 1 );
  opts.line.count.max = UI.getint( id+"_maxlines", opts.line.count.min, 100000, 2000 );
  if (!UI.getv(  id+"_minlines" ))
    opts.line.count.min = opts.line.count.max;
  opts.line.wid.min = UI.getnum( id+"_minlinewid", 0.001, opts.wid, 20 );
  opts.line.wid.max = UI.getnum( id+"_maxlinewid", 0.001, opts.wid, 20 );
  opts.line.len.min = UI.getnum( id+"_minlinelen", 1, opts.wid*2, 0 );
  opts.line.len.max = UI.getnum( id+"_maxlinelen", opts.line.len.min, opts.wid*2, 100000 );
  if (UI.gete( id+"_inview" ))
    opts.outview = !UI.ischk( id+"_inview", true );
  else
    opts.outview = UI.ischk( id+"_outview", false );
  opts.palette = {};
  if (UI.ischk( id+"_mono" ))
    opts.palette.mono = true;
  if (UI.ischk( id+"_gray" ))
    opts.palette.gray = true;
  if (UI.ischk( id+"_col" ))
    opts.palette.allcols = true;
  if (UI.ischk( id+"_coltbl" ))
    opts.palette.maxcols = UI.getint( id+"_maxcols", 1, 10000, 10 );
  if (UI.ischk( id+"_cullnear" ))
    opts.nearness = UI.getnum( id+"_nearness", 0, Geo.Util.min(opts.wid,opts.hgt)/10, 0 );
  if (UI.gete( id+"_bothends" ))
    opts.bothends = UI.ischk( id+"_bothends", false );
  if (!UI.ischk( id+"_margin" ))
    opts.margin = { x:0.001, y:0.001 };
  if (UI.gete( id+"_scale" ))
    opts.scale = UI.getnum( id+"_scale", 0.001, 100000, 1.0 );
  if (UI.gete( id+"_minlineangle" ))
    opts.line.angle = { min: UI.getnum( id+"_minlineangle", -180, 180, -180 ),
                        max: UI.getnum( id+"_maxlineangle", -180, 180, 180 ) };
  return opts;
}
function setup( id ) {
  var opts = loadopts( id );
  opts.canvas = setupcanv( "canv", opts.wid, opts.hgt );
  return opts;
}
function colchk( e ) {
  var id = e.id.split( '_' )[0];
  UI.chk( id+'_mono', e.id==id+'_mono' );
  UI.chk( id+'_gray', e.id==id+'_gray' );
  UI.chk( id+'_col', e.id==id+'_col' );
  UI.chk( id+'_coltbl', e.id==id+'_coltbl' );
  UI.en( id+'_maxcols', e.id==id+'_coltbl' );
}
function nearchk( e ) {
  var id = e.id.split( '_' )[0];
  UI.en( id+'_nearness', UI.ischk(id+'_cullnear') );
}
function genpic( id, opts, genfilter ) {
  function notifycallback( i, count, pic ) {
    if (count < 0) {
      var client = {
        name: 'Random Line Studies',
        function: id
      };

      /*2022-10 ADD*/
      pic.setmetadata( 'title', opts.title );
      
      pic.setmetadata( 'client', client );
      pic.setmetadata( 'time', (new Date()).toString() );
      pic.setmetadata( 'options', loadopts(id) );
      UI.putin( id+"_json", pic.tojson() );
      UI.notify( '', pic.lines().length, pic.lines().length, id, opts.canvas, pic );
    }
    else
      UI.notify( 'generating', i, count, id, opts.canvas, pic );  /*2022-10 EDIT*/
  }
  UI.putin( id+'_json', " " );
  var pic = new RandLinePic( genfilter, notifycallback );
  if (pic)
    return pic.gen( opts.canvas.width, opts.canvas.height, opts, opts.canvas );
}
function gendrawpic( id, genfilter ) {
  genstop();
  var opts = setup( id );
  genpic( id, opts, genfilter );
  //setTimeout( function(){genpic(id,opts,genfilter)}, 1 );
}
function genstop() {
  UI.Processes.stopall();
}


/*
 *  random line generator
 */
function RandLinePic( filtercallback, notifycallback ) {
  this.backgroundcol = [255, 255, 255];
  this.randpt = function( w, h, edgedist ) {
    var mx = edgedist.x, my = edgedist.y;
    return { x:Rand.range(w*mx,w-(w*mx)), y:Rand.range(h*my,h-(h*my)) };
  }
  this.randpts = function( w, h, edgedist ) {
    return [ this.randpt(w,h,edgedist), this.randpt(w,h,edgedist) ];
  }
  this.randcol = function( ) {
    var col;
    do {
      col = [ Rand.range(0,255), Rand.range(0,255), Rand.range(0,255) ];
    }
    while (col[0]>225 && col[1]>225 && col[2]>225);
    return 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
  }
  this.selcol = function( opts, coltbl ) {
    if (opts.palette.mono)
      return 'rgb(0,0,0)';
    if (opts.palette.gray) {
      var c = Rand.range( 0, 255 );
      return 'rgb(' + c + ',' + c + ',' + c + ')';
    }
    if (opts.palette.maxcols) {
      var i = Rand.range( 0, coltbl.length-1 );
      return coltbl[i];
    }
    return this.randcol();
  }
  this.genptsfield = function( w, h, minlen, maxlen, edgedist ) {
    pts = this.randpts( w, h, edgedist );
    var len = Geo.Line.len( pts );
    if (len >= minlen && len <= maxlen)
      return pts;
  }
  this.genptsdist = function( w, h, minlen, maxlen, minangle, maxangle, edgedist ) {
    var M = Geo.Line.angletoM( Rand.range(minangle,maxangle) );
    var len = Rand.range( minlen, maxlen );
    var pt = this.randpt( w, h, edgedist );
    return Geo.Line.frommidpt( M, pt, len );
  }
  this.islinein = function( pts, wid, w, h, edgedist ) {
    var wo = w * edgedist.x, ho = h * edgedist.y;
    return Geo.Pt.allinbox( Geo.Line.segtorect(pts,wid), [{x:wo,y:ho},{x:w-wo,y:h-ho}] );
  }
  this.genpts = function( w, h, opts, linewid ) {
    opts = opts ? opts : {};
    var edgedist = opts.margin;
    if (edgedist == undefined) edgedist = {x:0.0,y:0.0};
    var minlen = UI.clipnum( opts.line.len.min, 1, Geo.Util.max(w,h)*2 );
    var maxlen = UI.clipnum( opts.line.len.max, minlen, Geo.Util.max(w,h)*2 );
    var field = Geo.Util.min( w - (2*edgedist.x), h - (2*edgedist.y) );
    var lendist = (maxlen - minlen) < (field / 5);
    lendist = lendist || ((maxlen - minlen) > field);
    var minangle = UI.clipnum( opts.line.angle.min, -180, 180 );
    var maxangle = UI.clipnum( opts.line.angle.max, -180, 180 );
    lendist = lendist || (minangle != -180 && maxangle != 180);
    var pts;
    for( var i=0; !pts && i<100; i++ ) {
      if (opts.outview || lendist)
        pts = this.genptsdist( w, h, minlen, maxlen, minangle, maxangle, edgedist );
      else
        pts = this.genptsfield( w, h, minlen, maxlen, edgedist );
      if (pts && !opts.outview)
        if (!this.islinein( pts, linewid, w, h, edgedist ))
          pts = null;
    }
    return pts;
  }
  this.genline = function( pic, w, h, opts, cols ) {
    opts = opts ? opts : {};
    var line;
    for( var i=0; !line && i<10; i++ ) {
      line = { wid: Rand.range( opts.line.wid.min, opts.line.wid.max ) };
      line.col = this.selcol( opts, cols );
      line.pts = this.genpts( w, h, opts, line.wid );
      if (line.pts)
        line = this.filtercallback ? this.filtercallback(pic,line,opts) : line;
      else
        line = null;
    }
    return line;
  }
  this.gencoltbl = function( opts ) {
    var cols = [];
    if (opts.palette.maxcols)
      for( var i=0; i<opts.palette.maxcols; i++ )
        cols.push( this.randcol() );
    return cols;
  }
  this.gennextlines = function( pic, w, h, opts, cols, count ) {
    for( var i=0, gen=0, line; i<count; i++ ) {
      line = this.genline( pic, w, h, opts, cols );
      if (line)
        pic.addline( line, true ), gen++;
    }
    return gen;
  }
  this.genlines = function( pic, w, h, opts ) {
    var cols = this.gencoltbl( opts );
    var count = Rand.range( opts.line.count.min?opts.line.count.min:10, 
                            opts.line.count.max?opts.line.count.max:5000 );
    this.genpack = null;
    if (!this.noanim) {
      this.genpack = { 'pic': pic, 'w': w, 'h': h, 'opts': opts, 'cols': cols };
      //this.procid = UI.Processes.start( count, this );
      this.procid = UI.Processes.start( count, this, count<100 ? 150 : (count<300?40:15) );  /*2022-10 EDIT*/
    }
    else
      this.gennextlines( pic, w, h, opts, cols, count );
    return pic;
  }
  this.gen = function( w, h, opts, canv ) {
    var pic = new UI.Pic( w, h );
    if (canv)
      pic.setup( canv );
    this.workpic = pic;
    return this.genlines( pic, w, h, opts );
  }
  this.onnotify = function( i, maxlines ) {
    if (this.genpack && this.notifycallback)
      this.notifycallback( i, maxlines, this.workpic );
  }
  this.onstop = function() {
    if (this.notifycallback && this.workpic)
      this.notifycallback( -1, -1, this.workpic );
  }
  this.onstep = function( i, maxlines ) {
    var gp = this.genpack;
    var batch = gp.opts.batch;  //(maxlines>1000) ? 15 : ((maxlines>100) ? 7 : 2);     //40;  /*2022-10 ADD*/
    for( var j=0, gen; !gen && (j<200) && (i<maxlines); j+=batch, i+=batch )
      gen = this.gennextlines( gp.pic, gp.w, gp.h, gp.opts, gp.cols, 
                               (maxlines-i) > batch ? batch : (maxlines-i) );
    return i;
  }
  this.filtercallback = filtercallback;
  this.notifycallback = notifycallback;
}


/*
 *  random vals
 */
var Rand = {
  r: function( ) {
    var r = 0;
    if (window.crypto && window.crypto.getRandomValues) {
      var array = new Uint32Array( 2 );
      window.crypto.getRandomValues( array );
      array[1] = 0xffffffff;
      r = array[0] / array[1];
    }
    else
      r = Math.random();
    return r;
  },
  range: function( min, max ) {
    var r = Rand.r();
    return min + Math.round( r * (max-min) );
  }
}


/*
 *  geometry
 */
var Geo = {
  Util: {
    epsilon: 0.000001,
    is0: function( d, epsilon ) {
      if (epsilon == undefined) epsilon = Geo.Util.epsilon;
      return (d < epsilon) && (d > -epsilon);
    },
    iseq: function( v1, v2, epsilon ) {
      if (v1 == undefined && v2 == undefined)
        return true;
      if (isNaN( v1 ) && isNaN( v2 ))
        return true;
      if (v1 == Number.POSITIVE_INFINITY && v2 == Number.POSITIVE_INFINITY)
        return true;
      if (v1 == Number.NEGATIVE_INFINITY && v2 == Number.NEGATIVE_INFINITY)
        return true;
      return Geo.Util.is0( v1 - v2, epsilon );
    },
    min: function( v1, v2 ) {
      return v1 < v2 ? v1 : v2;
    },
    max: function( v1, v2 ) {
      return v1 > v2 ? v1 : v2;
    },
    clip: function( v, vmin, vmax ) {
      if (v < vmin) v = vmin;
      if (v > vmax) v = vmax;
      return vmax;
    },
    radtodeg: function( rad ) {
      return rad / (Math.PI / 180);
    },
    degtorad: function( deg ) {
      return deg * Math.PI / 180;
    }
  },
  Pt: {
    iseq: function( p1, p2, epsilon ) {
      return ( Geo.Util.iseq(p1.x,p2.x,epsilon) && Geo.Util.iseq(p1.y,p2.y,epsilon) );
    },
    isinbox: function( p, corners, epsilon ) {
      if (epsilon == undefined) epsilon = Geo.Util.epsilon;
      return (p.x >= (Geo.Util.min( corners[0].x, corners[1].x ) - epsilon)) && 
             (p.x <= (Geo.Util.max( corners[0].x, corners[1].x ) + epsilon)) &&
             (p.y >= (Geo.Util.min( corners[0].y, corners[1].y ) - epsilon)) &&
             (p.y <= (Geo.Util.max( corners[0].y, corners[1].y ) + epsilon));
    },
    allinbox: function( pts, corners, epsilon ) {
      for( var i=0; i<pts.length; i++ )
        if (!Geo.Pt.isinbox( pts[i], corners, epsilon ))
          return false;
      return true;
    },
    offset: function( pt, dx, dy ) {
      return { x: pt.x+dx, y: pt.y+dy };
    },
    offsets: function( pts, dx, dy ) {
      var pts2 = [];
      for( var i=0; i<pts.length; i++ )
        pts2.push( Geo.Pt.offset(pts[i],dx,dy) );
      return pts2;
    },
    has: function( pt, list, epsilon ) {
      for( var i=0; i<list.length; i++ )
        if (Geo.Pt.iseq( list[i], pt, epsilon ))
          return true;
    },
    torect: function( p, wid, hgt ) {
      wid = wid / 2, hgt = hgt / 2;
      return [ {x:p.x-wid, y:p.y-hgt}, {x:p.x+wid, y:p.y-hgt}, 
               {x:p.x+wid, y:p.y+hgt}, {x:p.x-wid, y:p.y+hgt} ];
    }
  },
  Line: {
    dx: function( l ) {
      return l[1].x - l[0].x;
    },
    dy: function( l ) {
      return l[1].y - l[0].y;
    },
    M: function( pts ) {
      if (Geo.Util.iseq( pts[1].x, pts[0].x )) return;
      return (pts[1].y - pts[0].y) / (pts[1].x - pts[0].x);
    },
    B: function( pts ) {
      // y = m(x-Px) + Py
      // yIntercept = -m(Px) + Py
      var m = Geo.Line.M( pts );
      return pts[0].y - (m * pts[0].x);
    },
    angle: function( pts ) {
      // angle = arctan(m)
      return Geo.Util.radtodeg( Math.atan(Geo.Line.M(pts)) );
    },
    angletoM: function( ang ) {
      // m = tan(angle)
      return Math.tan( Geo.Util.degtorad(ang) );
    },
    tmpseg: function( M, pt, d ) {
      // B = -m(Px) + Py
      if (!d) d = 1000;
      if (M == undefined) 
        return [ {x:pt.x,y:pt.y}, {x:pt.x,y:pt.y+d} ];
      var B = pt.y - (M * pt.x);
      return [ {x:pt.x,y:pt.y}, {x:pt.x+d, y:(M*(pt.x+d))+B} ];
    },
    pt2: function( pt1, dx, dy ) {
      return { x: pt1.x + dx, y: pt1.y + dy };
    },
    pt3: function( l, dist ) {
      // P3 = P1 + (newlen/len(L))(P2 - P1)
      var ratio = dist / Geo.Line.len( l );
      return { x: l[0].x + (ratio * Geo.Line.dx(l)), 
               y: l[0].y + (ratio * Geo.Line.dy(l)) };
    },
    frommidpt: function( M, pt, dist ) {
      var l = Geo.Line.tmpseg( M, pt );
      dist = dist / 2;
      return [Geo.Line.pt3(l,dist), Geo.Line.pt3(l,-dist)];
    },
    midpt: function( l ) {
      return Geo.Line.pt3( l, Geo.Line.len(l)/2 );
    },
    len: function( l ) {
      return Math.sqrt( Math.pow(Geo.Line.dx(l),2) + Math.pow(Geo.Line.dy(l),2) );
    },
    isconnected: function( l1, l2 ) {
      return Geo.Pt.has( l1[0], l2 ) || Geo.Pt.has( l1[1], l2 );
    },
    intersect: function( l1, l2 ) {
      var M1 = Geo.Line.M( l1 );
      var M2 = Geo.Line.M( l2 );
      var B1 = Geo.Line.B( l1 );
      var B2 = Geo.Line.B( l2 );
      // y = M(x) + B, x = (y - B) / M
      // M2(x) + B2 = M1(x) + B1
      // (M2 - M1)x = B1 - B2
      // x = (B1 - B2) / (M2 - M1)
      if (Geo.Util.iseq( M2, M1 ))
        return null;
      var pt = {};
      if (M1 == undefined)
        pt.x = l1[0].x, pt.y = (M2 * pt.x) + B2;
      else
        if (M2 == undefined)
          pt.x = l2[0].x, pt.y = (M1 * pt.x) + B1;
        else
          pt.x = (B1 - B2) / (M2 - M1), pt.y = (M1 * pt.x) + B1;
      return pt;
    },
    intersectseg: function( seg, line, epsilon ) {
      var pt = Geo.Line.intersect( seg, line );
      if (pt && Geo.Pt.isinbox( pt, seg, epsilon ))
        return pt;
    },
    intersectsegs: function( l1, l2, epsilon ) {
      var pt = Geo.Line.intersect( l1, l2 );
      if (pt && Geo.Pt.isinbox( pt, l1, epsilon ) && Geo.Pt.isinbox( pt, l2, epsilon ))
        return pt;
    },
    anycross: function( l, crosses, epsilon, noconnections ) {
      for( var i=0, pt; i<crosses.length; i++ )
        if (noconnections || !Geo.Line.isconnected( l, crosses[i] )) {
          pt = Geo.Line.intersectsegs( l, crosses[i], epsilon );
          if (pt) return pt;
        }
    },
    perpendpt: function( l, pt, len ) {
      // M2 = - (1 / M)
      var M = Geo.Line.M( l );
      var M2;
      if (M == undefined)
        M2 = 0;
      else
        if (Geo.Util.is0( M ))
          M2 = undefined;
        else
          M2 = 0 - (1 / M);
      return Geo.Line.pt3( Geo.Line.tmpseg(M2,pt), len );
    },
    nearest: function( l, crosses ) {
      var l2 = [ l[0], l[1] ], termpt, minlen, nearest;
      for( var j=crosses.length-1, len; j>=0; j-- ) {
        termpt = Geo.Line.intersectseg( crosses[j], l2  );
        if (termpt) {
          len = Geo.Line.len( [l2[0], termpt] );
          if (minlen == undefined || len < minlen)
            minlen = len, l2[1] = termpt, nearest = j;
        }
      }
      return nearest;
    },
    segtorect: function( l, wid ) {
      wid = wid / 2;
      return [ Geo.Line.perpendpt( l, l[0], wid ),
               Geo.Line.perpendpt( l, l[0], -wid ),
               Geo.Line.perpendpt( l, l[1], -wid ),
               Geo.Line.perpendpt( l, l[1], wid ) ];
    }
  },
  Poly: {
    iseq: function( p1, p2, epsilon ) { 
      if (p1.length != p2.length) 
        return false;
      function test( p1, p2 ) {
        for( var i=0; i<p1.length; i++ )
          if (!Geo.Pt.iseq( p1[i], p2[i], epsilon ))
            return false;
        return true;
      }
      return test( p1, p2 ) || test( p1, Geo.Poly.flip(p2) );
    },
    area: function( vertices ) { 
      var area = 0;
      for( var i=0; i<vertices.length; i++ ) {
        j = (i + 1) % vertices.length;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
      }
      return area / 2;
    },
    isclockwise: function( vertices ) {
      return Geo.Poly.area( vertices ) < 0;
    },
    flipdir: function( vertices ) {
      var v2 = [];
      for( var i=vertices.length-1; i>=0; i-- )
        v2.push( vertices[i] );
      return v2;
    },
    isptinside: function( vertices, pt, isedgeinside, epsilon ) {
      var sides = Geo.Poly.sides( vertices ), hits = 0, tmp = "";
      var testray = Geo.Line.tmpseg( 0, pt );
      for( var i=0, pt2; i<sides.length; i++ ) {
        pt2 = Geo.Line.intersectseg( sides[i], testray );
        if (pt2) {
          if (Geo.Pt.iseq( pt, pt2, epsilon )) // pt on edge
            return isedgeinside;
          if (pt2.x > pt.x)
            hits++;
        }
      }
      return hits % 2;
    },
    anyptinside: function( vertices, pts, isedgeinside, epsilon ) {
      for( var i=pts.length-1; i>=0; i-- )
        if (Geo.Poly.isptinside( vertices, pts[i], isedgeinside, epsilon ))
          return true;
      return false;
    },
    allptsinside: function( vertices, pts, isedgeinside, epsilon ) {
      for( var i=pts.length-1; i>=0; i-- )
        if (!Geo.Poly.isptinside( vertices, pts[i], isedgeinside, epsilon ))
          return false;
      return true;
    },
    sides: function( vertices ) {
      var sides = [];
      for( var i=1; i<vertices.length; i++ )
        sides.push( [vertices[i-1], vertices[i]] );
      sides.push( [vertices[vertices.length-1], vertices[0]] );
      return sides;
    },
    hascrossover: function( vertices ) { 
      var sides = Geo.Poly.sides( vertices );
      for( var i=0; i<sides.length; i++ )
        if (Geo.Line.anycross( sides[i], sides ))
          return true;
      return false;
    },
    overlap: function( p1, p2, epsilon ) { 
      var sides = Geo.Poly.sides( p1 );
      var sides2 = Geo.Poly.sides( p2 );
      for( var i=0; i<sides.length; i++ )
        if (Geo.Line.anycross( sides[i], sides2, epsilon, true ))
          return true;
      return Geo.Poly.anyptinside( p2, p1, true, epsilon ); // all inside
    },
    // simple abutment truncation of 4 sided p to convex poly p2, complex cases fail
    abut: function( p, p2, dir ) { 
      var crosses = Geo.Poly.sides( p2 );
      var side1 = dir ? [p[2],p[1]] : [p[1],p[2]];
      var side2 = dir ? [p[3],p[0]] : [p[0],p[3]];
      var near1 = Geo.Line.nearest( side1, crosses );
      var near2 = Geo.Line.nearest( side2, crosses );
      if (near1 == undefined && near2 == undefined) // no intersections
        return { err: 'range', msg:'bypassed', poly: p };
      if (near1 == undefined || near2 == undefined)  // one side bypasses target poly
        return { err: 'complex', msg:'corner_ding', poly: p };
      if (near1 != near2)  // each side hits different sides of target poly
        return { err: 'complex', msg:'corner_collide', poly: p };
      var trunc1 = Geo.Line.intersectsegs( side1, crosses[near1] );
      var trunc2 = Geo.Line.intersectsegs( side2, crosses[near1] );
      if (!trunc1 && !trunc2) { // neither side reaches target line
        //if (Geo.Line.anycross( side1, crosses ))
        if (Geo.Poly.anyptinside( p2, p )) {
          if (Geo.Poly.allptsinside( p2, p ))
            return { err: 'complex', msg:'all_inside', poly: p };
          return { err: 'complex', msg:'far_inside', poly: p };
        }
        return { err: 'range', msg:'doesnt_reach', poly: p };
      }
      // extend one or other side to meet target line
      if (!trunc1)
        trunc1 = Geo.Line.intersect( crosses[near1], side1 );
      if (!trunc2)
        trunc2 = Geo.Line.intersect( crosses[near1], side2 );
      p = dir ? [ trunc1, trunc2, p[3], p[2] ] : [ p[0], p[1], trunc1, trunc2 ];
      if (Geo.Poly.hascrossover( p ))
        return { err: 'complex', msg: 'sides_crossed', poly: p };
      if (Geo.Poly.anyptinside( p2, p ))
        return { err: 'complex', msg: 'inside', poly: p };
      return { err: null, poly: p };
    }
  }
}
