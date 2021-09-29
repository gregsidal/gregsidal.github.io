/*
Generates web3.js "dApp" front-end from ABI
Inherits web3.js license

  Web3UI.ABI        Manage ABI
  Web3UI.Gen        Generate code for front-end
  Web3UI.Gen.HTML   Generate HTML for front-end
  Web3UI.Gen.Invoke Generate call/deploy/sign code (invoked when call,sign buttons clicked)
  Web3UI.Interact   Interact with generated dApp (handle click etc. actions)
  Web3UI.Network    Network interactions (query accounts and broadcast transactions)
  Web3UI.Wallet     Simple keypair account wallet

Account wallet HTML element IDs have the form:

  'Web3UI_0account_..., for account tx

Contract wallet HTML element IDs have the form:

  'Web3UI_<methodname>_..., for deploy, method name is '0CONSTRUCTOR'

Input element IDs have the form:

  'Web3UI_<methodname>_<inputname>, inputname reflects struct/array nesting, such as 'myStruct_myArray_0_myDeepArray_7'

*/

var Web3UI = {

  appname: "min-wallet",

  /*** Manage ABI ***/
  ABI: {

    data: {json:null, arrays:{}, values:{}},

    // set ABI data
    set: function( ABI ) {
      Web3UI.ABI.data = {json:JSON.parse(ABI), arrays:{}, values:{}};
    },

    // get ABI data
    get: function() {
      return Web3UI.ABI.data.json;
    },

    // determine if ABI entry is a call
    iscall: function( ABI, i ) {
      if (ABI[i].type && ABI[i].stateMutability)
        if (ABI[i].type.toUpperCase() == 'FUNCTION')
          return (ABI[i].stateMutability.toUpperCase() == 'VIEW' || ABI[i].stateMutability.toUpperCase() == 'PURE');
    },

    // determine if ABI entry is a transaction
    istx: function( ABI, i ) {
      if (ABI[i].type && ABI[i].stateMutability)
        if (ABI[i].type.toUpperCase() == 'FUNCTION')
          return (ABI[i].stateMutability.toUpperCase() == 'PAYABLE' || ABI[i].stateMutability.toUpperCase() == 'NONPAYABLE');
    },

    // determine if ABI entry is an event
    isevent: function( ABI, i ) {
      if (ABI[i].type)
        return ABI[i].type.toUpperCase() == 'EVENT';
    },

    // determine if ABI entry payable
    ispayable: function( ABI, i ) {
      if (ABI[i].type && ABI[i].stateMutability)
        if (ABI[i].type.toUpperCase() == 'FUNCTION')
          return (ABI[i].stateMutability.toUpperCase() == 'PAYABLE') || ABI[i].payable;
    },

    // get name of method
    getname: function( ABI, i ) {
      return Web3UI.ABI.isconstructor( ABI, i ) ? '0CONSTRUCTOR' : ABI[i].name;
    },

    // determine if ABI entry is the constructor
    isconstructor: function( ABI, i ) {
      if (ABI[i].type)
        return (ABI[i].type.toUpperCase() == 'CONSTRUCTOR');
    },

    // get inputs of method
    getinputs: function( ABI, i ) {
      return ABI[i].inputs ? ABI[i].inputs : [];
    },

    // get outputs of method
    getoutputs: function( ABI, i ) {
      return ABI[i].outputs ? ABI[i].outputs : [];
    },

    // save value for input
    saveval: function( methodname, idname, v ) {
      var id = methodname + '_' + idname;
      Web3UI.ABI.data.values[id] = v;
    },

    // get value of input
    getval: function( methodname, idname ) {
      var v = Web3UI.ABI.data.values[methodname+'_'+idname];
      return v ? v : "";
    },

    // make id name for input
    makeidname: function( methodname, parentidname, input, nextnoname ) {
      var inpname = input.name;
      if (!inpname)
        inpname = '0noname' + nextnoname[0], nextnoname[0]++;
      var idname = parentidname ? (parentidname+'_'+inpname) : inpname;
      /*if (!input.name)
        var id = methodname + '_' + idname;
        Web3UI.ABI.data.nonames[id] = inpname;
      }*/
      return idname;
    },

    // get attachment for array input
    getarrinput: function( methodname, input, idname ) {
      var id = methodname + '_' + idname;
      if (Web3UI.ABI.data.arrays[id])
        input = Web3UI.ABI.data.arrays[id].input;
      else {
        input = Web3UI.Utils.copymem( input );
        var elem = Web3UI.Utils.copymem( input );
        elem.type = elem.type.split('[]')[0];
        elem.internalType = elem.internalType ? elem.internalType.split('[]')[0] : elem.type;
        input.components = [];
        Web3UI.ABI.data.arrays[id] = {'input':input, 'element':elem};
      }
      return input;
    },

    // push elem to array input
    addarrelem: function( methodname, idname ) {
      var id = methodname + '_' + idname;
      var input = Web3UI.ABI.getarrinput( methodname, input, idname );
      var elem = Web3UI.Utils.copymem( Web3UI.ABI.data.arrays[id].element );
      var count = input.components.length;
      input.components.push( elem );
      input.components[count].name = '' + count;
      return input;
    },

    // pop elem of array input
    subarrelem: function( methodname, idname ) {
      var id = methodname + '_' + idname;
      var input = Web3UI.ABI.getarrinput( methodname, input, idname );
      if (!input.components.length)
        return input;
      var inputsub = input.components.pop();
      /*var elemnamesub = id + '_' + inputsub.name;
      for( var n in Web3UI.ABI.data.arrays )
        if (n.slice(0,elemnamesub.length) == elemnamesub)
          Web3UI.ABI.data.arrays[n].input.components = [];*/
      return input;
    },

    // clear elems of array input
    clrarrelems: function( methodname, idname ) {
      var id = methodname + '_' + idname;
      var input = Web3UI.ABI.getarrinput( methodname, input, idname );
      input.components = [];
      /*var elemnamesub = id;
      for( var n in Web3UI.ABI.data.arrays )
        if (n.slice(0,elemnamesub.length) == elemnamesub)
          Web3UI.ABI.data.arrays[n].input.components = [];*/
      return input;
    },

    // get dynamic input
    getinput: function( methodname, input, idname ) {
      if (Web3UI.ABI.isarr( input ))
        input = Web3UI.ABI.getarrinput( methodname, input, idname );
      return input;
    },

    // navigate through args tree, return string
    navinputs: function( methodname, inputs, pfxname, pfxidname, callbacks ) {
      var nextnoname = [0];
      function navarg( input, level, parentname, parentidname ) {
        var name = parentname ? parentname+'.'+input.name : input.name;
        idname = Web3UI.ABI.makeidname( methodname, parentidname, input, nextnoname );
        input = Web3UI.ABI.getinput( methodname, input, idname );
        var isarr = Web3UI.ABI.isarr( input );
        var s = "";
        if (isarr)
          s += callbacks.array( input, level, name, idname );
        if (input.components) {
          if (!isarr)
            s += callbacks.struct( input, level, name, idname );
          return s + callbacks.down( input, level, name, idname, isarr ) + 
                 navargs( input.components, isarr?0:level+1, name, idname ) + 
                 callbacks.up( input, level, name, idname, isarr );
        }
        return callbacks.atom( input, level, name, idname );
      }
      function navargs( inputs, level, parentname, parentidname ) {
        var frag = "";
        for( var k=0; k<inputs.length; k++ )
          frag += callbacks.before( inputs, k, level ) + 
                  navarg( inputs[k], level, parentname, parentidname ) + 
                  callbacks.after( inputs, k, level );
        return frag;
      }
      function nullcallback() {
        return '';
      }
      if (!callbacks) callbacks = {};
      if (!callbacks.before) callbacks.before = nullcallback;
      if (!callbacks.after) callbacks.after = nullcallback;
      if (!callbacks.down) callbacks.down = nullcallback;
      if (!callbacks.up) callbacks.up = nullcallback;
      if (!callbacks.array) callbacks.array = nullcallback;
      if (!callbacks.struct) callbacks.struct = nullcallback;
      if (!callbacks.atom) callbacks.atom = nullcallback;
      if (!pfxname) pfxname = '';
      if (!pfxidname) pfxidname = '';
      return navargs( inputs, 0, pfxname, pfxidname );
    },

    // navigate through args tree, return string
    navmethodinputs: function( ABI, i, callbacks ) {
      var methodname = Web3UI.ABI.getname( ABI, i );
      return Web3UI.ABI.navinputs( methodname, Web3UI.ABI.getinputs(ABI,i), callbacks );
    },

    // determine if ABI arg is array
    isarr: function( input ) {
      return (input.type.split('[]').length > 1);
    },

    // determine if ABI arg is a number
    isnum: function( input ) {
      return (input.type.toUpperCase().slice(0,4) == 'UINT') || (input.type.toUpperCase().slice(0,3) == 'INT');
    },

    // get type of input
    gettype: function( input ) {
      if (input.type.toUpperCase().slice(0,8) == 'FUNCTION')
        return '';
      return input.type;
    },

    // get index of methodname
    indexof: function( ABI, methodname ) {
      for( var i=0; i<ABI.length; i++ )
        if (Web3UI.ABI.getname(ABI,i) == methodname)
          return i;
      return -1;
    }

  },

  /*** Generate code from ABI ***/
  Gen: {

    /*** Generate HTML for UI from ABI ***/
    HTML: {

      args: {
        start:   "<span class='control'>",
        end:     "</span>",
        inp:     "<span class='tag'>$INPUTNAME$ ($ARGTYPE$):</span> " + 
                 "<input type='text' id='Web3UI_$METHODNAME$_$ARGIDNAME$' " + 
                        'onchange="Web3UI.Interact.savearg(' + "'$METHODNAME$','$ARGIDNAME$'" + ')" ' + 
                        'oninput="Web3UI.Interact.cleartxmsgs(' + "'$METHODNAME$'" + ')" ' +
                        "value='$VALUE$'/> ",
        inpnum:  "<span class='tag'>$INPUTNAME$ ($ARGTYPE$):</span>" + 
                 "<input type='text' id='Web3UI_$METHODNAME$_$ARGIDNAME$' class='num' " + 
                        'onchange="Web3UI.Interact.savearg(' + "'$METHODNAME$','$ARGIDNAME$'" + ')" ' + 
                        'oninput="Web3UI.Interact.cleartxmsgs(' + "'$METHODNAME$'" + ')" ' +
                        "value='$VALUE$'/> ",
        inparr: '<span class="control array"><span class="tag array">$INPUTNAME$ (array of $ARGTYPE$):</span> ' + 
                '<span class="subbtn" onclick="Web3UI.Gen.HTML.addArrElem(' + "'$METHODNAME$','$ARGNAME$','$ARGIDNAME$')" + '"/> + </span> ' +
                '<span class="subbtn" onclick="Web3UI.Gen.HTML.subArrElem(' + "'$METHODNAME$','$ARGNAME$','$ARGIDNAME$')" + '"/> - </span> ' +
                '<span class="subbtn" onclick="Web3UI.Gen.HTML.clrArrElems(' + "'$METHODNAME$','$ARGNAME$','$ARGIDNAME$')" + '"/> C </span>' +
                "</span>",
        inpstr: '<span class="control struct"><span class="tag">$INPUTNAME$ ($ARGTYPE$):</span></span>',
        inpdn:  "<span id='Web3UI_$METHODNAME$_$ARGIDNAME$_0components' class='nest'>",
        inpup:  "</span>"
      },

      // gen args HTML
      genargs: function( inputs, methodname, pfxname, pfxidname ) {
        function down( input, level, name, idname, isarr ) {
          return Web3UI.Utils.replace( Web3UI.Gen.HTML.args.inpdn, [ 
                    {token:'$METHODNAME$', replacewith:methodname, count:1 },
                    {token:'$ARGIDNAME$', replacewith:idname, count:1 } ] );
        }
        function up( input, level, name, idname, isarr ) {
          return Web3UI.Gen.HTML.args.inpup;
        }
        function before( inputs, index, level ) {
          return (index || level) ? "" : "";
        }
        function after( inputs, index, level ) {
          return '';
        }
        function stru( input, level, name, idname ) {
          var type = input.internalType ? input.internalType : input.type;
          var h = Web3UI.Utils.replace( Web3UI.Gen.HTML.args.inpstr, [ 
                    {token:'$INPUTNAME$', replacewith:input.name, count:1 },
                    {token:'$ARGTYPE$', replacewith:type, count:1 } ] );
          return h;
        }
        function arr( input, level, name, idname ) {
          var id = methodname + '_' + idname;
          var type = input.internalType ? input.internalType : input.type;
          type = type.split('[]')[0];
          var h = Web3UI.Utils.replace( Web3UI.Gen.HTML.args.inparr, [ 
                    {token:'$METHODNAME$', replacewith:methodname, count:3 },
                    {token:'$INPUTNAME$', replacewith:input.name, count:1 },
                    {token:'$ARGNAME$', replacewith:name, count:3 },
                    {token:'$ARGIDNAME$', replacewith:idname, count:3 },
                    {token:'$ARGTYPE$', replacewith:type, count:1 } ] );
          return h;
        }
        function atom( input, level, name, idname ) {
          var argtemplate = Web3UI.Gen.HTML.args.inp;
          if (Web3UI.ABI.isnum( input ))
            argtemplate = Web3UI.Gen.HTML.args.inpnum;
          var type = input.type;
          var val = Web3UI.ABI.getval( methodname, idname );
          var h = Web3UI.Utils.replace( argtemplate, [ 
                    {token:'$METHODNAME$', replacewith:methodname, count:3 },
                    {token:'$INPUTNAME$', replacewith:input.name, count:1 },
                    {token:'$ARGIDNAME$', replacewith:idname, count:2 },
                    {token:'$ARGTYPE$', replacewith:type, count:1 },
                    {token:'$VALUE$', replacewith:val, count:1 } ] );
          //console.log( "-------ATOM HTML--------", h );
          return Web3UI.Gen.HTML.args.start + h + Web3UI.Gen.HTML.args.end;
        }
        return Web3UI.ABI.navinputs( methodname, inputs, pfxname, pfxidname,
                             {'before':before, 'after':after, 'down':down, 'up':up, 'atom':atom, 'array':arr, 'struct':stru} );
      },

      regenArrElems: function( methodname, input, argname, argidname ) {
        Web3UI.Interact.cleartxmsgs( methodname );
        var elemsHTML = Web3UI.Gen.HTML.genargs( input.components, methodname, argname, argidname );
        return Web3UI.Utils.setin( 'Web3UI_'+methodname+'_'+argidname+'_0components', elemsHTML );
      },

      addArrElem: function( methodname, argname, argidname ) {
        var input = Web3UI.ABI.addarrelem( methodname, argidname );
        Web3UI.Gen.HTML.regenArrElems( methodname, input, argname, argidname );
      },

      subArrElem: function( methodname, argname, argidname ) {
        var input = Web3UI.ABI.subarrelem( methodname, argidname );
        Web3UI.Gen.HTML.regenArrElems( methodname, input, argname, argidname );
      },

      clrArrElems: function( methodname, argname, argidname ) {
        var input = Web3UI.ABI.clrarrelems( methodname, argidname );
        Web3UI.Gen.HTML.regenArrElems( methodname, input, argname, argidname );
      },

      // gen args input HTML from ABI entry
      genargsfromABIentry: function( ABI, i ) {
        return Web3UI.Gen.HTML.genargs( Web3UI.ABI.getinputs(ABI,i), Web3UI.ABI.getname(ABI,i) );
      },

      call:     "<p>" +
                "<b>Call $METHODNAME$</b>" +
                "<span class='subsec'>" +
                  "$ARGSHTML$" +
                "</span>" +
                "<span class='subsec'>" +
                  '<button id="Web3UI_$METHODNAME$_0callbtn" class="call" ' + 
                          'onClick="Web3UI.Interact.invoke(' + "'$METHODNAME$'" + ')">Call</button>' +
                  "<i id='Web3UI_$METHODNAME$'></i>" +
                "</span>" +
                "</p>",

      pay:      "<span class='control pay'>" +
                  "<span class='tag'>Ether to send:</span> " + 
                  "<input type='text' value='0.0' id='Web3UI_$METHODNAME$_0pay' class='num' " +
                         'oninput="Web3UI.Interact.cleartxmsgs(' + "'$METHODNAME$'" + ')"/>' +
                "</span>",

      send:     "<p>" +
                "<b>Sign/Send $METHODNAME$ Transaction</b>" +
                "<span class='subsec'>" +
                  "$PAYHTML$" +
                  "$ARGSHTML$" +
                "</span>" +
                "<span class='subsec'>" +
                  '<button id="Web3UI_$METHODNAME$_0signbtn" class="sign" ' + 
                          'onClick="Web3UI.Interact.invoke(' + "'$METHODNAME$'" + ')">Sign</button>' +
                  "<i id='Web3UI_$METHODNAME$'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0cost'></i>" +
                "</span>" +
                "<span class='subsec min'>" +
                  "<button id='Web3UI_$METHODNAME$_0sendbtn' class='send hideifempty' onClick='Web3UI.Interact.sendtx($METHODINDEX$)'></button>" +
                  "<i id='Web3UI_$METHODNAME$_0send'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0fee'></i>" +
                "</span>" +
                "</p>",

      save:     "<p>" +
                "<b>Sign/Save $METHODNAME$ Transaction</b>" +
                "<span class='subsec'>" +
                  "$PAYHTML$" +
                  "$ARGSHTML$" +
                "</span>" +
                "<span class='subsec'>" +
                  '<button id="Web3UI_$METHODNAME$_0signbtn" class="sign" ' + 
                          'onClick="Web3UI.Interact.invoke(' + "'$METHODNAME$'" + ')">Sign</button>' +
                  "<i id='Web3UI_$METHODNAME$'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0cost'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0rawtx' class='code'></i>" +
                "</span>" +
                "<span class='subsec min'>" +
                  "<button id='Web3UI_$METHODNAME$_0rawtxsavebtn' class='send hideifempty' onClick='Web3UI.Interact.savetx($METHODINDEX$)'></button>" +
                  "<a href='' download='' class='dispnone' id='Web3UI_$METHODNAME$_0rawtxsave'></a>" +
                  "<i id='Web3UI_$METHODNAME$_0rawtxsavemsg'></i>" +
                "</span>" +
                "</p>",

      deploy:   "<p>" +
                "<b>Sign/Send Deploy Transaction</b>" + 
                "<span class='subsec'>" +
                  "$PAYHTML$" +
                  "$ARGSHTML$" +
                "</span>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='tag sameline'>Contract bytecode (from compiler):</span> " + 
                    '<button class="open sameline" onclick="Web3UI.Utils.gete(' + "'Web3UI_0contractbytecodefile'" + ').click()">Open</button>' +
                    "<input type='file' class='dispnone' accept='text/*' id='Web3UI_0contractbytecodefile' " + 
                              'onchange="Web3UI.Interact.openbytecode(this.files[0],' + "'$METHODNAME$'" + ');"/>' +
 
                  "</span>" +
                  "<span class='control'>" +
                    "<textarea id='Web3UI_0contractbytecode' value='' " + 
                              'oninput="Web3UI.Interact.cleartxmsgs(' + "'$METHODNAME$'" + ')"></textarea>' +
                  "</span>" +
                "</span>" +
                "<span class='subsec'>" +
                  '<button id="Web3UI_$METHODNAME$_0signbtn" class="sign" ' +
                          'onClick="Web3UI.Interact.invoke(' + "'$METHODNAME$'" + ')">Sign</button>' +
                  "<i id='Web3UI_$METHODNAME$'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0cost'></i>" +
                "</span>" +
                "<span class='subsec min'>" +
                  "<button id='Web3UI_$METHODNAME$_0sendbtn' class='send hideifempty' onClick='Web3UI.Interact.sendtx($METHODINDEX$)'></button>" +
                  "<i id='Web3UI_$METHODNAME$_0send'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0fee'></i>" +
                "</span>" +
                "</p>",

      savedeploy: 
                "<p>" +
                "<b>Sign/Save Deploy Transaction</b>" + 
                "<span class='subsec'>" +
                  "$PAYHTML$" +
                  "$ARGSHTML$" +
                "</span>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='tag sameline'>Contract bytecode (from compiler):</span> " + 
                    '<button class="open sameline" onclick="Web3UI.Utils.gete(' + "'Web3UI_0contractbytecodefile'" + ').click()">Open</button>' +
                    "<input type='file' class='dispnone' accept='text/*' id='Web3UI_0contractbytecodefile' " + 
                              'onchange="Web3UI.Interact.openbytecode(this.files[0],' + "'$METHODNAME$'" + ');"/>' +
                  "</span>" +
                  "<span class='control'>" +
                    "<textarea id='Web3UI_0contractbytecode' value='' " + 
                              'oninput="Web3UI.Interact.cleartxmsgs(' + "'$METHODNAME$'" + ')"></textarea>' +
                  "</span>" +
                "</span>" +
                "<span class='subsec'>" +
                  '<button id="Web3UI_$METHODNAME$_0signbtn" class="sign" ' +
                          'onClick="Web3UI.Interact.invoke(' + "'$METHODNAME$'" + ')">Sign</button>' +
                  "<i id='Web3UI_$METHODNAME$'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0cost'></i>" +
                  "<i id='Web3UI_$METHODNAME$_0rawtx' class='code'></i>" +
                "</span>" +
                "<span class='subsec min'>" +
                  "<button id='Web3UI_$METHODNAME$_0rawtxsavebtn' class='send hideifempty' onClick='Web3UI.Interact.savetx($METHODINDEX$)'></button>" +
                  "<a href='' download='' class='dispnone' id='Web3UI_$METHODNAME$_0rawtxsave'></a>" +
                  "<i id='Web3UI_$METHODNAME$_0rawtxsavemsg'></i>" +
                "</span>" +
                "</p>",

      // gen HTML from ABI entry
      genfromABIentry: function( ABI, i, offline ) {
        var name = Web3UI.ABI.getname( ABI, i );
        if (!name)
          return "";
        if (Web3UI.ABI.isevent( ABI, i ))
          return "";
        var iscall = Web3UI.ABI.iscall( ABI, i );
        var isdeploy = Web3UI.ABI.isconstructor( ABI, i );
        if (!iscall && !isdeploy)
          if (!Web3UI.ABI.istx( ABI, i ))
            return ""; //don't know what the hell this is dammit
        var ispayable = Web3UI.ABI.ispayable( ABI, i );
        var argsHTML = Web3UI.Gen.HTML.genargsfromABIentry( ABI, i );
        var payHTML = ispayable ? Web3UI.Utils.replace(Web3UI.Gen.HTML.pay,[{token:'$METHODNAME$',replacewith:name,count:2}]) : "";
        var calltokens = [ 
          {token:'$METHODNAME$', replacewith:name, count:4 },
          {token:'$ARGSHTML$', replacewith:argsHTML, count:1 }
        ];
        var sendtokens = [ 
          {token:'$METHODNAME$', replacewith:name, count:8 },
          {token:'$PAYHTML$', replacewith:payHTML, count:1 },
          {token:'$METHODINDEX$', replacewith:i, count:1 },
          {token:'$ARGSHTML$', replacewith:argsHTML, count:1 }
        ];
        var deploytokens = [ 
          {token:'$METHODNAME$', replacewith:name, count:9 },
          {token:'$PAYHTML$', replacewith:payHTML, count:1 },
          {token:'$METHODINDEX$', replacewith:i, count:1 },
          {token:'$ARGSHTML$', replacewith:argsHTML, count:1 }
        ];
        var HtML = isdeploy ? Web3UI.Gen.HTML.deploy : (iscall ? Web3UI.Gen.HTML.call : Web3UI.Gen.HTML.send);
        if (!iscall && offline)
          HtML = isdeploy ? Web3UI.Gen.HTML.savedeploy : Web3UI.Gen.HTML.save;
        var tokens = isdeploy ? deploytokens : (iscall ? calltokens : sendtokens);
        return Web3UI.Utils.replace( HtML, tokens );
      },

      // gen dapp from ABI
      genfromABI: function( ABI, includecalls, includetxsends, includedeploy, offline ) {
        var HTML = "";
        for( var i=0; i<ABI.length; i++ ) {
          var H = Web3UI.Gen.HTML.genfromABIentry( ABI, i, offline );
          var isdeploy = Web3UI.ABI.isconstructor( ABI, i );
          var iscall = Web3UI.ABI.iscall( ABI, i );
          if (isdeploy) {
            if (includedeploy)
              HTML += H;
          }
          else {
            if (includecalls && iscall)
              HTML += H;
            if (includetxsends && !iscall)
              HTML += H;
          }
        }
        return HTML;
      },

      callsection: {
        start:  "<p class='appendix'></p><p class='descr'><b>Contract Calls</b> no wallet needed</p>",
        close:  ""
      },
      deploysection: {
        title: "<p class='appendix'></p><p class='descr'><b>Deploy Contract Instance</b> " +
               " <a href='account-wallet.html'>account wallet</a> required to sign and pay fee</p>"
      },
      sendsection: {
        title:  "<p class='appendix'></p><p class='descr'><b>Contract Transactions</b> " + 
               " <a href='account-wallet.html'>account wallet</a> required to sign and pay fee</p>",
        online: "<p class='wallet'>" +
                "<b>Open Wallet</b>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='label'>Wallet password: </span>" +
                    "<input type='text' id='Web3UI_0account_pass' class='net num pass' value='password'/>" +
                  "</span>" +
                "</span>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='tag'>Private key:</span>" +
                    "<input type='text' id='Web3UI_0account_privatekey' class='pk' oninput='Web3UI.Wallet.clr()'/> " +
                    "<span class='btngroup'>" +
                      "<span class='label'>Open from </span>" +
                      '<button class="open sameline" onclick="Web3UI.Utils.gete(' + "'Web3UI_0account_file'" + ').click()">File</button> ' +
                      '<button class="open sameline" onclick="Web3UI.Wallet.open()">Entry</button> ' +
                      '<input type="file" class="dispnone" accept="text/*" id="Web3UI_0account_file" ' +  
                          'onchange="Web3UI.Wallet.openfromfile(this.files[0]);"/>' +
                    "</span>" +
                    "<i id='Web3UI_0account_address'></i>" +
                  "</span>" +
                "</span>" +
                "<span class='subsec sep'>" +
                  "<span class='control'>" +
                    "<span class='tag'>Balance</span>" +
                    "<input type='text' id='Web3UI_0account_balance' value='' size='10' class='num' disabled/> " +
                    "<span class='subbtn' onClick='Web3UI.Wallet.getBalance();'>Refresh</span>" + 
                  "</span>" +
                  "<span class='control'>" +
                    '<span class="tag">Wallet Transaction Count ("Nonce")</span>' +
                    "<input type='text' id='Web3UI_0account_nonce' value='' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/> " +
                    "<span class='subbtn' onClick='Web3UI.Wallet.getNonce();'>Refresh</span>" + 
                  "</span>" +
                  "<span class='control'>" +
                    "<span class='tag'>Gas Price for Transactions</span>" +
                    "<input type='text' id='Web3UI_0account_gasprice' value='' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/> " +
                    '<span class="subbtn" onclick="Web3UI.Network.getGasPrice(' + "'Web3UI_0account'" + ');">Refresh</span>' +
                  "</span>" +
                  "<span class='control'>" +
                    "<span class='tag'>Gas Limit for Transactions</span>" +
                    "<input type='text' id='Web3UI_0account_gas' value='200000' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/>" +
                    "<i id='Web3UI_0account_response'></i>" +
                  "</span>" +
                "</span>" +
                "</p>",
        offline:"<p class='wallet'>" +
                "<b>Open Wallet</b>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='label'>Wallet password: </span>" +
                    "<input type='text' id='Web3UI_0account_pass' class='net num pass' value='password'/>" +
                  "</span>" +
                "</span>" +
                "<span class='subsec'>" +
                  "<span class='control'>" +
                    "<span class='tag'>Private key:</span>" +
                    "<input type='text' id='Web3UI_0account_privatekey' class='pk' oninput='Web3UI.Wallet.clr()'/> " +
                    "<span class='btngroup'>" +
                      "<span class='label'>Open from </span>" +
                      '<button class="open sameline" onclick="Web3UI.Utils.gete(' + "'Web3UI_0account_file'" + ').click()">File</button> ' +
                      '<button class="open sameline" onclick="Web3UI.Wallet.open(true)">Entry</button> ' +
                      '<input type="file" class="dispnone" accept="text/*" id="Web3UI_0account_file" ' +  
                          'onchange="Web3UI.Wallet.openfromfile(this.files[0],true);"/>' +
                    "</span>" +
                    "<i id='Web3UI_0account_address'></i>" +
                  "</span>" +
                "</span>" +
                "<span class='subsec sep'>" +
                  "<span class='control'>" +
                    '<span class="tag">Wallet Transaction Count ("Nonce")</span>' +
                    "<input type='text' id='Web3UI_0account_nonce' value='' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/> " +
                  "</span>" +
                  "<span class='control'>" +
                    "<span class='tag'>Gas Price for Transactions</span>" +
                    "<input type='text' id='Web3UI_0account_gasprice' value='' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/> " +
                  "</span>" +
                  "<span class='control'>" +
                    "<span class='tag'>Gas Limit for Transactions</span>" +
                    "<input type='text' id='Web3UI_0account_gas' value='200000' size='10' class='num' oninput='Web3UI.Wallet.clrwmsg()'/>" +
                  "</span>" +
                  "<i id='Web3UI_0account_response'></i>" +
                "</span>" +
                "</p>",
        close:  ""
      },

      // reset for new contract
      reset: function( offline ) {
        var id = 'Web3UI_0resetmsg';
        Web3UI.ABI.contractaddr = document.getElementById( 'Web3UI_0contractaddress' ).value;
        if (!Web3UI.Network.testAddress( id, Web3UI.ABI.contractaddr ))
          return Web3UI.Utils.showmsg( id, "Invalid contract address" );
        try {
          Web3UI.ABI.set( document.getElementById('Web3UI_0contractABI').value );
          var callHTML = Web3UI.Gen.HTML.genfromABI( Web3UI.ABI.get(), true, false, false, offline );
          var HTML = "";
          if (!offline && callHTML)
            HTML += Web3UI.Gen.HTML.callsection.start + 
                         callHTML + 
                         Web3UI.Gen.HTML.callsection.close;
          var sendHTML = Web3UI.Gen.HTML.genfromABI( Web3UI.ABI.get(), false, true, false, offline );
          if (sendHTML)
            HTML += Web3UI.Gen.HTML.sendsection.title + 
                        (offline ? Web3UI.Gen.HTML.sendsection.offline : Web3UI.Gen.HTML.sendsection.online) + 
                        sendHTML +
                        Web3UI.Gen.HTML.sendsection.close;
          document.getElementById( 'Web3UI_0UIGEN' ).innerHTML = HTML;
        }
        catch( e ) {
          console.log( e );
          return Web3UI.Utils.showmsg( id, "Invalid ABI" );
        }
        if (!Web3UI.Interact.getcontract( id ))
          return;
        //Web3UI.Interact.clearmsgs();
        Web3UI.Utils.showmsg( id, "dApp is ready to use below" );
      },

      // reset for new contract deployment
      noconstructor: {
        "inputs": [],
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      resetdeploy: function( offline ) {
        var id = 'Web3UI_0resetmsg';
        try {
          Web3UI.ABI.set( document.getElementById('Web3UI_0contractABI').value );
          var constr = Web3UI.Gen.HTML.genfromABI( Web3UI.ABI.get(), false, false, true, offline );
          if (!constr) {
            Web3UI.ABI.get().push( Web3UI.Gen.HTML.noconstructor );
            constr = Web3UI.Gen.HTML.genfromABI( Web3UI.ABI.get(), false, false, true, offline );
          }
          var HTML = Web3UI.Gen.HTML.deploysection.title + 
                        (offline ? Web3UI.Gen.HTML.sendsection.offline : Web3UI.Gen.HTML.sendsection.online) + 
                        constr + 
                        Web3UI.Gen.HTML.sendsection.close;
          HTML = HTML.replace( '200000', '999999' );
          document.getElementById( 'Web3UI_0UIGEN' ).innerHTML = HTML;
        }
        catch( e ) {
          console.log( e );
          return Web3UI.Utils.showmsg( id, "Invalid ABI" );
        }
        if (!Web3UI.Interact.getcontract( id, true ))
          return;
        //Web3UI.Interact.clearmsgs();
        Web3UI.Utils.showmsg( id, "Contract is ready to deploy below" );
      },

      abichanged: function() {
        var id = 'Web3UI_0resetmsg';
        Web3UI.Utils.showmsg( id, '' );
      },

      openabi: function( file, isdeploy, offline ) { 
        var id = 'Web3UI_0resetmsg';
        function cb( tx ) {
          Web3UI.Utils.showeditmsg( 'Web3UI_0contractABI', tx );
          Web3UI.Gen.HTML.abichanged();
          if (isdeploy)
            Web3UI.Gen.HTML.resetdeploy( offline );
          else
            Web3UI.Gen.HTML.reset( offline );
        }
        Web3UI.Utils.openjsonfile( id, file, cb, true );
      }

    },

    /*** Generate call/deploy/sign invocations from ABI ***/
    Invoke: {

      argcollect: "Web3UI.Interact.getarg($METHODINDEX$,'$ARGNAME$','$ARGIDNAME$')",

      // gen list of arg collectors for call/sign invocation
      genargs: function( ABI, i, inputs ) {
        function down( input, level, name, idname, isarr ) {
          var a = (level && input.name) ? (input.name+':') : '';
          return a + (isarr ? '[' : '{');
        }
        function up( input, level, name, idname, isarr ) {
          return  isarr ? ']' : '}';
        }
        function before( inputs, index, level ) {
          return index ? ',' : '';
        }
        function after( inputs, index, level ) {
          return '';
        }
        function atom( input, level, name, idname ) {
          var a = (level && input.name) ? (input.name+':') : '';
          a += Web3UI.Utils.replace( Web3UI.Gen.Invoke.argcollect, [ 
                      {token:'$METHODINDEX$', replacewith:i, count:1 },
                      {token:'$ARGNAME$', replacewith:name, count:1 },
                      {token:'$ARGIDNAME$', replacewith:idname, count:1 } ] );
          return a;
        }
        var methodname = Web3UI.ABI.getname( ABI, i );
        var args = Web3UI.ABI.navinputs( methodname, inputs, '', '',
                             {'before':before, 'after':after, 'down':down, 'up':up, 'atom':atom} );
        return args;
      },

      // gen arg collectors for call/sign invocation
      genargslistfromABIentry: function( ABI, i ) {
        return Web3UI.Gen.Invoke.genargs( ABI, i, Web3UI.ABI.getinputs(ABI,i) );
      },

      methodcode:
        "function(contract){return contract.methods.$METHODNAME$($ARGS$);}",

      // gen method invocation from ABI entry
      genmethodfromABIentry: function( ABI, i ) {
        var args = Web3UI.Gen.Invoke.genargslistfromABIentry( ABI, i );
        return Web3UI.Utils.replace( Web3UI.Gen.Invoke.methodcode, [ 
            {token:'$METHODNAME$', replacewith:Web3UI.ABI.getname(ABI,i), count:1 },
            {token:'$ARGS$', replacewith:args, count:1 }] );
      },

      callinvocation:
        "Web3UI.Interact.call( $FUNC$, $METHODINDEX$ )",

      // gen call invocation from ABI entry
      gencallfromABIentry: function( ABI, i ) {
        var f = Web3UI.Gen.Invoke.genmethodfromABIentry( ABI, i );
        return Web3UI.Utils.replace( Web3UI.Gen.Invoke.callinvocation, [ 
            {token:'$FUNC$', replacewith:f, count:1 },
            {token:'$METHODINDEX$', replacewith:i, count:1 }] );
      },

      signinvocation:
        "Web3UI.Interact.sign( $FUNC$, $METHODINDEX$ )",

      // gen sign invocation from ABI entry
      gensignfromABIentry: function( ABI, i ) {
        var f = Web3UI.Gen.Invoke.genmethodfromABIentry( ABI, i );
        return Web3UI.Utils.replace( Web3UI.Gen.Invoke.signinvocation, [ 
            {token:'$FUNC$', replacewith:f, count:1 },
            {token:'$METHODINDEX$', replacewith:i, count:1 }] );
      },

      deploycode:
        "function(contract){return contract.deploy({data:Web3UI.Interact.getcontractbytecode(), arguments:[$ARGS$]});}",

      // gen deploy-sign invocation from ABI entry
      gendeployfromABIentry: function( ABI, i ) {
        var args = Web3UI.Gen.Invoke.genargslistfromABIentry( ABI, i );
        var f = Web3UI.Utils.replace( Web3UI.Gen.Invoke.deploycode, [ 
            {token:'$ARGS$', replacewith:args, count:1 }] );
        return Web3UI.Utils.replace( Web3UI.Gen.Invoke.signinvocation, [ 
            {token:'$FUNC$', replacewith:f, count:1 },
            {token:'$METHODINDEX$', replacewith:i, count:1 }] );
      },

      // gen invocation fun for call, sign, or deploy
      gen: function( methodname ) {
        var ABI = Web3UI.ABI.get();
        var i = Web3UI.ABI.indexof( ABI, methodname );
        var isdeploy = Web3UI.ABI.isconstructor( ABI, i );
        var iscall = Web3UI.ABI.iscall( ABI, i );
        var f = isdeploy ? Web3UI.Gen.Invoke.gendeployfromABIentry(ABI,i) : 
                           (iscall ? Web3UI.Gen.Invoke.gencallfromABIentry(ABI,i) : Web3UI.Gen.Invoke.gensignfromABIentry(ABI,i));
        console.log( "INVOCATION:", f );
        return f;
      }

    }

  },

  /*** Interact with UI ***/
  Interact: {
      rawtxs: [],

      // gen and invoke call or sign function
      invoke: function( methodname ) {
        var f = Web3UI.Gen.Invoke.gen( methodname );
        setTimeout( f, 1 );
      },

      // collect arg from input field
      getarg: function( methodindex, argname, argidname ) {
        var ABI = Web3UI.ABI.get();
        var id = 'Web3UI_' + Web3UI.ABI.getname(ABI,methodindex);
        var a = document.getElementById( id+'_'+argidname ).value;
        if (a == "")
          throw( (argname?argname:"input") + " required" );
        return a;
      },

      // save arg from input field
      savearg: function( methodname, argidname ) {
        var id = 'Web3UI_' + methodname + '_' + argidname;
        var av = document.getElementById( id ).value;
        Web3UI.ABI.saveval( methodname, argidname, av );
        return av;
      },

      // get bytecode input
      getcontractbytecode: function() {
        var contractbytecode = document.getElementById( 'Web3UI_0contractbytecode' ).value;
        if (!contractbytecode)
          throw( "Contract bytecode required" );
        return contractbytecode;
      },

      openbytecode: function( file, methodname ) { 
        var id = 'Web3UI_0resetmsg';
        function cb( bc ) {
          Web3UI.Utils.showeditmsg( 'Web3UI_0contractbytecode', bc );
          Web3UI.Interact.cleartxmsgs( methodname ); 
       }
        Web3UI.Utils.openjsonfile( id, file, cb, true );
      },

      // call contract
      call: function( f, methodindex ) {
        var ABI = Web3UI.ABI.get();
        var id = 'Web3UI_' + Web3UI.ABI.getname(ABI,methodindex);
        var contract = Web3UI.Interact.getcontract( id );
        if (!contract)
          return;
        function oncompletion( err, res ) {
          Web3UI.Utils.showmsg( id, err?Web3UI.Utils.err(err):JSON.stringify(res) );
        }
        try {
          var c = f( contract );
          c.call( oncompletion );
        }
        catch( e ) {
          oncompletion( e );
        }
      },

      // initialize txdef for sign
      initTxDef: function( id ) {
        var txdef = {
          gas: document.getElementById( 'Web3UI_0account_gas' ).value, 
          gasPrice: document.getElementById( 'Web3UI_0account_gasprice' ).value,
          nonce: document.getElementById( 'Web3UI_0account_nonce' ).value,
          chainId: document.getElementById( 'Web3UI_0network_chainid' ).value
        };
        if (txdef.nonce === "")
          return Web3UI.Interact.showsignmsgs( id, "Wallet nonce required" );
        if (!txdef.gasPrice)
          return Web3UI.Interact.showsignmsgs( id, "Gas price required" );
        if (!txdef.gas)
          txdef.gas = "0";
        if (!txdef.chainId)
          return Web3UI.Interact.showsignmsgs( id, "Chain ID required (see bottom of page)" );
        try {
          var forceexception_ifnotnumber = Web3UI.Utils.toBN( txdef.chainId );
          forceexception_ifnotnumber = Web3UI.Utils.toBN( txdef.gas );
          forceexception_ifnotnumber = Web3UI.Utils.toBN( txdef.gasPrice );
          forceexception_ifnotnumber = Web3UI.Utils.toBN( txdef.nonce );
          if (txdef.gasPrice <= 0)
            return Web3UI.Interact.showsignmsgs( id, "Invalid gas price" );
        }
        catch( e ) {
          return Web3UI.Interact.showsignmsgs( id, e );
        }
        return txdef;
      },

      // sign a prepared tx def
      signtxdef: function( id, txdef, rawtxs, rawtxindex ) {
        var account = Web3UI.Wallet.getWallet( id );
        if (!account)
          return;
        var txcost;
        function oncompletion( err, res ) {
          Web3UI.Interact.showsignmsgs( id, err, res, txcost );
          rawtxs[rawtxindex] = (err || !res) ? "" : res.rawTransaction;
        }
        try {
          txcost = Web3UI.Network.calccost( txdef.value, txdef.gas, txdef.gasPrice, true );
          tx = Web3UI.Network.web3.eth.accounts.signTransaction( txdef, account.privateKey, oncompletion );
        }
        catch( e ) {
          oncompletion( e );
          tx = "";
        }
        return tx;
      },

      // sign a tx for contract
      sign: function( f, methodindex ) {
        Web3UI.Interact.rawtxs[methodindex] = "";
        var ABI = Web3UI.ABI.get();
        var id = 'Web3UI_' + Web3UI.ABI.getname(ABI,methodindex);
        var txdef = Web3UI.Interact.initTxDef( id );
        if (!txdef)
          return;
        var isdeploy = Web3UI.ABI.isconstructor( ABI, methodindex );
        var contract = Web3UI.Interact.getcontract( id, isdeploy );
        if (!contract)
          return;
        try {
          if (!isdeploy) {
            txdef.to = Web3UI.Utils.getv( 'Web3UI_0contractaddress', '' );
            if (!txdef.to)
              throw( 'Contract address required' );
          }
          if (Web3UI.ABI.ispayable( ABI, methodindex )) {
            txdef.value = document.getElementById( 'Web3UI_'+Web3UI.ABI.getname(ABI,methodindex)+'_0pay' ).value;
            txdef.value = Web3UI.Network.web3.utils.toWei( txdef.value, 'ether' );
          }
          var mc = f( contract );
          txdef.data = mc.encodeABI();
        }
        catch( e ) {
          return Web3UI.Interact.showsignmsgs( id, e );
        }
        Web3UI.Interact.signtxdef( id, txdef, Web3UI.Interact.rawtxs, methodindex );
      },

      // send signed raw tx
      sendrawtx: function( methodname, rawtx ) {
        var id = 'Web3UI_' + methodname + '_0send';
        var idpay = 'Web3UI_' + methodname + '_0pay';
        var idfee = 'Web3UI_' + methodname + '_0fee';
        var idsignbtn = 'Web3UI_' + methodname + '_0signbtn';
        var idbtn = 'Web3UI_' + methodname + '_0sendbtn';
        Web3UI.Utils.setin( idbtn, "" );
        if (!rawtx)
          return Web3UI.Utils.showmsg( id, "Sign transaction first" );
        function onerror( err ) {
          Web3UI.Utils.en( idsignbtn, true );
          //Web3UI.Wallet.getWalletInfo();
        }
        function onwait() {
          Web3UI.Utils.en( idsignbtn, false );
        }
        function oncompletion( res, receipt ) {
          Web3UI.Utils.en( idsignbtn, true );
          Web3UI.Wallet.getWalletInfo();
        }
        Web3UI.Utils.en( idsignbtn, false );
        Web3UI.Network.broadcastTx( rawtx, 
          { 'gasprice':Web3UI.Utils.getv('Web3UI_0account_gasprice',""), 
            'value':Web3UI.Utils.getv(idpay,"0.0"), 
            'idmsg':id, 
            'idcost':idfee },
          { 'oncompletion':oncompletion, 'onwait':onwait, 'onerror':onerror } );
      },

      // send signed tx
      sendtx: function( methodindex ) {
        var ABI = Web3UI.ABI.get();
        var rawtx = Web3UI.Interact.rawtxs[methodindex];
        Web3UI.Interact.sendrawtx( Web3UI.ABI.getname(ABI,methodindex), rawtx );
      },

      // save signed tx
      rawTxSave: function() {
        Web3UI.Interact.saverawtx( '0account', [0] );
      },

      // save raw tx
      saverawtx: function( methodname, rawtx ) {
        var id = 'Web3UI_' + methodname + '_0rawtxsavemsg';
        var idsave = 'Web3UI_' + methodname + '_0rawtxsave';
        var idhash = 'Web3UI_' + methodname;
        if (!rawtx)
          return Web3UI.Utils.showmsg( id, "Sign transaction first" );
        try {
          var e = document.getElementById( idsave );
          e.href = "data:text/plain," + rawtx;
          var hash = Web3UI.Utils.getmsg( idhash, "" );
          if (hash.slice(0,16) == "Transaction ID: ")
            hash = hash.slice( 16 );
          e.download = Web3UI.appname + "-rawtx-" + hash + ".txt";
          e.click();
        }
        catch( e ) {
          Web3UI.Utils.showmsg( id, e );
        }
      },

      // save signed tx
      savetx: function( methodindex ) {
        var ABI = Web3UI.ABI.get();
        var rawtx = Web3UI.Interact.rawtxs[methodindex];
        Web3UI.Interact.saverawtx( Web3UI.ABI.getname(ABI,methodindex), rawtx );
      },

      // show sign msgs
      showsignmsgs: function( id, err, res, txcost ) {
        err = err ? err : "";
        var idpay = id+'_0pay';
        var idcost = id+'_0cost';
        var idsendbtn = id+'_0sendbtn';
        var idsend = id+'_0send';
        var idrawtx = id+'_0rawtx';
        var idsavebtn = id+'_0rawtxsavebtn';
        Web3UI.Utils.showmsg( id, (err||!res)?Web3UI.Utils.err(err):"Transaction ID: "+res.transactionHash );
        Web3UI.Utils.showmsg( idcost, (err||!txcost)?"":"Maximum to spend: " + txcost + " ether" );
        Web3UI.Utils.showmsg( idsend, "" );
        Web3UI.Utils.setin( idsendbtn, err?"":"Send" );
        Web3UI.Utils.showmsg( idrawtx, (err||!res)?"":"Raw transaction: "+res.rawTransaction );
        Web3UI.Utils.setin( idsavebtn, err?"":"Save" );
      },

      // clear msgs in transaction section
      cleartxmsgs: function( methodname ) {
        Web3UI.Utils.clearmsgs( ['Web3UI_' + methodname,
                                 'Web3UI_' + methodname + '_0cost',
                                 'Web3UI_' + methodname + '_0sendbtn',
                                 'Web3UI_' + methodname + '_0fee',
                                 'Web3UI_' + methodname + '_0rawtx',
                                 'Web3UI_' + methodname + '_0rawtxsavebtn',
                                 'Web3UI_' + methodname + '_0rawtxsavemsg',
                                 'Web3UI_' + methodname + '_0send'] );
        Web3UI.Utils.en( 'Web3UI_' + methodname + '_0signbtn', true );
      },

      // clear msgs for a method or all methods
      clearmsgs: function( methodindex, calls ) {
        var ABI = Web3UI.ABI.get();
        if (!ABI)
          return;
        Web3UI.Interact.rawtxs = [];
        function clr( i ) {
          if (Web3UI.ABI.iscall( ABI, i )) {
            if (calls)
              Web3UI.Utils.clearmsgs( ['Web3UI_'+Web3UI.ABI.getname(ABI,i)] );
          }
          else
            Web3UI.Interact.cleartxmsgs( Web3UI.ABI.getname(ABI,i) );
          Web3UI.Interact.rawtxs[i] = "";
        }
        if (methodindex !== undefined)
          return clr( methodindex );
        for( var i=0; i<ABI.length; i++ )
          clr( i );
      },

      // get web3.js contract object
      getcontract: function( idres, noaddress ) {
        Web3UI.Utils.showmsg( idres, "waiting for reply..." );
        if (!noaddress)
          if (!Web3UI.ABI.contractaddr)
            return Web3UI.Utils.showmsg( idres, "Contract Address required" );
        try {
          var ABI = JSON.parse( document.getElementById('Web3UI_0contractABI').value );
          if (noaddress)
            return new Web3UI.Network.web3.eth.Contract( ABI );
          return new Web3UI.Network.web3.eth.Contract( ABI, Web3UI.ABI.contractaddr );
        }
        catch( e ) {
          Web3UI.Utils.showmsg( idres, e );//"Contract ABI or Address is invalid" );
        }
      }

  },

  /*** Network module ***/
  Network: {

    defaultProvider: "https://cloudflare-eth.com",
    providerId: 'Web3UI_0network_provider',

    // wake up web3 and establish provider
    setconnection: function() {
      var p = Web3UI.Utils.getv( Web3UI.Network.providerId, Web3UI.Network.defaultProvider );
      Web3UI.Network.web3 = new Web3( p );
    },

    // get recent gas price
    getGasPrice: function( idpfx, callback ) {
      var id = idpfx+'_response';
      var idval = idpfx+'_gasprice';
      function oncompletion( err, wei ) {
        //  29000000000
        // 134307621597
        // 252832362472
        var msg = "";
        if (err)
          msg = Web3UI.Utils.err( err, "Attempt to update gas price failed" );
          //Web3UI.Utils.showeditmsg( idval, "" );
        else {
          Web3UI.Network.gasprice = wei;
          Web3UI.Utils.showeditmsg( idval, Web3UI.Network.gasprice );
          msg = "Gas price "+Web3UI.Network.web3.utils.fromWei(wei.toString(),'ether')+" ether";
        }
        if (callback)
          callback( err, msg );
        else
          Web3UI.Utils.showmsg( id, msg );
      }
      Web3UI.Utils.showmsg( id, "Requesting gas price..." );
      Web3UI.Network.web3.eth.getGasPrice( oncompletion );
    },

    // test address validity
    testAddress: function( idmsg, address ) {
      if (!address)
        return Web3UI.Utils.showmsg( idmsg, "Address required" );
      if (Web3UI.Network.web3.utils.isAddress( address ))
        return true;
      else
        Web3UI.Utils.showmsg( idmsg, "Invalid ethereum address" );
    },

    // get balance of address
    getAddressBalance: function( idpfx, address, callback ) {
        var id = idpfx+'_response';
        var idval = idpfx+'_balance';
        function oncompletion( err, wei ) {
          var msg = "";
          if (err)
            msg = Web3UI.Utils.err( err, "Attempt to update balance failed" );
            //Web3UI.Utils.showeditmsg( idval, "" );
          else
            msg = "Balance "+Web3UI.Network.web3.utils.fromWei(wei,'ether')+" ether",
            Web3UI.Utils.showeditmsg( idval, Web3UI.Network.web3.utils.fromWei(wei,'ether') );
          if (callback)
            callback( err, msg );
          else
            Web3UI.Utils.showmsg( id, msg );
        }
        try {
          Web3UI.Utils.showmsg( id, "Requesting balance..." );
          Web3UI.Network.web3.eth.getBalance( address, oncompletion );
        } 
        catch( e ) { 
          oncompletion( e );
        }
    },

    // get nonce of address
    getAddressNonce: function( idpfx, address, callback ) {
        var id = idpfx+'_response';
        var idval = idpfx+'_nonce';
        Web3UI.Wallet.nonce = -1;
        function oncompletion( err, count ) {
          var msg = "";
          Web3UI.Wallet.nonce = err?-1:count;
          if (err)
            msg = Web3UI.Utils.err( err, "Attempt to update nonce failed" );
            //Web3UI.Utils.showeditmsg( idval, "" );
          else
            msg = "Nonce " + count,
            Web3UI.Utils.showeditmsg( idval, Web3UI.Wallet.nonce );
          if (callback)
            callback( err, msg );
          else
            Web3UI.Utils.showmsg( id, msg );
	}
        try {
          Web3UI.Utils.showmsg( id, "Requesting nonce..." );
          Web3UI.Network.web3.eth.getTransactionCount( address, oncompletion );
        } 
        catch( e ) {
          oncompletion( e );
        }
    },

    // get/test address
    getAddress: function( idpfx, address ) {
        if (!address)
          address = Web3UI.Utils.getv( idpfx+'_address', '' );
        if (Web3UI.Network.testAddress( idpfx+'_response', address ))
          return address;
    },

    // update address info
    msgchain: "",
    preverr: "",
    getAddressInfo: function( idpfx, action, address ) {
        Web3UI.Network.msgchain = "", Web3UI.Network.preverr = "";
        var address = Web3UI.Network.getAddress( idpfx, address );
        if (!address)
          return;
        function callback( err, res ) {
          if (err) {
            err = Web3UI.Utils.err( err );
            if (err == Web3UI.Network.preverr)
              Web3UI.Network.msgchain = "";
            Web3UI.Network.preverr = err;
            res = Web3UI.Utils.err( err, "Attempt to update Balance, Nonce, and Gas Price failed" );
          }
          Web3UI.Network.msgchain = Web3UI.Network.msgchain ? (Web3UI.Network.msgchain + ", " + res) : res;
          Web3UI.Utils.showmsg( idpfx+'_response', Web3UI.Network.msgchain );
        }
        if (!action || action == 'nonce')
          Web3UI.Network.getAddressNonce( idpfx, address, action?null:callback );
        if (!action || action == 'balance')
          Web3UI.Network.getAddressBalance( idpfx, address, action?null:callback );
        if (!action || action == 'gasprice')
          Web3UI.Network.getGasPrice( idpfx, action?null:callback );
    },

    // calc fee plus value sent (if any)
    calccost: function( value, gas, gasprice, throwonerr ) {
      var cost = "";
      try {
        cost = Web3UI.Utils.toBN( value?value:"0" );
        var fee = Web3UI.Utils.multBN( gas, gasprice );
        cost = cost.add( fee );
        cost = Web3UI.Network.web3.utils.fromWei( cost.toString(), 'ether' );
      }
      catch( e ) {
        if (throwonerr) throw( e ); 
      }
      return cost;
    },

    // broadcast a signed tx, stats:{gasprice, idmsg, value, idcost}
    broadcastTx: function( rawtx, stats, callbacks ) {
      var done = false; //(closure to ignore follow up messages)
      if (stats.idmsg)
        Web3UI.Utils.showmsg( stats.idmsg, "Waiting for reply..." );
      function onerror( error ) {
        if (!done) {
          if (callbacks.onerror)
            if (callbacks.onerror( error )) 
              return;
          if (stats.idmsg)
            Web3UI.Utils.showerr( stats.idmsg, error, "Send failed" );
          if (stats.idcost)
            Web3UI.Utils.showmsg( stats.idcost, '' );
        }
      }
      function onhash( hash ) {
        if (!done) {
          msg = "Sent, waiting for confirmation...";
          if (callbacks.onwait)
            if (callbacks.onwait( msg, {'txhash':hash} )) 
              return;
          if (stats.idmsg)
            Web3UI.Utils.showmsg( stats.idmsg, msg );
        }
        console.log( ".once( transactionHash ): ", hash );
      }
      function onthen( receipt ) {
        if (done) return;
        done = true;
        var msg = "Transaction mined into block " + receipt.blockNumber;
        if (receipt.contractAddress)
          msg = "Contract deployed at address: " + receipt.contractAddress;
        if (callbacks.oncompletion)
          if (callbacks.oncompletion( msg, receipt ))
            return;
        if (stats.idmsg)
          Web3UI.Utils.showmsg( stats.idmsg, msg );
        if (stats.idcost) {
          var value = Web3UI.Network.web3.utils.toWei( stats.value?stats.value:'0.0', 'ether' );
          var c = Web3UI.Network.calccost( value, receipt.gasUsed, stats.gasprice );
          var costmsg = c ? "Ether spent: " + c : "";
          costmsg += receipt.gasUsed ? " (gas: "+receipt.gasUsed+")" : "";
          Web3UI.Utils.showmsg( stats.idcost, costmsg );
        }
        console.log( ".then receipt: ", receipt );
      }
      try {
        Web3UI.Network.web3.eth.sendSignedTransaction( rawtx )
          .once( 'transactionHash', onhash )
          .on( 'error', onerror )
          .then( onthen );
      }
      catch( e ) {
        onerror( e );
      }
    }

  },

  /*** Account Wallet module ***/
  Wallet: {

      nonce: -1,
      rawtx: [""],

      // create a wallet
      createkeypair: function( offline ) {
        Web3UI.Wallet.clr();
        Web3UI.Wallet.account = Web3UI.Network.web3.eth.accounts.create();
        Web3UI.Utils.showeditmsg( 'Web3UI_0account_privatekey', Web3UI.Wallet.account.privateKey );
        Web3UI.Utils.showmsg( 'Web3UI_0account_privatekeyshow', "Private key: "+Web3UI.Wallet.account.privateKey );
        Web3UI.Utils.showmsg( 'Web3UI_0account_address', "Address: "+Web3UI.Wallet.account.address );
        Web3UI.Utils.setin( 'Web3UI_0account_savebtn', "Save" );
        if (!offline)
          Web3UI.Wallet.getWalletInfo();
      },

      // open a wallet
      openkeypair: function( offline ) {
        Web3UI.Wallet.clr();
        var a;
        var pk = document.getElementById( 'Web3UI_0account_privatekey' ).value;
        try {
          a = Web3UI.Network.web3.eth.accounts.privateKeyToAccount( pk );
        }
        catch( e ) {
          return Web3UI.Utils.showmsg( 'Web3UI_0account_address', e );
        }
        Web3UI.Wallet.account = a;
        Web3UI.Utils.showeditmsg( 'Web3UI_0account_privatekey', Web3UI.Wallet.account.privateKey );
        Web3UI.Utils.showmsg( 'Web3UI_0account_address', "Address: "+Web3UI.Wallet.account.address );
        if (!offline)
          Web3UI.Wallet.getWalletInfo();
        return a;
      },

      new: function( offline ) {
        Web3UI.Wallet.createkeypair( offline );
      },

      open: function( offline ) {
        return Web3UI.Wallet.openkeypair( offline );
      },

      openfromfile: function( file, offline ) {
        function err( m ) {
          Web3UI.Wallet.clr();
          Web3UI.Utils.showeditmsg( 'Web3UI_0account_privatekey', "" );
          if (m)
            Web3UI.Utils.showmsg( 'Web3UI_0account_address', m );
        }
        function cb( w ) {
          //Web3UI.Wallet.clr();
          if (w.privateKeyEncrypted) {
            var pass = Web3UI.Utils.getv( 'Web3UI_0account_pass' );
            if (pass == "password")
              pass = "";
            if (!pass)
              return err( "Wallet file is encrypted, password required" );
            try {
              w.privateKey = Web3UI.Utils.decryptstr( w.privateKeyEncrypted, pass, "PK" );
            }
            catch( e ) {
              return err( "Decryption failed, wrong password or invalid file contents (" + e + ")" );
            }
            if (!w.privateKey)
              return err( "Decryption failed, check password" );
          }
          else
            if (!w.privateKey)
              return err( "File is invalid (no private key)" );
          if (!w.address)
            return err( "File is invalid (no address)" );
          Web3UI.Utils.showeditmsg( 'Web3UI_0account_privatekey', w.privateKey );
          if (!Web3UI.Wallet.open( true ))
            return err();
          if (w.address != Web3UI.Wallet.account.address)
            return err( "Decryption failed, check password" );
          if (offline)
            Web3UI.Utils.showeditmsg( 'Web3UI_0account_nonce', "" );
          else
            Web3UI.Wallet.getWalletInfo();
        }
        Web3UI.Utils.openjsonfile( 'Web3UI_0account_address', file, cb );
      },

      // save wallet to file
      savetofile: function() {
        var id = 'Web3UI_0account_response';
        if (!Web3UI.Wallet.account)
          return Web3UI.Utils.showmsg( id, "Create wallet first" );
        try {
          var w = {privateKey: Web3UI.Wallet.account.privateKey, address: Web3UI.Wallet.account.address};
          var pass = Web3UI.Utils.getv( 'Web3UI_0account_pass' );
          if (pass == "password")
            pass = "";
          if (pass) {
            w.privateKeyEncrypted = Web3UI.Utils.encryptstr( w.privateKey, pass, "PK" );
            if (w.privateKeyEncrypted)
              w.privateKey = "";
            else
              throw( "Encryption failed, wallet not saved" );
          }
          var e = document.getElementById( 'Web3UI_0account_save' );
          e.href = "data:text/plain," + JSON.stringify(w);
          e.download = Web3UI.appname + "-account-" + Web3UI.Wallet.account.address + ".txt";
          e.click();
        }
        catch( e ) {
          Web3UI.Utils.showmsg( id, e );
        }
      },

      // get wallet object
      getWallet: function( idmsg ) {
        if (!idmsg)
          idmsg = 'Web3UI_0account_response';
        Web3UI.Utils.showmsg( idmsg, "waiting for reply..." );
        if (!Web3UI.Wallet.account)
          return Web3UI.Utils.showmsg( idmsg, "Open wallet first" );
        return Web3UI.Wallet.account;
      },

      // get wallet info
      getWalletInfo: function() {
        var account = Web3UI.Wallet.getWallet();
        if (account)
          Web3UI.Network.getAddressInfo( 'Web3UI_0account', '', account.address );
      },

      // get balance of wallet address
      getBalance: function() {
        var account = Web3UI.Wallet.getWallet();
        if (account)
          Web3UI.Network.getAddressBalance( 'Web3UI_0account', account.address );
      },

      // get nonce of wallet address
      getNonce: function() {
        Web3UI.Wallet.clrwmsg();
        var account = Web3UI.Wallet.getWallet();
        if (account)
          Web3UI.Network.getAddressNonce( 'Web3UI_0account', account.address );
      },

      // get gas price
      getGasPrice: function() {
        Web3UI.Wallet.clrwmsg();
        Web3UI.Network.getGasPrice( 'Web3UI_0account' );
      },

      // sign a tx to send eth from wallet
      signAccountTx: function() {
        Web3UI.Wallet.rawtx[0] = "";
        var id = 'Web3UI_0account';
        var txdef = Web3UI.Interact.initTxDef( id );
        if (!txdef)
          return;
        try {
          txdef.to = Web3UI.Utils.getv( 'Web3UI_0account_toaddress', '' );
          if (!txdef.to)
            throw( 'Recipient address required' );
          txdef.value = document.getElementById( 'Web3UI_0account_0pay' ).value;
          txdef.value = Web3UI.Network.web3.utils.toWei( txdef.value, 'ether' );
        }
        catch( e ) {
          return Web3UI.Utils.showmsg( id, e );
        }
        return Web3UI.Interact.signtxdef( id, txdef, Web3UI.Wallet.rawtx, 0 );
      },

      // send signed account tx
      sendAccountTx: function( rawtx ) {
        if (!rawtx)
          rawtx = Web3UI.Wallet.rawtx[0];
        Web3UI.Interact.sendrawtx( '0account', rawtx );
      },

      // save signed tx
      saveAccountTx: function( rawtx ) {
        if (!rawtx)
          rawtx = Web3UI.Wallet.rawtx[0];
        Web3UI.Interact.saverawtx( '0account', rawtx );
      },

      // clear msgs in transaction section
      clearAccountTxMsgs: function() {
        Web3UI.Wallet.rawtx[0] = "";
        Web3UI.Interact.cleartxmsgs( '0account' );
      },

      // clear wallet kaput
      clr: function() {
        Web3UI.Wallet.account = null;
        Web3UI.Wallet.clrwmsg();
        Web3UI.Utils.clearmsgs( ['Web3UI_0account_privatekeyshow',
                                 'Web3UI_0account_address'] );
        Web3UI.Utils.showeditmsg( 'Web3UI_0account_nonce', "" );
        Web3UI.Utils.showeditmsg( 'Web3UI_0account_balance', "" );
        Web3UI.Utils.setin( 'Web3UI_0account_savebtn', "" );
      },

      // clear wallet msgs and tx msgs for updated signing info
      clrwmsg: function() {
        Web3UI.Wallet.clearAccountTxMsgs();
        Web3UI.Interact.clearmsgs();
        Web3UI.Utils.showmsg( 'Web3UI_0account_response', "" );
      }

  },

  /*** Housekeeping functions ***/
  Utils: {

      // process error
      err: function( msg, pfx ) {
        if (msg && msg.toString().slice(0,35) == "Error: Signer Error: Signer Error: ")
          msg = msg.toString().slice(35);
        if (msg == 'Error: Invalid JSON RPC response: ""')
          msg += ", check internet connection";
        if (msg && msg.toString().slice(0,29) == "Error: invalid arrayify value")
          msg = "Functions as arguments require special handling (" + msg + ")";
        return pfx ? (pfx+" (response was " + msg + ")") : msg;
      },

      // show a msg on page
      showerr: function( id, msg, pfx ) {
        msg = Web3UI.Utils.err( msg, pfx );
        //if (msg) console.log( msg );
        if (document.getElementById( id )) document.getElementById( id ).innerHTML = msg;
      },

      // show a msg on page
      showmsg: function( id, msg ) {
        //if (msg) console.log( msg );
        if (document.getElementById( id )) document.getElementById( id ).innerHTML = msg;
      },

      // set inner HTML
      setin: function( id, i ) {
        if (document.getElementById( id )) document.getElementById( id ).innerHTML = i;
      },

      // clear msgs on page
      clearmsgs: function( ids ) {
        for( var i=0; i<ids.length; i++ )
          Web3UI.Utils.showmsg( ids[i], "" );
      },

      // show a msg in input
      showeditmsg: function( id, msg ) {
        //console.log( msg );
        if (document.getElementById( id )) document.getElementById( id ).value = msg;
      },

      // get inner of elem
      getmsg: function( id, defaultmsg ) {
        var e = document.getElementById( id );
        if (e && e.innerHTML) return e.innerHTML;
        return defaultmsg;
      },

      // get elem
      gete: function( id ) {
        return document.getElementById( id );
      },

      // enable/disable elem
      en: function( id, ena ) {
        var e = document.getElementById( id );
        if (e)
          e.disabled = !ena;
      },

      // get value of elem
      getv: function( id, defaultv ) {
        var e = document.getElementById( id );
        if (e && e.value) return e.value;
        return defaultv;
      },

      // set value of elem
      setv: function( id, v ) {
        var e = document.getElementById( id );
        if (e) e.value = v;
      },

      // int to big int
      toBN: function( n ) {
        return Web3UI.Network.web3.utils.toBN( n );
      },

      // mult ints to big int
      multBN: function( n, m ) {
        n = Web3UI.Utils.toBN( n );
        m = Web3UI.Utils.toBN( m );
        return n.mul( m );
      },

      // mult ints to big int
      addBN: function( n, m ) {
        n = Web3UI.Utils.toBN( n );
        m = Web3UI.Utils.toBN( m );
        return n.add( m );
      },

      // replace tokens in string [{token:"T",replacewith:"W",count:N}, ...]
      replace: function( s, tokens ) {
        for( var i=0; i<tokens.length; i++ )
          for( var j=0; j<tokens[i].count; j++ )
            s = s.replace( tokens[i].token, tokens[i].replacewith );
        return s;
      },

      // copy mem
      copymem: function( o ) {
        return JSON.parse( JSON.stringify(o) );
      },

      /*function replaceAll(str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
      },*/

      // open json file
      openjsonfile: function( id, file, callback, returnrawtext ) {
        if (!file)
          return; //Web3UI.Utils.showmsg( id, 'No file selected' );
        var reader = new FileReader();
        reader.onerror = function( e ) {Web3UI.Utils.showmsg( id, 'Error reading file: '+e );callback({});}
        reader.onload = function( e ) {
          try { 
            var j = returnrawtext ? e.target.result : JSON.parse(e.target.result);
          }
          catch( e ) {
            return reader.onerror( "Invalid file contents (not JSON text)" );
          }
          callback( j );
        }
        reader.readAsText( file );
      },

      // encrypt string with AES256
      encryptstr: function( plain, pass, pfx ) {
        if (!pfx) pfx = "";
        var cipher = plain;
        if (CryptoJS && CryptoJS.AES) {
          var cipher = CryptoJS.AES.encrypt( pfx+plain, pass );
          cipher = cipher.toString();
        }
        //console.log( "CIPHER:", cipher );
        return cipher;
      },

      // decrypt cipher-string with AES256
      decryptstr: function( cipherstr, pass, pfx ) {
        if (!pfx) pfx = "";
        var plain = "";
        if (CryptoJS && CryptoJS.AES) {
          plain = CryptoJS.AES.decrypt( cipherstr, pass );
          plain = plain.toString( CryptoJS.enc.Utf8 );
          if (pfx) {
            if (plain.slice(0,pfx.length) != pfx)
              plain = "";
            else
              plain = plain.slice( pfx.length );
          }
        }
        return plain;
      }

  }

};
