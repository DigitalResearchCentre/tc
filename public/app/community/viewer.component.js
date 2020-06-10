var ElementRef = ng.core.ElementRef
  , CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , $ = require('jquery')
  , async = require('async')
  , OpenSeadragon = require('openseadragon')
  , config = require('../config')
  , BrowserFunctionService = require('../services/functions')
;

var prevSpHeight2;

var ViewerComponent = ng.core.Component({
  selector: 'tc-viewer',
  templateUrl: '/app/community/viewer.html',
  inputs: [
    'community', 'page', 'image', 'document',
  ],
  directives: [
    require('../directives/codemirror'),
    require('../directives/splitter').SPLITTER_DIRECTIVES,
  ]
}).Class({
  constructor: [DocService, UIService, ElementRef, function(
    docService, uiService, elementRef
  ) {
    var self=this;
    this._docService = docService;
    this._uiService = uiService;
    this._elementRef = elementRef;
    this.revisions = [];
    this.smartIndent = false;
    this.contentText = '';
    this.prevs = [];
    this.prevLink = null;
    this.isText=false;
    this.state=uiService.state;
    this.state.doNotParse=false;
//    this.page=this.state.page;
    this.isVerticalSplit=true;
    this.isPreviewText=false;
    this.pageStatus={status:"NONE",access:"NONE"};
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else this.role="NONE";
    if (this.state.authUser.attrs.local && this.state.authUser.attrs.local.email=="peter.robinson@usask.ca") this.role="LEADER";
    this._uiService.sendEditorText$.subscribe(function(data) {
      self.contentText = data.text;
      if (data.choice=="save") {self.saveSend(data.text)}
      if (data.choice=="preview") {self.previewSend(data.text)}
      if (data.choice=="commit") {self.commitSend(data.text)}
    });
    this._uiService.sendCommand$.subscribe(function(chosen){
      //this when we are coming after adding a page
      if (chosen==="commitTranscript") {
        self.state.doNotParse=true;
        self.commit();
      };
      if (chosen==="newTranscript") {
        self.newText();
      };
      if (chosen==="ContinuingTranscript") {
          self.state.isNewContinuingText=true;
          self.setContentText(self.contentText);
      }
      if (chosen==="submitTranscript") {
          self.doSubmitTranscript();
      }
      if (chosen==="previewPrev") {
        self.isPreviewText=true;
        self.showPrev(self.page, self.document);
      }
      if (chosen==="previewNext") {
        self.isPreviewText=true;
        self.showNext(self.page, self.document);
      }
    });
    this._uiService.changeMessage$.subscribe(function(message){
//      console.log(message);
      self._uiService.manageModal$.emit({type: 'info-message', header: "Committing page "+message.page+" in document "+message.docname, message:message.message});
      if (message.type=="commit") self.commitFailed=true;
    });
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self=this
    ;
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else this.role="NONE";
    this.isPrevPage=this.testIsPrevPage(this.page, this.document);
    this.isNextPage=this.testIsNextPage(this.page, this.document);
    //need to check if document is loaded...
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+this.page.attrs.ancestors[0]+'&pageid='+this.page._id, function(res) {
      self.isText=res.isThisPageText;
//      if (res.isPrevPageText && !res.isThisPageText) self.newText(self.page, self.document);
    });
    var community = this.community
      , width = $el.width()
      , height = $el.height()
    ;  //at this point .. if there is no image we can add an image
    var viewer = OpenSeadragon({
      id: 'imageMap',
      prefixUrl: '/images/',
      preserveViewport: true,
      visibilityRatio:    1,
      defaultZoomLevel:   1,
      sequenceMode:       true,
      // TODO:
      // while uploading, we need make:
      // image name as page name, order by name, reorder, rename
    });
    this.viewer = viewer;
    this.onResize();
    this.commitFailed=false;  //reset elsewhere in a very messy piece of programming
    //cqll the image!
    if (this.image) this.onImageChange();
    //var $imageMap = $('.image_map');
    //var options = {zoom: 2 , minZoom: 1, maxZoom: 5};
  },
  register: function(page) {
      //cannot be logged in if you are here!
      this._uiService.manageModal$.emit({
        type:'registerviewer',
        community: this.state.community
      });

  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var options = {
    year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
    };
    return date.toLocaleTimeString("en-us", options);
  },
  onImageChange: function() {
    var viewer = this.viewer;
    if (this.page.attrs.facs && this.page.attrs.facs.startsWith("EXTERNAL:")) {
    	this.image=this.page.attrs.facs;
    	this.imageExternal=this.page.attrs.facs.slice(9);
    } else if (this.image) {
      //could be a iiif reference, or a reference to our own iiif server. If the first, begins http...
      //another possibility: could be direct link to library ms page, which needs to go into an IFRAME. In this, case we start with IFRAME/ followed by image address
      if (this.image.startsWith("http")) var url=this.image;
      else var url=config.IIIF_URL + this.image;
      url=url+'/info.json';    //let's hope all iiif follow the standard
      $.get(url, function(source) {
        if (viewer) viewer.open([source]);
      });
    } else {
      if (viewer) viewer.open([]);
    }
  },
  addPageImage: function(page) {
    this._uiService.manageModal$.emit({
      type: 'edit-page',
      page: page,
    });
  },
  splitHorizontal: function() {
    $('#viewerSplitter').removeClass("horizontal");
    $('#viewerSplitter').addClass("vertical");
    this.isVerticalSplit=false;
  },
  splitVertical: function() {
    $('#viewerSplitter').removeClass("vertical");
    $('#viewerSplitter').addClass("horizontal");
    this.isVerticalSplit=true;
  },
  onResize: function() {
    if (!this.viewer) return;
    var viewport = this.viewer.viewport
      , x = viewport.containerSize.x
      , y = viewport.containerSize.y
      , w = x / 2334
      , h = y / 1479
    ;
    viewport.minZoomImageRatio = w > h ? h / w : 1;
  },
  ngOnChanges: function() {
    var docService = this._docService
      , page = this.page
      , self = this
    ;
    this.state.image=this.image;
    this.imageUnrestricted=BrowserFunctionService.isImageViewable(page, this.state);
    this.pageUnrestricted=BrowserFunctionService.isPageViewable(page, this.state);
    if (!this.state.image) this.image=null;
      //there can be a problem of synchronicity: we could have loaded the document, then changed doc in view.html. BUT
    //call to load pages of document might not have finished, so the state.page points to a page in the previously chosen
    //document. So I think .. we have to do test if this page is among the document pages and delay until it is...
    //ok, in case we have just added document which has no pages yet ... reset page to null to stop attempt to show the pages
    var foundPage=false;
    for (var i=0; i<this.document.attrs.children.length && !foundPage; i++) {
      if (this.document.attrs.children[i].attrs._id==this._uiService.state.page.attrs._id) foundPage=true;
    }
    if (!foundPage) {  //this is a hack...we are still waiting for document pages to load so do it here
      //we might also have added a page, which we have not picked up...
      docService.refreshDocument(this.document).subscribe(function(doc) {
        if (doc.attrs.children.length==0) {
          self.page=null;
          return;
        }
        //look for the page again! if not found...
        for (var i=0; i<doc.attrs.children.length && !foundPage; i++) {
          if (doc.attrs.children[i].attrs._id==self._uiService.state.page.attrs._id) foundPage=true;
        }
        if (foundPage) page=self._uiService.state.page;
        else page = doc.getFirstChild();
        if (self._uiService.state.pageSelected) self._uiService.state.pageSelected.attrs.selected=false;
        self._uiService.state.pageSelected=page;
        page.attrs.selected=true;
        docService.selectPage(page);
        processChanges(docService, page,self)
      });
    } else {
      processChanges(docService, page,self);
    }
  },
  testIsPrevPage: function(page, document) {
    //could be just created the doc, so no pages yet...e
    if (!document) return(false);
    if (!document.attrs.children) return(false);
    if (document.attrs.children.length==0) return(false);
    if (page._id==document.attrs.children[0]._id) return(false);
    else {
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this.prevPage=document.attrs.children[i-1].attrs.name;
          i=document.attrs.children.length;
        }
      }
      return(true);
    }
  },
  showNext: function(page, document){
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[i+1]});
          i=document.attrs.children.length;
        }
      }
  },
  showPrev: function(page, document){
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this._uiService.showDocument$.emit({doc: document, page:document.attrs.children[i-1]});
          i=document.attrs.children.length;
        }
      }
  },
  testIsNextPage: function(page, document) {
    if (!document) return(false);
    if (!document.attrs.children) return(false);
    if (document.attrs.children.length==0) return(false);
    if (page._id==document.attrs.children[document.attrs.children.length-1]._id) return(false);
    else {
      for (var i=0; i<document.attrs.children.length; i++) {
        if (document.attrs.children[i]._id==page._id) {
          this.nextPage=document.attrs.children[i+1].attrs.name;
          i=document.attrs.children.length;
        }
      }
      return(true);
    }
  },
  createDefaultRevisionFromDB: function() {
    var docService = this._docService
      , self = this
      , page = this.page
      , community = this.community.attrs.abbr
      , meta = _.get(
        page, 'attrs.meta',
        _.get(page.getParent(), 'attrs.meta')
      )
    ;
    if (meta) {
      //update base database version
      docService.getTextTree(page).subscribe(function(teiRoot) {
        var isDefault=false;
        var dbRevision = self.json2xml(BrowserFunctionService.prettyTei(teiRoot));
        //now, we only add this to the revision database if we are a leader or CREATOR or member. Else, just throw it in the window and carry on
        if (self.role=="NONE")
          self.setContentText(dbRevision);
        else {
          //we cannot save
          //edit this to turn it to valid empty texts
          var newtext=dbRevision.replace(/(?:\r\n|\r|\n)/g, '');
          var blankpage='<text><pb n="'+self.page.attrs.name+'"/></text>'
            docService.addRevision({
            doc: page.getId(),
            text: dbRevision,
            user: meta.user,
            name: page.attrs.name,
            parent: self.document.attrs.name,
            community: community,
            committed: meta.committed,
            status: 'COMMITTED',
          }).subscribe(function(revision) {
            self.revisions.unshift(revision);
            if (newtext==blankpage) {
              dbRevision='<text>\r<body>\r<pb n="'+self.page.attrs.name+'"/>\r\t<div>\r\t</div>\r</body></text>'
              docService.addRevision({
                doc: page.getId(),
                text: dbRevision,
                user: meta.user,
                name: page.attrs.name,
            	parent: self.document.attrs.name,
                community: community,
                committed: meta.committed,
                status: 'IN_PROGRESS',
              }).subscribe(function(revision) {
                self.revisions.unshift(revision);
                self.setContentText(dbRevision);
                self.revisionChange({
                  target: {value: revision.getId()}
                });
              });
            }  else {
              self.setContentText(dbRevision);
              self.revisionChange({
                target: {value: revision.getId()}
              });
            }
          });
        }
      });
    }
  },
  createNewPageTranscript: function() {
    //have we got text in our transcript? or not?
    this._uiService.manageModal$.emit({
      type: 'edit-new-page',
      page: this.page,
      document: this.document,
      context: this,
    });
  },
  setContentText: function(contentText) {
    //shifted test for new pages, etc, over to
    var self=this, docService=this._docService, page=this.page;
    var community=this.community.attrs.abbr;
    if (this.state.isNewContinuingText) {
      //we have just reset the text to continue from previous page. Here we catch the change, fiddle with it, add the text to revisions and commit
      this.state.isNewContinuingText=false;
      var origText=contentText;
      var meta = _.get(page, 'attrs.meta', _.get(page.getParent(), 'attrs.meta'));
      origText = origText.replace(/(\r\n|\n|\r)/gm,"");
      var re = /(.*[^<])<pb(.*)\/><(.*)/;
      var newText=origText.replace(re, '$1<pb $2/>\r<lb/>Continuing text. (Select a different element in the "From Previous Page" menu to change what is continuing)\r<$3')
        //include specimen text in page after page break; then commit it
  //    context.contentText=newText;
      //need to save the version as a revision too...
  //    this.revisions=this.context.revisions;
      this._docService.addRevision({
        doc: page.getId(),
        text: newText,
        user: meta.user,
        name: page.attrs.name,
        parent: self.document.attrs.name,
        community: community,
        committed: meta.committed,
        status: 'CONTINUEPAGE',
      }).subscribe(function(revision) {
        //propogate on parent page
        self.contentText=newText;
        self.revisions.unshift(revision);
        self.revision=revision;
        self.state.doNotParse=true;
        self.commit('false');
//        self._uiService.sendCommand$.emit("commitTranscript");
      });
    } else {
      //send this to preview window if this is where we are coming from
      this.contentText = contentText;
      if (this.isPreviewText) {
        sendPreviewText (contentText, this, this.page);
        this.isPreviewText=false;
      }
    }
    //here we check the links
    try {
      this.prevLink = docService.checkPagePrevLinks(this.contentText, this.prevs);
    } catch (e) {
      this.prevLink = null;
    }
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+this.page.attrs.ancestors[0]+'&pageid='+this.page._id, function(res) {
      self.isText=res.isThisPageText;
    });
  },
  prevLinkChange: function($event) {
    var id = $event.target.value
      , docService = this._docService
    ;
    try {
      var contentText = docService.relinkPage(
        this.contentText, id, this.prevs);
      if (contentText) {
          this.setContentText(contentText);
      }
    } catch (e) {
    }
  },
  json2xml: function(data) {
    return this._docService.json2xml(data);
  },
  revisionChange: function($event) {
    var id = $event.target.value
      , docService = this._docService
      , revisions = this.revisions
    ;
    var revision = _.find(revisions, function(revision) {
      return revision._id === id;
    });
    var contentText = _.get(revision, 'attrs.text', '');
    this.revision = revision;
    //this is what sets the page link..problem here, if there is no revision this is not called when the page loads!
/*    try {
      this.prevLink = docService.checkPagePrevLinks(contentText, this.prevs);
    } catch (e) {
      this.prevLink = null;
    } */
    this.setContentText(contentText);
  },
  revisionCompareChange: function($event) {
    var revision = this.revisions[$event.target.value];
    //this.contentText = revision.attrs.text;
  },
  save: function() {
      var page = this.page
      , docService = this._docService
      , self = this
      , status =""
      , revision = this.revision
      , text=this.state.editor.getValue()
      , community = this._uiService.state.community.attrs.abbr;
    ;
    //ok..what status do we have? change it if it needs changing
    //let's always change it
    status="IN_PROGRESS";
    if (page.attrs.tasks) {
		for (var i=0; i<page.attrs.tasks.length; i++) {
		  if (page.attrs.tasks[i].userId==this.state.authUser.attrs._id) page.attrs.tasks[i].status=status;
		}
	} else {
		page.attrs.tasks=[];
	}
    $.post(config.BACKEND_URL+'changeTranscriptStatus?'+'pageId='+page.attrs._id+'&status='+status+'&userId='+this.state.authUser.attrs._id+'&communityId='+this.community.attrs._id+'&docId='+this.document.attrs._id, function(res) {
      if (res.error!="none") alert ("Error in changing transcript status: "+res.error.message																																		);
      self.pageStatus.status="IN_PROGRESS"
    });
  //  revision.set('status', status);
    docService.addRevision({
      doc: page.getId(),
      text: text,
      community: community,
      name: page.attrs.name,
      parent: self.document.attrs.name,
      status: status,
    }).subscribe(function(revision) {
      self.revisions.unshift(revision);
      self.revision = revision;
    });
  },
  preview: function() {     //parse first!
    sendPreviewText (this.state.editor.getValue(), this, this.page);
  },
  submitTranscript() {
    var self=this;
    self._uiService.manageModal$.emit({
       type: 'confirm-message',
       header:   "Submitting page "+this.page.attrs.name+" in document "+self.state.document.attrs.name,
       page: this.page,
       docname: self.state.document.attrs.name,
       warning: "You are about to submit this page for approval. You will not be able to edit this page after submitting it.",
       action: "submitTranscript",
       document: self.state.document
     });
  },
  doSubmitTranscript(){
    var self = this
      , docService = this._docService
      , page = this.page
      , community = this._uiService.state.community.attrs.abbr
      , contentText = this.state.editor.getValue();
    ;
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
    }, function(res) {
      if (res.error.length) {
        self._uiService.manageModal$.emit({
            type: 'preview-page', page: page, error: res.error, content: contentText, lines: contentText.split("\n")
        });
      } else {
        var status="SUBMITTED";
        for (var i=0; i<page.attrs.tasks.length; i++) {
          if (page.attrs.tasks[i].userId==self.state.authUser.attrs._id) page.attrs.tasks[i].status=status;
        }
        $.post(config.BACKEND_URL+'changeTranscriptStatus?'+'pageId='+page.attrs._id+'&status='+status+'&userId='+self.state.authUser.attrs._id+'&communityId='+self.community.attrs._id+'&docId='+self.document.attrs._id, function(res) {
          if (res.error!="none") alert ("Error in changing transcript status: "+error);
          self.pageStatus.status="SUBMITTED";
          self.pageStatus.access="NONE";
        });
        //if we have an approver -- tell him/her, and add a task for that person
        var myMembership=self.state.authUser.attrs.memberships.filter(function (obj){return obj.community.attrs._id==self.community.attrs._id;})[0];
        if (myMembership && myMembership.approvermail) {
          $.post(config.BACKEND_URL+'notifyTranscriptApprover?pageId='+page.attrs._id+'&userId='+self.state.authUser.attrs._id+'&approverId='+myMembership.approverid+'&communityId='+self.community.attrs._id+'&documentId='+self.document.attrs._id+'&memberId='+myMembership._id, function(res) {
            if (res.error!="none") alert ("Error in notifying approver: "+error);
            self.pageStatus.status="SUBMITTED";
            self._uiService.manageModal$.emit({
               type: 'info-message',
               header:   "Submitting page "+page.attrs.name+" in document "+self.state.document.attrs.name+" for approval",
               message: "Page "+page.attrs.name+" in document "+self.state.document.attrs.name+" submitted. An email notifying this submission has been sent to your nominated approver "+myMembership.approvername+" ("+myMembership.approvermail+")."
             });
          });
        }
        docService.addRevision({
          doc: page.getId(),
          text: contentText,
          name: page.attrs.name,
          parent: self.document.attrs.name,
          community: community,
          status: status,
        }).subscribe(function(revision) {
          self.revisions.unshift(revision);
          self.revision = revision;
          self._uiService.manageModal$.emit({
             type: 'info-message',
             header:   "Page "+page.attrs.name+" in document "+self.state.document.attrs.name+" submitted.",
             message: "Page validated and submitted."
           });
        });
      }
    })
  },
  approve: function(){
    var self = this
      , docService = this._docService
      , page = this.page
      , community = this._uiService.state.community.attrs.abbr
      , contentText = this.state.editor.getValue();
    ;
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
    }, function(res) {
      if (res.error.length) {
        self._uiService.manageModal$.emit({
            type: 'preview-page', page: page, error: res.error, content: contentText, lines: contentText.split("\n")
        });
      } else {
        var status="APPROVED";
        for (var i=0; i<page.attrs.tasks.length; i++) {
          if (page.attrs.tasks[i].userId==self.state.authUser.attrs._id) page.attrs.tasks[i].status=status;
        }
        $.post(config.BACKEND_URL+'changeTranscriptStatus?'+'pageId='+page.attrs._id+'&status='+status+'&userId='+self.state.authUser.attrs._id+'&communityId='+self.community.attrs._id+'&docId='+self.document.attrs._id, function(res) {
          if (res.error!="none") alert ("Error in changing transcript status: "+error);
          self.pageStatus.status="APPROVED";
          self.pageStatus.access="NONE";
        });
        docService.addRevision({
          doc: page.getId(),
          text: contentText,
          name: page.attrs.name,
          parent: self.document.attrs.name,
          community: community,
          status: status,
        }).subscribe(function(revision) {
          self.revisions.unshift(revision);
          self.revision = revision;
          self._uiService.manageModal$.emit({
             type: 'info-message',
             header:   "Page "+page.attrs.name+" in document "+self.state.document.attrs.name+" approved.",
             message: "Page validated and approved."
           });
        });
      }
    });
  },
  commit: function(parseState) {
      var docService = this._docService
      , page = this.page
      , revision = this.revision
      , contentText = this.state.editor.getValue()
      , community = this.community
      , state = this.state
    ;
    if (parseState=='true') state.doNotParse=false;   //else we don't save when we should
    if (!state.doNotParse && (contentText !== revision.attrs.text)) {
      alert(`You haven't saved this revision yet.`);
      return;
    }
    contentText=removeWhiteSpace(contentText);
      //parse first!
    var self = this;
    this.commitFailed=false;
    $.post(config.BACKEND_URL+'validate?'+'id='+this.state.community.getId(), {
      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
    }, function(res) {
      if (res.error.length) {
        self._uiService.manageModal$.emit({
            type: 'preview-page', page: page, error: res.error, content: contentText, lines: contentText.split("\n")
          });
      }
      if (!res.error.length) {
        if (!state.doNotParse) {
         self._uiService.manageModal$.emit({
            type: 'info-message',
            header:   "Committing page "+page.attrs.name+" in document "+self.state.document.attrs.name,
            message: "Page validated. Now committing"
          });
        }
        docService.commit({
          revision: revision.getId(),
          doc: {
            _id: page.getId(),
            label: page.attrs.label,
            name: page.attrs.name,
            community: self.state.community.attrs.abbr,
          },
          text: contentText,
        } ).subscribe(function(res) {
          //go get these from the db
          if (!state.doNotParse) {
            if (!self.commitFail)
              self._uiService.manageModal$.emit({type: 'info-message', header: "Committing page "+page.attrs.name+" in document "+self.state.document.attrs.name, message: "Page successfully committed. Now updating all collatable entities in the database for this page."});
          }
          if (!self.commitFailed) revision.set('status', 'COMMITTED');
          self.commitFailed=false;
          //update entity status too..
          $.post(config.BACKEND_URL+'getEntities?'+'community='+state.community.attrs.abbr, function(res) {
            state.community.attrs.entities=res.foundEntities;
          });
          $.post(config.BACKEND_URL+'getDocEntities?'+'document='+state.document.attrs._id, function(res) {
            //locate the doc in the state structure and update it
            var thisDoc=state.community.attrs.documents.filter(function (obj){return obj.attrs.name===state.document.attrs.name;})[0];
            thisDoc.attrs.entities=res.foundDocEntities;
            state.doNotParse=false;
          });
          $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+self.page.attrs.ancestors[0]+'&pageid='+self.page._id, function(res) {
            self.isText=res.isThisPageText;
          });
          $.post(config.BACKEND_URL+'changeTranscriptStatus?'+'pageId='+self.page.attrs._id+'&status=COMMITTED&userId='+self.state.authUser.attrs._id+'&communityId='+self.community.attrs._id+'&docId='+self.document.attrs._id, function(res) {
            if (res.error!="none") alert ("Error in changing transcript status: "+res.error);
            self.pageStatus.status="COMMITTED";
          });
          if (self.state.community.attrs.rebuildents) {
			  $.get(config.host_url+'/uri/urn:det:tc:'+config.authority+':'+self.community.attrs.abbr+'/entity=*:document='+self.document.attrs.name+':'+self.page.attrs.label+'='+self.page.attrs.name, function(entities) {
				  async.map(entities, function (entity, cb1) {
					if (entity.collateable) {
					  $.get(config.BACKEND_URL+"cewitness/?witness="+self.document.attrs.name+"&community="+self.community.attrs.abbr+"&entity="+entity.entity+"&override=true", function (json, status) {
						cb1(null)
					  });
					} else {cb1(null)}
				  }, function (err, results) {
					self._uiService.manageModal$.emit({type: 'info-message', header: "Committing page "+page.attrs.name+" in document "+self.state.document.attrs.name, message: "Page successfully committed. All collatable entities in the database for this page updated. \r(Turn off entity updating at Manage-->Collation-->Rebuild Collation Entities on Commit)"});
				  })
			  });
		  } else {
			self._uiService.manageModal$.emit({type: 'info-message', header: "Committing page "+page.attrs.name+" in document "+self.state.document.attrs.name, message: "Page successfully committed. \r(Turn on entity updating at Manage-->Collation-->Rebuild Collation Entities on Commit)"});
		  }
        });
      }
    });
  },
  toggleTop: function() {
/*    if (this.state.showTop) prevSpHeight2=$('#TCSplitterTOC').height();
    else {
      prevSpHeight2-=260;
      $('#TCSplitterTOC').height(prevSpHeight2+"px");
    } */
    this.state.showTop=!this.state.showTop;
  },
  toggleSide: function() {
    this.state.showSide=!this.state.showSide;
  },
  returnTranscript: function (page, document) {
    var self=this;
    var transcriberId;
    //find the task record, set back to assigned for the transcriber, eliminate submitted record
    //get info
    for (var i=0; i<page.attrs.tasks.length; i++) {
      if (page.attrs.tasks[i].status=="SUBMITTED") {  //a hack...first submitted task MUST be submitted by user
  //      if (String(this.state.authUser.attrs._id)!=String(page.attrs.tasks[i].userId))
          transcriberId=page.attrs.tasks[i].userId;
          break;
      }
    }
    //now change in the database and send a message to the user
    $.post(config.BACKEND_URL+'getTranscribersInf?'+'pageId='+page.attrs._id+'&approverId='+this.state.authUser.attrs._id+'&transcriberId='+transcriberId+'&communityId='+this.community.attrs._id+'&docId='+document.attrs._id, function (res) {
      if (res.result=="1") {
        self._uiService.manageModal$.emit({
          type: 'message-transcriber',
          community:   self.state.community,
          approver: self.state.authUser,
          transcriberEmail: res.transcriberEmail,
          transcriberName: res.transcriberName,
          leaders: res.leaders,
          document: document,
          context: self,
          page: page
        });
      }
    })
  },
  newText: function(page, document) {
    var self=this;
    $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+self.page.attrs.ancestors[0]+'&pageid='+self.page._id, function(res) {
      if (res.isPrevPageText) {
        self._uiService.manageModal$.emit({
           type: 'confirm-message',
           page: page,
           prevpage: self.prevPage,
           docname: "",
           header: "Add text to page "+self.page.attrs.name+" in "+self.state.document.attrs.name,
           warning: "Continue text from previous page or add new text.",
           action: 'addPage',
           document: document,
           context: self,
         });
      } else {
        self._uiService.manageModal$.emit({
          type: 'edit-new-page',
          page: self.page,
          document: self.document,
          context: self,
        });
      }
    });
  },
});

