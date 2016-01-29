var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var LoginModalComponent = ng.core.Component({
  selector: 'tc-login-modal',
  templateUrl: '/app/loginmodal.html'
}).Class({
  constructor: [UIService, function(uiService) {
    this._uiService = uiService;

    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233;
  }],
  ngOnInit: function() {
    var self = this
      , urlParams = new URI().query(true)
      , prompt = urlParams.prompt
      , context = urlParams.context || ''
      , name = urlParams.name
      , link = urlParams.link
      , base = '/auth/'
      , src
    ;
    this._uiService.community$.subscribe(function(community) {
      
    })
    this._uiService.loginModel$.subscribe(function(event) {
      switch (event) {
        case 'show-login-prof':
          self.showLogProf();
          break;
        case 'show':
          self.showModal();
          break;
      }
    });

    if (prompt) {
      if (prompt=="twitteremail") {
        src = base + 'twitteremail';
      } else if (prompt=="alreadylocal") {
        src = base + 'alreadylocal?context=' + context + '&email=' + name;
      } else if (prompt=="googlelinkemail") {
        src = base + 'googlelinkemail';
      } else if (prompt=="facebooklinkemail") {
        src = base + 'facebooklinkemail';
      } else if (prompt=="googleassocemail") {
        src = base + 'googleassocemail';
      } if (prompt=="facebookassocemail") {
        src = base + 'facebookassocemail';
      } else if (prompt=="resetpwExpired") {
        src = base + 'resetpwExpired';
      } else if (
        prompt=='showprofile' || (prompt=="facebookconnect" && context==="")
      ) {
        src = base + 'profile';
        document.getElementById("frame").setAttribute("height", "350px");
      } else if (prompt=="sendauthenticate") {
        src = base + 'sendauthenticate?context=' + context;
      } else if (prompt=="authlinkExpired" && context==="") {
        src = base + 'authlinkExpired';
      } else if (prompt=="authlinkNotFound" && context==="") {
        src = base + 'authlinkNotFound';
      } else if (prompt=="TCresetpwExpired") {
        src = base + 'TCresetpwExpired';
      } else if (prompt=="TCauthenticateDone") {
        var query;
        if (context=="newuser") {
          query="?context="+context;
        }
        src = base + 'authenticateOK' + query;
      } else if (prompt=="TCresetpw") {
        src = base + 'TCresetpw?email=' + context + '&name=' + name;
      }
      document.getElementById("frame").setAttribute("src", src);
      $('#myModal').modal('show');
    }
  },
  showModal: function() {
    $('#myModal').modal('show');
  },
  closeModal: function() {
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233;
    // ask the database -- if the current user has a FB ac but no local, 
    // then eliminate the stray fb ac
    // $('#myModal').modal('hide');  close in call to server
    window.location="/auth/removeSurplusSM";
  },
  showLogProf: function showLogProf (){
    this.loginFrame = '/auth/profile';
    this.loginFrameHeight = 350;
    $('#myModal').modal('show');
  },
});


module.exports = LoginModalComponent;
