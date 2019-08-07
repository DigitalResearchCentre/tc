;var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , RESTService = require('./services/rest')
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
    require('./adddocumentiiif.component'),
    require('./editnewpage.component'),
    require('./extractxmldoc.component'),
    require('./joincommunity.component'),
    require('./viewmembers.component'),
    require('./previewpage.component'),
    require('./parsexmlload.component'),
    require('./messagelogin.component'),
    require('./editpage.component'),
    require('./community/uploadfile.component'),
    require('./infomessage.component'),
    require('./confirmmessage.component'),
    require('./adddocumentchoice.component'),
    require('./reorderdocument.component'),
    require('./addbulkimages.component'),
    require('./editcollation.component'),
    require('./addzip.component'),
    require('./addiiif.component'),
    require('./assignpages.component'),
    require('./changerole.component'),
    require('./assignapprover.component'),
    require('./invitemember.component'),
    require('./viewallusers.component'),
    require('./viewallcommunities.component'),
    require('./exporttc1users.component'),
    require('./exporttc1transcripts.component'),
    require('./messagetranscriber.component'),
    require('./transcriberhistory.component'),
    require('./exporttc1dbversion.component'),
    require('./community/getdocinf.component'),
    require('./createdefaulttranscripts.component'),
    require('./retrievecollation.component'),
    require('./makenexuscollation.component'),
    require('./restoredocument.component'),
    require('./changecontrol.component'),
    require('./choosechange.component'),
    require('./registerviewer.component')
  ]
}).Class({
  constructor: [CommunityService, UIService, RESTService, function(communityService, uiService, restService) {
    this._uiService = uiService;
    this.restService=restService;
/*    $('#manageModal').resizable(
      { handleSelector: ".win-size-grip",
        onDragStart: function (e, $el, opt) {
        $el.css("cursor", "nwse-resize")}
      }); */
/*
    this.loginFrame = '/auth?url=/index.html#/home';
    this.loginFrameHeight = 233; */
  }],
  ngOnInit: function() {
    var self = this;
    this._uiService.manageModal$.subscribe(function(event) {
      // 'add-document' || 'add-document-page' || 'add-xml-document' || 'edit-new-page' || 'extract-xml-doc'
      self.choice = event || 'add-document';
      if (event.type === 'extract-xml-doc') {
        self.choice = event.type;
        self.document = event.document;
      }
      if (event.type === 'add-document') {
        self.choice = event.type;
      }
      if (event.type === 'add-bulk-images') {
        self.choice = event.type;
        self.document = event.document;
      }
      if (event.type === 'add-document-choice') {
        self.choice = event.type;
      }
      if (event.type === 'add-document-page') {
        self.choice = event.type;
        self.afterPage = event.afterPage;
        self.document = event.document;
        self.page = event.page;
        self.docParent = event.parent;
        self.docAfter = event.after;
        self.multiple = event.multiple;
      } else if (event.type === 'edit-page') {
        self.choice = event.type;
        self.page = event.page;
      } else if (event.type === 'add-zip') {
        self.choice = event.type;
        self.document = event.document;
      } else if (event.type === 'add-iiif') {
        self.choice = event.type;
        self.document = event.document;
      } else if (event.type === 'edit-new-page') {
        self.choice = event.type;
        self.page = event.page;
        self.context = event.context;
        self.document = event.document;
      } else if (event.type === 'message-login') {
        self.choice = event.type;
        self.community = event.community;
      } else if (event.type === 'add-xml-document') {
        self.choice = event.type;
        self.community = event.community;
      } else if (event.type === 'add-IIIF-document') {
        self.choice = event.type;
        self.community = event.community;
      } else if (event.type === 'message-login') {
        self.choice = event.type;
        self.community = event.community;
      }  else if (event.type === 'uploadfile-community') {
        self.choice = event.type;
        self.community = event.community;
        self.filetype = event.filetype;
        if (event.filetype=="css") {
            if (!event.community.attrs.css || event.community.attrs.css=="") {
              self.restService.http.get('/app/data/default.css').subscribe(function(cssfile) {
                self.text=cssfile._body;});
            } else self.text=event.community.attrs.css;
        }
        if (event.filetype=="js") {
            if (!event.community.attrs.js || event.community.attrs.js=="") {
              self.restService.http.get('/app/data/default.js').subscribe(function(jsfile) {
                self.text=jsfile._body;});
            } else self.text=event.community.attrs.js;
        }
        if (event.filetype=="dtd") {
            if (!event.community.attrs.dtd || event.community.attrs.dtd=="") {
              self.restService.http.get('/app/data/default.dtd').subscribe(function(dtdfile) {
                self.text=dtdfile._body;});
            } else self.text=event.community.attrs.dtd;
        }
        if (event.filetype=="json") {
            if (!event.community.attrs.ceconfig || event.community.attrs.ceconfig=={}) {
              self.restService.http.get('/app/data/CollEditorConfig.json').subscribe(function(ceconfigfile) {
                self.text=ceconfigfile._body;});
            } else self.text=JSON.stringify(event.community.attrs.ceconfig);
        }
        if (event.filetype=="teiHeader") {
            self.text="";
            self.doc=event.document;
        }
      }  else if (event.type === 'preview-page') {
          self.choice = event.type;
          self.page = event.page;
          self.document = event.document;
          self.prevpage = event.prevpage;
          self.nextpage = event.nextpage;
          self.error = event.error;
          self.content = event.content;
          self.lines = event.lines;
      }  else if (event.type === 'join-community') {
          self.community = event.community;
          self.choice = event.type;
          if (event.status=="alldolead") self.communityleader=null;
          else self.communityleader=event.communityleader;
          self.status=event.status;
      } else if (event.type === 'parse-xmlload') {
          self.choice = event.type;
          self.error = event.error;
          self.lines = event.lines;
          self.docname = event.docname;
      } else if (event.type ==='info-message'){
          self.choice = event.type;
          self.header=event.header;
          self.message=event.message;
          self.source=event.source;
      } else if (event.type ==='reorder-document'){
          self.choice = event.type;
          self.document=event.document;
      } else if (event.type ==='choosebase-community'){
          self.choice = event.type;
          self.community=event.community;
          self.action='chooseBase';
      } else if (event.type ==='choosebase-choosewitnesses'){
          self.choice = 'choosebase-community';  //let's be economical!
          self.community=event.community;
          self.action='chooseWitnesses';
      } else if (event.type ==='assign-pages'){
          self.choice = 'assign-pages';  //let's be economical!
          self.user=event.user;
          self.community=event.community;
          self.source=event.source;
          self.memberId=event.memberId;
      } else if (event.type ==='transcriber-history'){
          self.choice = 'transcriber-history';  //let's be economical!
          self.userid=event.userid;
          self.username=event.username;
          self.community=event.community;
      } else if (event.type ==='confirm-message'){
          self.choice = event.type;
          self.page=event.page;
          self.docname=event.docname;
          self.prevpage=event.prevpage;
          self.header=event.header;
          self.warning=event.warning;
          self.action=event.action;
          self.document=event.document;
          self.context=event.context;
      } else if (event.type ==='change-role'){
        self.choice=event.type,
        self.member=event.member,
        self.user=event.user,
        self.role=event.role,
        self.community=event.community
      } else if (event.type ==='assign-approver'){
        self.choice=event.type,
        self.member=event.member,
        self.user=event.user
      } else if (event.type ==='invite-member'){
        self.choice=event.type,
        self.community=event.community,
        self.inviter=event.inviter,
        self.role=event.role
      } else if (event.type ==='message-transcriber'){
        self.choice=event.type,
        self.community=event.community,
        self.approver=event.approver,
        self.transcriberEmail=event.transcriberEmail,
        self.transcriberName=event.transcriberName,
        self.leaders=event.leaders,
        self.context=event.context,
        self.document=event.document,
        self.page=event.page
      }
      else if (event.type ==='view-allusers'){
        self.choice=event.type
      }
      else if (event.type ==='view-allcommunities'){
        self.choice=event.type
      }
      else if (event.type ==='export-tc1users'){
        self.choice=event.type
      }
      else if (event.type ==='export-tc1transcripts'){
        self.choice=event.type
      }
      else if (event.type ==='export-tc1dbversion'){
        self.choice=event.type
      }
      else if (event.type ==='create-defaulttranscripts'){
        self.choice=event.type
      }
      else if (event.type ==='retrievecollation'){
        self.choice=event.type;
        self.community=event.community;
      }
      else if (event.type ==='makenexuscollation'){
        self.choice=event.type;
        self.community=event.community;
      } else if (event.type ==='restoredocument') {
        self.choice=event.type;
        self.document=event.document;
        self.community=event.community;
        self.docid=event.docid;
        self.docname=event.docname;
      } else if (event.type ==='getdocinf'){
        self.choice=event.type;
        self.document=event.document;
        self.community=event.community;
      } else if (event.type ==='changeControl'){
        self.choice=event.type;
        self.context=event.context;
        self.ctype=event.ctype;
        self.community=event.community;
        self.parent=event.parent;
        self.document=event.document;
        self.docname=event.docname;
      } else if (event.type ==='choosechange'){
        self.choice=event.type;
        self.context=event.context;
        self.community=event.community;
        self.parent=event.parent;
        self.docname=event.docname;
        self.document=event.document;
      } else if (event.type ==='registerviewer'){
        self.choice=event.type;
        self.community=event.community;
      }
      $('#manageModal').modal('show');
    });
  },
});


module.exports = ManageModalComponent;
