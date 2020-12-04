var CommunityService = require('../services/community')
  , Viewer = require('./viewer.component')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , RestService = require('../services/rest')
  , UpdateDbService = require('../services/updatedb')
  , config = require('../config')
  , async = require('async')
  , $ = require('jquery')
  , BrowserFunctionService = require('../services/functions')
;

var prevHeight;

var ViewComponent = ng.core.Component({
  selector: 'tc-community-view',
  templateUrl: '/app/community/view.html',
  styleUrls: ['/app/community/view.css'],
  directives: [
  /*  require('../directives/tabs').TAB_DIRECTIVES, */
    require('../directives/splitter').SPLITTER_DIRECTIVES,
    Viewer,
  ],
/*  queries: {
    viewer: new ng.core.ViewChild(Viewer),
  }, */
}).Class({
  constructor: [CommunityService, UIService, DocService, RestService, function(
    communityService, uiService, docService, restService
  ) {
//    console.log('community view');
    var self=this;
    this._uiService = uiService;
    this._communityService = communityService;
    this._docService = docService;
    this._restService = restService
    this.state = uiService.state;
    this.state.showSide=true;
    this.showByPage=true;
    this.versions=[];
    this._uiService.choosePage$.subscribe(function (doc) {
      self.toggleDoc(doc);
    });
    this._uiService.showDocument$.subscribe(function (docpage) {
      self.selectDocPage(docpage.doc, docpage.page);
    });
    this.collationEditor=false;
    this.callCollationEditor='';
   $.get(config.BACKEND_URL+'getDocNames/?community='+this.state.community._id, function(res) {
      self.docnames=res;
      for (var i=0; i<self.state.community.attrs.documents.length; i++) {
        self.state.community.attrs.documents[i].attrs.name=res[i].name;
        if (Object.keys(res[i].control).length>0) self.state.community.attrs.documents[i].attrs.control=res[i].control;
        self.state.community.attrs.documents[i].isDocImageTranscriptLocked=self.checkDocImageTranscriptLocked(self.state.community.attrs.documents[i]);
        if (self.state.community.attrs.documents[i].attrs.children.length==0 && res[i].npages!=0)
          self.state.community.attrs.documents[i].attrs.children[0]={attrs:"dummy"}  //idea is to force not to show add page if we have pages */
      }
    });
    $( window ).resize(function() {
      var tcWidth=$('#tcPaneViewer').width();
      var tcHeight=$('#tcPaneViewer').height();
      $('#CXcontainer').width(tcWidth);
      $('#tcVersions').height(tcHeight);
      var thisHeight=$(window).height();
      var tcHeight2=$('#TCSplitterTOC').height()+thisHeight-prevHeight;
      prevHeight=thisHeight;
      $('#TCSplitterTOC').height(tcHeight2+"px");
    });
  }],
  ngOnInit: function() {
    if (this.state.community.attrs.entities.length>0 && this.state.community.attrs.entities[0].attrs.name=="") {
      var self=this;
      if (confirm('The entity list in the "'+this.state.community.attrs.name+'" commmunity has been corrupted. Click OK to repair it.')) {
        //do the repair here...
        $.get(config.BACKEND_URL+'repairEntities/?community='+this.state.community.attrs.abbr, function(res) {
            var i=0;
            for (i=0; i<res.foundEntities.length; i++) {
              if (i<self.state.community.attrs.entities.length) {
                self.state.community.attrs.entities[i].attrs.name=res.foundEntities[i].name;
                self.state.community.attrs.entities[i].attrs.entityName=res.foundEntities[i].entityName;
              } else self.state.community.attrs.entities.push({name:res.foundEntities[i].name, entityName:res.foundEntities[i].entityName});
            }
            if (i<self.state.community.attrs.entities.length) {
              while (i<self.state.community.attrs.entities.length) {
                self.state.community.attrs.entities.pop();
              }
            }
            alert("Entity list repaired.")
        });
      }
    }
    if (this.state.community.attrs.rebuildents==undefined) {
    	this.state.community.attrs.rebuildents=false;
    	this._communityService.createCommunity(this.state.community.attrs).subscribe(function(community) {
    	  //all ok
    	},function(err) {
            if (err) alert(err.json().message);
        });
     }
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
          this.state.role=this.role;
          this.GAid=this.state.authUser._id;
      }
    } else {this.state.role="NONE"; this.role="NONE"; this.GAid="VISITOR"}
    if (this.state.authUser.attrs.local && this.state.authUser.attrs.local.email=="peter.robinson@usask.ca") {this.state.role="LEADER"; this.role="LEADER";}
//    $('#TCsidebar').height(tcheight);
  },
  ngAfterViewInit: function() {
    //because Angular removes script tags from templates..
     var s = document.createElement("script");
     s.type = "text/javascript";
     s.innerHTML="gtag('set', {'user_id': '"+this.GAid+"'});";
     document.body.appendChild(s);
 },
  ngAfterViewChecked: function(){
    var tcheight=$(window).height()-$("tc-header").height()-$("tc-manage-community").height()-$("nav").height();
    $('#TCSplitterTOC').height(tcheight);
    prevHeight=$(window).height();
    //check if the documents are loaded...when they are set up access control and other important variables
    // this is to remove all instances of function calls from the html...
  },
  ngOnChanges: function() {
    var docEl=document.getElementsByClassName("selected")[0];
    if (docEl) docEl.scrollIntoView(true);
  },
  onResize: function($event) {
    var tcWidth=$('#tcPaneViewer').width();
    var tcHeight=$('#tcPaneViewer').height();
    $('#CXcontainer').width(tcWidth);
    $('#tcVersions').height(tcHeight);
    var tcheight=$("tc-community-view")[0].clientHeight+"px";
  },
  changeAccess: function(doc) {
    this._uiService.manageModal$.emit({type: "choosechange", context: this, community: this.state.community, parent:"DOCUMENT", document: doc, docname:""});
  },
  changePageAccess: function(doc) {
    this._uiService.manageModal$.emit({type: "choosechange", context: this, community: this.state.community, parent:"PAGE", document: doc, docname:this.state.document.attrs.name});
  },
  checkDocImageTranscriptLocked: function(doc) {
    //is the community locked?
    if (this.role=="CREATOR" || this.role=="LEADER") return false;   //always veiwable
    if (this.role=="NONE") {
        if (doc.attrs.control && doc.attrs.control.images=="ALL" && doc.attrs.control.transcripts=="ALL") return false;
        if (doc.attrs.control && (doc.attrs.control.images!="ALL" || doc.attrs.control.transcripts!="ALL")) return true;
        if (this.state.community.attrs.control.images=="ALL" && this.state.community.attrs.control.transcripts=="ALL") return false;
        if (this.state.community.attrs.control.images!="ALL" || this.state.community.attrs.control.transcripts!="ALL") return true;
        return true;
    }
    if (this.role=="VIEWER") {
          if ((doc.attrs.control && doc.attrs.control.images=="ALL" || doc.attrs.control && doc.attrs.control.images=="VIEWERS") && (doc.attrs.control.transcripts=="ALL" || doc.attrs.control.transcripts=="VIEWERS")) return false;
          if ((this.state.community.attrs.control.images=="ALL" || this.state.community.attrs.control.images=="VIEWERS") && (this.state.community.attrs.control.transcripts=="ALL" || this.state.community.attrs.control.transcripts=="VIEWERS")) return false;
          return true;
      }
    if (this.role=="MEMBER") {
        if ((doc.attrs.control && doc.attrs.control.images=="ALL" || doc.attrs.control && doc.attrs.control.images=="VIEWERS" || doc.attrs.control && doc.attrs.control.images=="MEMBERS") && (doc.attrs.control.transcripts=="ALL" || doc.attrs.control.transcripts=="VIEWERS" || doc.attrs.control && doc.attrs.control.images=="MEMBERS")) return false;
        if ((this.state.community.attrs.control.images=="ALL" || this.state.community.attrs.control.images=="VIEWERS"  || this.state.community.attrs.control.images=="MEMBERS") && (this.state.community.attrs.control.transcripts=="ALL" || this.state.community.attrs.control.transcripts=="VIEWERS" || this.state.community.attrs.control.transcripts=="MEMBERS")) return false;
        return true;
    }
  },
  stateImageAccess: function(doc) {
    var message="";
    message+="<b>Access to images.</b><br>"
    if (this.state.community.attrs.control) {
      message+="<i>Community</i>: ";
      if (this.state.community.attrs.control.imsg!="") message+=adjustMessage(this.state.community.attrs.control.imsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="no restrictions defined<br>"
    if (doc.attrs.control) {
      message+="<i>Document</i>: ";
      if (doc.attrs.control.imsg!="") message+=adjustMessage(doc.attrs.control.imsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="no restrictions defined<br>"
    message+="<b>Access to transcripts.</b> <br>"
    if (this.state.community.attrs.control) {
      message+="<i>Community</i>: ";
      if (this.state.community.attrs.control.tmsg!="") message+=adjustMessage(this.state.community.attrs.control.tmsg)+ "\r";
      else message+="no restrictions defined <br>";
    } else message+="no restrictions defined <br>";
    if (doc.attrs.control) {
      message+="<i>Document</i>: ";
      if (doc.attrs.control.tmsg!="") message+=adjustMessage(doc.attrs.control.tmsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="no restrictions defined<br>"
    this._uiService.manageModal$.emit({
      type: 'info-message',
      header:"Access control for document "+doc.attrs.name,
      message: message,
      source: "accessControl"
    });
  },
  statePageImageAccess: function(page) {
    var message="";
    var doc=this.state.document;
    message+="<b>Access to images.</b><br>"
    if (this.state.community.attrs.control) {
      message+="<i>Community</i>: ";
      if (this.state.community.attrs.control.imsg!="") message+=adjustMessage(this.state.community.attrs.control.imsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="<i>Community</i>: no restrictions defined<br>"
    if (doc.attrs.control) {
      message+="<i>Document</i>: ";
      if (doc.attrs.control.imsg!="") message+=adjustMessage(doc.attrs.control.imsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="<i>Document</i>: no restrictions defined<br>"
    if (page.attrs.control) {
      message+="<i>Page</i>: ";
      if (page.attrs.control.imsg!="") message+=adjustMessage(page.attrs.control.imsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="<i>Page</i>: no restrictions defined<br>"
    message+="<b>Access to transcripts.</b> <br>"
    if (this.state.community.attrs.control) {
      message+="<i>Community</i>: ";
      if (this.state.community.attrs.control.tmsg!="") message+=adjustMessage(this.state.community.attrs.control.tmsg)+ "\r";
      else message+="no restrictions defined <br>";
    } else message+="<i>Community</i>: no restrictions defined <br>";
    if (doc.attrs.control) {
      message+="<i>Document</i>: ";
      if (doc.attrs.control.tmsg!="") message+=adjustMessage(doc.attrs.control.tmsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="<i>Document</i>: no restrictions defined<br>"
    if (page.attrs.control) {
      message+="<i>Page</i>: ";
      if (page.attrs.control.tmsg!="") message+=adjustMessage(page.attrs.control.tmsg)+ "<br>";
      else message+="no restrictions defined<br>"
    } else message+="<i>Page</i>: no restrictions defined<br>"
    this._uiService.manageModal$.emit({
      type: 'info-message',
      header:"Access control for document "+doc.attrs.name,
      message: message,
      source: "accessControl"
    });
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
    if (doc.expand) {
     this.selectDoc(doc);
  //refresh the document...
    }
  },
  showAddFirstPage: function(doc) {
    return doc &&  _.isEmpty(_.get(doc, 'attrs.children'));
  },
  restoreDoc(doc) {
    this._uiService.manageModal$.emit({
      type:'restoredocument', document:doc, docid: doc._id, community: this.state.community.attrs.name, docname: doc.attrs.name
    });
  },
  showAddPage: function(page, doc) {
    return (page._id==doc.attrs.children[doc.attrs.children.length-1]._id)
  },
  pageHasImage: function(page) {
    if (page.attrs.image) return true;
    else return false;
  },
  docLacksImages: function(document) {
    if (document.attrs.children.length==0) return(true);
    for (var i = 0; i < document.attrs.children.length; i++) {
      if (!document.attrs.children[i].attrs.image) return(true);
    }
    return(false);
  },
  adjustSelect: function(doc, self) {
    self._docService.selectDocument(doc);
    removeAllSelected(self, self.state.document.attrs.children[0]);
    //we check whether each page is available.. only have to do this is we are not a leader or a creator
    self.state.document.attrs.children[0].attrs.selected=true;
    //set attributes for locked or not on each page
    if (self.role != "CREATOR" && self.role != "LEADER") {
      if (!self.state.document.attrs.pagesChecked) {
        for (var i=0; i<self.state.document.attrs.children.length; i++) {
          self.state.document.attrs.children[i].isPageITlocked=BrowserFunctionService.isPageImageTranscriptLocked(self.state.document.attrs.children[i], self.state);
        }
      }
      self.state.document.attrs.pagesChecked=true;
    }
  },
  selectDoc: function(doc) {
    var self=this;
    if (doc.attrs=="dummy" || doc.attrs.children[0].attrs=="dummy" || !state.document || state.document.attrs.requested) { //not yet flly loaded
      this._docService.refreshDocument(doc).subscribe(function(mydoc) {
        self.adjustSelect(mydoc, self);
      });
    } else {
        this.adjustSelect(doc, this);
    }
  },
  selectPage: function(page) {
    removeAllSelected(this, page);
    page.attrs.selected=true;
    this._docService.selectPage(page);
  },
  selectDocPage: function(doc, page) {
    this._docService.selectDocument(doc);
    this._docService.selectPage(page);
    removeAllSelected(this, page);
    page.attrs.selected=true;
  },
  addIIIFImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-iiif',
      document: doc,
    });
  },
  addZipImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-zip',
      document: doc,
    });
  },
  addFirstPage: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-document-page',
      document: doc,
      page: null,
      afterPage: false,
      parent: doc,
      multiple: false
    });
  },
  editPageImage: function(page) {
    this._uiService.manageModal$.emit({
      type: 'edit-page',
      page: page,
    });
  },
  addBulkImages: function(doc) {
    this._uiService.manageModal$.emit({
      type: 'add-bulk-images',
      document: doc,
    });
  },
  addPageAfter: function(page, doc) {
    var self=this
    , docService = this._docService;
    this._uiService.manageModal$.emit({
     type: 'add-document-page',
     page: page,
     document: doc,
     afterPage: true,
     after: page,
     multiple: false
   });
  },
  addDocument: function() {
    this._uiService.manageModal$.emit("add-document-choice");
  },
  toggleEntities: function(entity) {
    entity.expand = !entity.expand;
    if (entity.expand) {
      if (entity.attrs) var entName=entity.attrs.entityName;
      else var entName=entity.entityName;
      $.post(config.BACKEND_URL+'getSubEntities?'+'ancestor='+entName, function(res) {
        entity.entities=res.foundEntities;
      });
    }
  },
  toggleDocEntities: function(docEntity) {
    docEntity.expand = !docEntity.expand;
    if (docEntity.expand) {
      $.post(config.BACKEND_URL+'getSubDocEntities?'+'id='+docEntity.tei_id, function(res) {
        docEntity.entities=res.foundTEIS;
      });
    }
  },
  selectEntity: function(entity) {
    //go get the different versions; collate them; yoho!
    //we just supply the url for the collation editor and it does the rest. hooray.
    //we will add some choices to the community menu: to choose default collation tool (collateX..collation editor..multiple text viewer)
    //send community settings for show capitalization, etc
    var self=this;
    this.collationEditor=true;
    var pages=this.state.community.attrs.documents.map(function(page){return(page.attrs.name)});
    if (!this.state.community.attrs.ceconfig.base_text)  {
      this._uiService.manageModal$.emit({type: 'info-message', message: "You have not chosen a base text for collation in community \""+this.state.community.attrs.abbr+"\". Choose a base text from the Manage>Collation menu.", header:"Base text not chosen in collation", source: "CollationBase"});
      return;
    }
    var isBaseDoc=this.state.community.attrs.documents.filter(function (obj){return obj.attrs.name==this.state.community.attrs.ceconfig.base_text})[0];
    if (!isBaseDoc) {
      this._uiService.manageModal$.emit({type: 'info-message', message: "The chosen base text \""+this.state.community.attrs.ceconfig.base_text+"\" in community \""+this.state.community.attrs.abbr+"\" is not a document in this community. Either supply this document or choose a different base text from the Manage>Collation menu.", header:"Base text error in collation", source: "CollationBase"});
      return;
    }
    //do the next as a waterfall...
    //is our base in this list, or is it missing text?
    async.waterfall([
      function (cb) {
        $.post(config.BACKEND_URL+'baseHasEntity?'+'docid='+isBaseDoc.attrs._id+'&entityName='+entity.entityName, function(res) {
          if (res.success=="0") {
            self._uiService.manageModal$.emit({type: 'info-message', message: "The chosen base text \""+self.state.community.attrs.ceconfig.base_text+"\" in community \""+self.state.community.attrs.abbr+"\" has no text for \""+entity.entityName+"\". Either supply a text of this section in this document or choose a different base text from the Manage>Collation menu.", header:"Base text error in collation", source: "CollationBase"});
            return;
          } else cb(null, []);
        });
      } /*
       function (argument, cb) {
         //load witnesses into ceconfig and save
    //     self.state.community.attrs.ceconfig.witnesses=pages;
        //we want to change just one field
        var jsoncall='[{"abbr":"'+self.state.community.attrs.abbr+'"},{"$set":{"ceconfig.witnesses":['+pages+']}}]';
        UpdateDbService("Community", jsoncall, function(result){
           console.log(result);
           cb(null, []);
         });
         self._communityService.update(self.state.community.getId(), self.state.community).subscribe(function(community) {
           cb(null, []);
         });
       } */
     ], function (err) {
       if (!err) {
       	 //collator MUST be registered project leader or creator
       	 if (self.role=="CREATOR" || self.role=="LEADER" ) {
         	self.collationEditor=true;
         	//add settings for viewing supplied text etc etc
         	//be sure there are properties for collation..
         	if (!this.state.community.attrs.hasOwnProperty('viewsuppliedtext')) this.state.attrs.community.viewsuppliedtext=true;   	
         	if (!this.state.community.attrs.hasOwnProperty('viewuncleartext')) this.state.attrs.community.viewuncleartext=true;   	
         	if (!this.state.community.attrs.hasOwnProperty('viewcapitalization')) this.state.attrs.community.viewcapitalization=false;   	
         	if (!this.state.community.attrs.hasOwnProperty('expandabbreviations')) this.state.attrs.community.expandabbreviations=true;   	
         	if (!this.state.community.attrs.hasOwnProperty('showpunctuation')) this.state.attrs.community.showpunctuation=false;   	
         	if (!this.state.community.attrs.hasOwnProperty('showxml')) this.state.attrs.community.showxml=false;   	
         	var src=config.COLLATE_URL+"/collation/?dbUrl="+config.BACKEND_URL+"&entity="+entity.entityName+"&community="+this.state.community.attrs.abbr+"&user="+self.state.authUser.attrs._id+"&viewsuppliedtext="+this.state.community.attrs.viewsuppliedtext+"&viewuncleartext="+this.state.community.attrs.viewuncleartext+"&viewcapitalization="+this.state.community.attrs.viewcapitalization+"&expandabbreviations="+this.state.community.attrs.expandabbreviations+"&showpunctuation="+this.state.community.attrs.showpunctuation+"&showxml="+this.state.community.attrs.showxml;
         	$('#ce_iframe').attr('src', src);
          } else {
          	alert("Only project leaders or creators can use the collation tool.");
          }
        }
       }
    );
  },
  selectDocEntity: function(doc, docEntity) {
      //choose the right page at this point
      //for root element: if this is the body, etc, could be opened BEFORE there is any page
      //default to first page of document in that case
    var page=doc.attrs.children.filter(function (obj){return obj._id==docEntity.page})[0];
    this._docService.selectPage(page);
  },
  active: function(tab) {
    if (tab=="Documents") {
      $('#collationView').hide();$('#docTab').show();
      $('tc-viewer').show(); $('#tcCollation').hide();
      $('#docTabHead').addClass('active'); $('#collationTabHead').removeClass('active')
      if (this.showByPage) {$('#pageTab').show(); $('#itemTab').hide();
      } else {$('#pageTab').hide(); $('#itemTab').show() }
    }
    if (tab=="Collation") {
      $('#collationView').show(); $('#pageTab').hide(); $('#itemTab').hide(); $('#docTab').hide();
      $('tc-viewer').hide(); $('#tcCollation').show();
      $('#docTabHead').removeClass('active'); $('#collationTabHead').addClass('active')

    }
    if (tab=="Pages") {
      $('#pageTab').show();$('#itemTab').hide();
      $('#pageTabHead').addClass('active');$('#itemTabHead').removeClass('active');
    this.showByPage=true;
    }
    if (tab=="Items") {
      $('#pageTab').hide();$('#itemTab').show();
      $('#pageTabHead').removeClass('active');$('#itemTabHead').addClass('active');
      this.showByPage=false;
    }
  },
  entityHasCollation: function(entity) {
    return(true);
  },
  reorderDocument: function(doc) {
    this._uiService.manageModal$.emit({
      type:'reorder-document',
      document:doc,
    });
  },
  deleteDocument: function(doc) {
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       document: doc,
       docname: doc._id,
       header: "Delete document "+doc.attrs.name+" from community "+this.state.community.attrs.name,
       warning: "Are you sure? This will delete all transcripts, encodings, and images for this document. It cannot be undone.",
       action: 'deleteDocument'
     });
  },
  removeDocumentText: function(doc) {
    // removed..use the restore document tools to achiever the same resilt, much better
/*    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       docname: doc._id,
       document: doc,
       header: "Delete all text from document "+doc.attrs.name+" in community "+this.state.community.attrs.name,
       warning: "Are you sure? This will delete the text of all transcripts for this document,while leaving pages and images. It cannot be undone.",
       action: 'deleteDocumentText'
     }); */
  },
  editTEIHeader: function(doc) {
    this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.state.community, document: doc, filetype:"teiHeader"});
  },
  getDocInf: function(doc) {
    this._uiService.manageModal$.emit({type: "getdocinf", community: this.state.community, document: doc});
  },
  extractXML: function($event, doc) {
    var self=this;
    var docService = this._docService;
    self._uiService.manageModal$.emit({type: "extract-xml-doc", document: doc});
    docService.getTextTree(doc).subscribe(function(teiRoot) {
//      console.log(teiRoot);
      var teiText=docService.json2xml(BrowserFunctionService.prettyTei(teiRoot));
      teiText="<TEI>\r"+doc.attrs.teiHeader+"\r"+teiText+"\r</TEI>";
      //download this text too...
      BrowserFunctionService.download(teiText, doc.attrs.name+"-"+self._uiService.state.community.attrs.abbr+".xml", "text/xml");
      self._uiService.sendXMLData$.emit(teiText);
    });
  }
});

function removeAllSelected(self, page) {
  if (this.state.pageSelected) this.state.pageSelected.attrs.selected=false;
  this.state.pageSelected=page;
}

function adjustMessage(source) {
    var start=source.indexOf("Change those settings");
    if (start==-1) return(source);
    return(source.substring(0, start));
}


module.exports = ViewComponent;