function processChanges(docService, page,self) {
  self.isPrevPage=self.testIsPrevPage(self.page, self.document);
  self.isNextPage=self.testIsNextPage(self.page, self.document);
  self.contentText = '';
  //change url in address bar
  var obj = { Title: self.document.attrs.name+":"+page.attrs.name, Url: '/app/community/?id='+self.state.community._id+'&route=view&document='+self.document._id+'&page='+page._id };
  history.pushState(obj, obj.Title, obj.Url);
  //have to get the links first, else revision does not update links menu correctly
  self.pageStatus=isPageAssigned(page,self.state.authUser, self.role);
  docService.getLinks(page).subscribe(function(links) {//this could bring back white space or other such muck. Filter out the end of the links to catch only entities
    if (links.prevs.length>0) while (links.prevs.length>0 && ((typeof links.prevs[links.prevs.length-1].isEntity=="undefined") || (!links.prevs[links.prevs.length-1].isEntity))) {links.prevs.pop()};
    self.prevs = links.prevs;
    docService.getRevisions(page).subscribe(function(revisions) {
      //this is a temporary fix, in case where we inadvertently wiped out Barbara's user id
      for (var i=0; i<revisions.length; i++) {if (!revisions[i].attrs.user) revisions[i].attrs.user={local:{name:"Barbara Bordalejo"}}};
      self.revisions = revisions;
      if (_.isEmpty(revisions)) {
        //here is where we choose.. either make it an empty page i
        self.createDefaultRevisionFromDB();
      } else {
        self.revisionChange({target: {value: _.first(revisions).getId()}});
      }
    });
  });
  $.post(config.BACKEND_URL+'statusTranscript?'+'docid='+self.page.attrs.ancestors[0]+'&pageid='+self.page._id, function(res) {
    if (self.revisions.length>0) {
      self.isText=true;
    } else {
      self.isText=res.isThisPageText;
      if (res.isPrevPageText && !res.isThisPageText) self.newText(self.page, self.document);
    }
  });
  self.onImageChange();
}

