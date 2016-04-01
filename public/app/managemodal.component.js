var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , AuthService = require('./auth.service')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var ManageModalComponent = ng.core.Component({
  selector: 'tc-manage-modal',
  templateUrl: '/app/managemodal.html',
  directives: [
    require('./adddocument.component'),
    require('./addpage.component'),
    require('./adddocumentxml.component'),
    require('./editnewpage.component'),
    require('./extractxmldoc.component'),
    require('./joincommunity.component'),
    require('./viewmembers.component'),
    require('./previewpage.component')
  ],
}).Class({
  constructor: [CommunityService, AuthService, UIService, function(communityService, authService, uiService) {
    this._uiService = uiService;
/*
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233; */
  }],
  ngOnInit: function() {
    var self = this;
    this._uiService.manageModal$.subscribe(function(event) {
      // 'add-document' || 'add-document-page' || 'add-xml-document' || 'edit-new-page' || 'extract-xml-doc'
      self.choice = event || 'add-document';
      if (event.type === 'add-document-page') {
        self.choice = event.type;
        self.docParent = event.parent;
        self.docAfter = event.after;
      } else if (event.type === 'edit-new-page') {
        self.choice = event.type;
        self.page = event.page;
      }  else if (event.type === 'preview-page') {
          self.choice = event.type;
          self.page = event.page;
      }  else if (event.type === 'join-community') {
            self.community = event.community;
            self.choice = event.type;
            if (event.status=="alldolead") self.communityleader=null;
            else self.communityleader=event.communityleader;
            self.status=event.status;
      }
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
