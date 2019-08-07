var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , RESTService = require('../services/rest')
  , DocService = require('../services/doc')
  , config = require('../config')
;

var UploadFileComponent = ng.core.Component({
  selector: 'tc-uploadfile-community',
  templateUrl: '/app/community/uploadfile.html',
  directives: [
    require('../directives/modaldraggable'),
    require('../directives/filereader'),
    require('../directives/modalresizable'),
  ],
  inputs: [
    'community','filetype', 'text', 'doc',
  ],
}).Class({
  constructor: [
    CommunityService, UIService, RESTService, DocService, function(
      communityService, uiService, restService, docService) {
    var self=this;
    this._docService = docService;
    this._communityService = communityService;
    this._uiService = uiService;
    this.restService= restService;
    this.message=this.success="";
    $('#manageModal').width("480px");
    $('#manageModal').height("530px");
  }],
  ngOnChanges: function(){
    if (this.filetype=="teiHeader") {
      var self=this;
      var docService = this._docService
      docService.refreshDocument(this.doc).subscribe(function(doc) {
        self.text=doc.attrs.teiHeader;
        self.title="TEI Header for "+doc.attrs.name+":";
      })
    }
  },
  ngOnInit: function() {
    var self=this;
//    this.text="";
    if (this.filetype=="css") this.title="CSS";
    if (this.filetype=="js") this.title="JavaScript";
    if (this.filetype=="dtd") this.title="DTD";
    if (this.filetype=="teiHeader") this.title="teiHeader";
  },
  closeModalUPLC: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  },
 filechange: function(filecontent) {
    this.text = filecontent;
  },
 default: function() {
   var self=this;
   if (this.filetype=='css') {
     self.restService.http.get('/app/data/default.css').subscribe(function(cssfile) {self.text=cssfile._body;});
   }
   if (this.filetype=='js') {
     self.restService.http.get('/app/data/default.js').subscribe(function(jsfile) {self.text=jsfile._body;});
   }
   if (this.filetype=='dtd') {
     self.restService.http.get('/app/data/default.dtd').subscribe(function(dtdfile) {self.text=dtdfile._body;});
   }
},
 submit: function() {
    //is there a community with this name?
    var self=this;
    this.message=this.success="";
    if (this.filetype=="css" || this.filetype=="js" || this.filetype=="dtd") {
      $.ajax({
        url: config.BACKEND_URL+'saveCommunityAuxFile?'+'community='+self.community._id+'&filetype='+this.filetype,
        type: 'POST',
        contentType:"text/plain",
        dataType: "text",
        data:  this.text,
      }).done(function(data) {
        self.success=self.filetype+' document for community "'+self.community.attrs.name+'" saved';
        document.getElementById("ECSuccess").scrollIntoView(true);
        self._uiService.state.community.attrs[self.filetype]=self.text;
      }).fail(function( jqXHR, textStatus, errorThrown) {
        self.message ="error" + errorThrown;
      });
    }
    if (this.filetype=="teiHeader") {
      $.ajax({
        url: config.BACKEND_URL+'saveCommunityAuxFile?'+'document='+self.doc._id+'&filetype='+this.filetype,
        type: 'POST',
        contentType:"text/plain",
        dataType: "text",
        data:  this.text,
      }).done(function(data) {
        self.success=self.filetype+' for document "'+self.doc.attrs.name+'" saved';
        document.getElementById("ECSuccess").scrollIntoView(true);
        self.doc.attrs.teiHeader=self.text;
      }).fail(function( jqXHR, textStatus, errorThrown) {
        self.message ="error" + errorThrown;
      });
    }
  },
});

module.exports = UploadFileComponent;
