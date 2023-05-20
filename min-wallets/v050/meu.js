/*
Generates HTML footers, etc for Minimal Ethereum Utilities
Inherits web3ui.js license
*/
var MEU = {
    footsection: {
        start:  '<p class="appendix">',
        online:   'HTTP provider: ' +
                  '<input type="text" id="Web3UI_0network_provider" class="net" value="https://cloudflare-eth.com" ' +
                         'onchange="Web3UI.Network.setconnection();"/> ' +
                  '<br/>' +
                  'Chain ID: ' +
                  '<input type="text" id="Web3UI_0network_chainid" class="net int" value="1" onchange="Web3UI.Network.setconnection();"/>' +
                  ' (required to sign: ETH=1, ETC=61, Ropsten=3) ' +
                  '<br/><br/>' +
                  'Free Testnet ETH can be obtained from a Ropsten faucet. ' +
                  'If receiving unexpected responses or strange errors, the provider may be overloaded. ' +
                  '<br/><br/>' +
                  'Some providers: ' +
                '</p>' +
                '<ul>' +
                  '<li><tt>https://cloudflare-eth.com</tt> <div class="mbr">Mainnet ETH (open access)</div></li>' +
                  '<li><tt>https://www.ethercluster.com/etc</tt> <div class="mbr">Ethereum-classic ETC (open)</div></li>' +
                  '<li><tt>https://ropsten.infura.io/v3/API_KEY</tt> <div class="mbr">Ropsten Testnet (key required)</div></li>' +
                  '<!-- <br/><tt>https://www.ethercluster.com/goerli</tt> <div class="mbr">Goerli testnet</div></li>' +
                  '<li><tt>https://www.ethercluster.com/kotti</tt> <div class="mbr">Kotti testnet</div></li> -->' +
                '</ul>' +
                '<br/>' +
                '<p class="foot">' +
                  '<a href="index.html">All Minimal Ethereum Utilities</a>' +
                  '<br/><br/>' +
                  'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                  '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                  '<br/>2021 cc-by-sa (no liability)',
        nosign:   'HTTP provider: ' +
                  '<input type="text" id="Web3UI_0network_provider" class="net" value="https://cloudflare-eth.com" ' +
                         'onchange="Web3UI.Network.setconnection();"/> ' +
                  '<br/><br/>' +
                  'If receiving unexpected responses or strange errors, the provider may be overloaded. ' +
                  '<br/><br/>' +
                  'Some providers: ' +
                '</p>' +
                '<ul>' +
                  '<li><tt>https://cloudflare-eth.com</tt> <div class="mbr">Mainnet ETH (open access)</div></li>' +
                  '<li><tt>https://www.ethercluster.com/etc</tt> <div class="mbr">Ethereum-classic ETC (open)</div></li>' +
                  '<li><tt>https://ropsten.infura.io/v3/API_KEY</tt> <div class="mbr">Ropsten Testnet (key required)</div></li>' +
                  '<!-- <br/><tt>https://www.ethercluster.com/goerli</tt> <div class="mbr">Goerli testnet</div></li>' +
                  '<li><tt>https://www.ethercluster.com/kotti</tt> <div class="mbr">Kotti testnet</div></li> -->' +
                '</ul>' +
                '<br/>' +
                '<p class="foot">' +
                  '<a href="index.html">All Minimal Ethereum Utilities</a>' +
                  '<br/><br/>' +
                  'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                  '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                  '<br/>2021 cc-by-sa (no liability)',
        offline:  'Chain ID: ' +
                  '<input type="text" id="Web3UI_0network_chainid" class="net int" value="1" onchange="Web3UI.Network.setconnection();"/>' +
                  ' (required to sign: ETH=1, ETC=61, Ropsten=3) ' +
                '</p><br/><p class="foot">' +
                  '<a href="index.html">All Offline Min-Wallets</a>' +
                  '<br/><br/>' +
                  'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                  '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                  '<br/>2021 cc-by-sa (no liability)',
        close:  '</p>',
        relate1:'<a href="contract-wallet.html">Contract Wallet</a> ' +
                  '&nbsp;|&nbsp;',
        relate2:'<a href="contract-wallet.html">Contract Deployment</a> ' +
                  '&nbsp;|&nbsp;'
    },

    // add page footer
    genfoot: function( version ) {
      var HTML = MEU.footsection.start + 
                        (version ? (version=='offline'?MEU.footsection.offline:MEU.footsection.nosign) : MEU.footsection.online) + 
                        MEU.footsection.close;
      HTML = HTML.replace( '$DONATE$', MEU.donationAddress );
      document.getElementById( 'Web3UI_0FOOT' ).innerHTML = HTML;
    },

    //rooturl: "https://gregsidal.github.io/minimal-ethereum-utilities",
    rooturl: "https://gregsidal.github.io/min-wallets",

    links: {
        start:  '<br/><br/>',
        params: 'To retrieve wallet nonce and gas price: ' +
                '<br/><tt>$ROOTURL$/address.html</tt>',
        broad:  'To broadcast saved transaction:' +
                '<br/><tt>$ROOTURL$/broadcast.html</tt>',
        call:   "To call contract's non-transaction methods: " +
                '<br/><tt>$ROOTURL$/contract-wallet.html</tt>',
        deploy: 'To interact with deployed contract: ' +
                '<br/><tt>$ROOTURL$/contract-wallet.html</tt>',
        index:  '' +
                '<tt>$ROOTURL$/index.html</tt>',
        end:    ''
    },

    // make a link message
    mklinkmsg: function( linkmsg ) {
      return MEU.links.start + MEU.links[linkmsg].replace('$ROOTURL$',MEU.rooturl) + MEU.links.end;
    },

    // helper
    gete: function( id ) {
      return document.getElementById( id );
    },

    // set recipient address of account wallet tx
    setto: function( to ) {
      if (MEU.gete( 'Web3UI_0account_toaddress' ))
        MEU.gete( 'Web3UI_0account_toaddress' ).value = to;
    },

    donationAddress: '0x050f989ae1680fE663bE70a8A2623caF7f805976',

    // donate
    setdonate: function() {
      if (MEU.gete( 'Web3UI_0account_toaddress' )) {
        if (!MEU.gete( 'Web3UI_0account_toaddress' ).value)
          MEU.gete( 'Web3UI_0account_toaddress' ).value = MEU.donationAddress;
      }
      else
        if (MEU.gete( 'Web3UI_0network_donatepop' )) {
          MEU.gete( 'Web3UI_0network_donatepop' ).href = "account-wallet.html?to=" + MEU.donationAddress;
          MEU.gete( 'Web3UI_0network_donatepop' ).click();
        }
    },

    // set recipient address of account wallet tx
    parseurl: function() {
      var p = new URLSearchParams( window.location.search );
      var to = "";
      if (p)
        to = p.get( 'to' );
      if (to)
        MEU.setto( to );
    },

    version: 
      '<span class="beta"> ' +
        'Beta test version 0.50 (released 2021-09-29). ' +
        'Reports of bugs or other issues can be submitted to the ' +
        "project's <a href='https://github.com/gregsidal/min-wallets/'>GitHub page</a>. " + 
        'Instructions for using Ropsten Testnet are provided at the bottom of this page. ' +
      '</span>',
    versionoffline: 
      '<span class="beta"> ' +
        'Beta test version 0.50 (released 2021-09-29). ' +
        'Reports of bugs or other issues can be submitted to the ' +
        "project's GitHub page: <tt>https://github.com/gregsidal/min-wallets/</tt> " + 
        'Instructions for using Ropsten Testnet are provided at the bottom of this page. ' +
      '</span>',
    highvaluemsg: '<br/><br/> ' +
      '<span class="warn">Using this utility to manage high value Mainnet accounts is not recommended.</span> ' +
      'For a more secure way to manage accounts, try the <a href="offline-install.html">offline wallets</a>. ',
    highvalueassetsmsg: '<br/><br/> ' +
      '<span class="warn">Using this utility to manage high value Mainnet assets is not recommended.</span> ' +
      'For a more secure way to manage assets, try the <a href="offline-install.html">offline wallets</a>. ',
    pksavemsg: '<br/><br/> ' +
      'Private keys will be encrypted when saved if a wallet password is provided. ' +
      'Since encrypted data is not possible to recover if the password is lost, ' +
      'keys of important accounts should also be written down or photographed.',

    // set up wallet page
    onload: function( offline, linkmsgs ) {
      if (linkmsgs) {
        linksHTML = "";
        for( var i=0; i<linkmsgs.length; i++ )
          linksHTML += MEU.mklinkmsg( linkmsgs[i] );
        MEU.gete( 'Web3UI_0LINKS' ).innerHTML = linksHTML;
      }
      MEU.genfoot( offline );
      if (MEU.gete( 'Web3UI_0VERSION' ))
        MEU.gete( 'Web3UI_0VERSION' ).innerHTML = offline ? MEU.versionoffline : MEU.version;
      if (MEU.gete( 'Web3UI_0PKSAVEMSG' ))
        MEU.gete( 'Web3UI_0PKSAVEMSG' ).innerHTML = MEU.pksavemsg;
      if (MEU.gete( 'Web3UI_0HIGHVALUEMSG' ))
        MEU.gete( 'Web3UI_0HIGHVALUEMSG' ).innerHTML = MEU.highvaluemsg;
      if (MEU.gete( 'Web3UI_0HIGHVALUEASSETSMSG' ))
        MEU.gete( 'Web3UI_0HIGHVALUEASSETSMSG' ).innerHTML = MEU.highvalueassetsmsg;
      Web3UI.Network.setconnection();
      MEU.parseurl();
    },

    indexfoot: {
        online:  '<p class="foot"> ' +
                   '2021 <a href="$ROOTURL$/index.html">Greg Sidal</a> cc-by-sa (no liability) ' +
                   '<br/><br/> ' +
                   'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                   '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                 '</p>',
        offline: '<p class="foot"> ' +
                   '2021 Greg Sidal cc-by-sa (no liability) ' +
                   '<br/><tt>$ROOTURL$/index.html</tt> ' +
                   '<br/><br/> ' +
                   'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                   '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                 '</p>',

        plon:    '<p class="foot"> ' +
                   '<br/><a href="index.html">All Min-Wallets</a> ' +
                   '<br/><br/>2021 <a href="index.html">Greg Sidal</a> cc-by-sa (no liability) ' +
                   '<br/><br/> ' +
                   'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                   '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                 '</p>',
        ploff:   '<p class="foot"> ' +
                   '<a href="index.html">All Offline Min-Wallets</a> ' +
                   '<br/><br/>2021 Greg Sidal cc-by-sa (no liability) ' +
                   '<br/><tt>$ROOTURL$/index.html</tt> ' +
                   '<br/><br/> ' +
                   'Donations: <tt onclick="MEU.setdonate();" class="donate">$DONATE$</tt>' +
                   '<a href="" class="dispnone" id="Web3UI_0network_donatepop" target="_blank"></a>' +
                 '</p>'
    },

    // setup index page
    onindexload: function( offline ) {
      var HTML = MEU.indexfoot.online;
      if (offline)
        HTML = MEU.indexfoot.offline;
      HTML = HTML.replace( '$ROOTURL$', MEU.rooturl );
      HTML = HTML.replace( '$DONATE$', MEU.donationAddress );
      MEU.gete( 'Web3UI_0FOOT' ).innerHTML = HTML;
      MEU.parseurl();
    },

    // setup plain page
    onplainload: function( offline ) {
      var HTML = MEU.indexfoot.plon;
      if (offline) {
        HTML = MEU.indexfoot.ploff.replace( '$ROOTURL$', MEU.rooturl );
      }
      HTML = HTML.replace( '$DONATE$', MEU.donationAddress );
      MEU.gete( 'Web3UI_0FOOT' ).innerHTML = HTML;
      MEU.parseurl();
    }


 };