function isPageAssigned(page, user, role) {
  if (!page.attrs.tasks || !page.attrs.tasks.length) return({status: "NONE", access: "NONE"});
  for (var i=0; i<page.attrs.tasks.length; i++) {
    if (page.attrs.tasks[i].userId==user.attrs._id) {  //that was = not ==!!!! dumb
      //ok, task is addressed at this member. But depending on where it is in the cycle -- may not be assigned
      if (page.attrs.tasks[i].status=="ASSIGNED" && (role=="MEMBER" || role== "APPROVER")) return({status: "ASSIGNED", access: "ASSIGNED"});
      if (page.attrs.tasks[i].status=="IN_PROGRESS" && (role=="MEMBER" || role== "APPROVER")) return({status: "IN_PROGRESS", access: "ASSIGNED"});
      if (page.attrs.tasks[i].status=="SUBMITTED" && role=="APPROVER") return({status: "SUBMITTED", access: "ASSIGNED"});
    } else if (role=="LEADER"||role=="CREATOR") {
      if (page.attrs.tasks[i].status=="SUBMITTED") return ({status: "SUBMITTED", access: "ASSIGNED"});
    }
  }
  return({status: "NONE", access: "NONE"});  //default...nothing
}

function removeWhiteSpace(contentText){ //needed coz Xiaohan's getLeftTextBound etc doesn't like the extra space
//possibly because we changed his loader to preserve white space in some contexts (within content elements etc)
//problem.. at end of page we take out last character. Not clever
  contentText=contentText.trim();
  var stop=false;
  var endString="", startString="", i=0, j=0;
  //remove space from start
  for (j=0; j<contentText.length && !stop; j++) {
    if (contentText.charCodeAt(j) > 32) { //not white space...
      if (contentText[j]=="<") {
        var thisTag="";
        while (contentText[j]!=">") thisTag=thisTag+contentText[j++];
        thisTag=thisTag+">";
        startString=startString+thisTag;
        if (thisTag[1]=="/") stop=true;
      } else {
        stop=true;
      }
    }
  }
  stop=false;
  for (i=contentText.length; i>0 && !stop; i-- ) {
    if (contentText.charCodeAt(i) > 32) { //not white space...
        if (contentText[i]==">") {
          var thisTag="";
          while (contentText[i]!="<") thisTag=contentText[i--]+thisTag;
          thisTag="<"+thisTag;
          endString=thisTag+endString;
          if (thisTag[1]!="/") stop=true;
        } else {
          stop=true;
        }
    }
  }
  return (startString+contentText.slice(j-1, i+2)+endString);  //was losing last character of the page
}

function sendPreviewText (contentText, context, page) {
  $.post(config.BACKEND_URL+'validate?'+'id='+context.state.community.getId(), {
    xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+contentText+"</TEI>",
  }, function(res) {
    context._uiService.manageModal$.emit({
        type: 'preview-page',
        document: context.document,
        prevpage: (context.isPrevPage) ? context.prevPage:false,
        nextpage: (context.isNextPage) ? context.nextPage:false,
        page: page,
        error: res.error,
        content: contentText,
        lines: contentText.split("\n")
      });
  });
}



module.exports = ViewerComponent;
