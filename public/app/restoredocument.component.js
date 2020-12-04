var $ = require('jquery')
  , CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
  , BrowserFunctionService = require('./services/functions')
  , async = require('async')
  , UpdateDbService = require('./services/updatedb')
;

var restoreDocumentComponent = ng.core.Component({
  selector: 'tc-managemodal-restoredocument',
  templateUrl: '/app/restoredocument.html',
  inputs : ['community', 'docname', 'docid', 'document'],
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader'),
  ],
}).Class({
  constructor: [CommunityService, UIService, DocService, function(communityService, uiService, docService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.success="";
    this.message="";
    this.disabled=true;
    this.uiService = uiService;
    this.docService = docService;
    this.brf={};
    }],
  closeModalRD: function() {
    this.message=this.success="";
    this.disabled=true;
//    $('#MMADdiv').css("margin-top", "30px");
//    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  makeBasic: function () {
    var self=this;
    this.success="Creating basic restore file"
    $.get(config.BACKEND_URL+'getBasicRestore/?docid='+this.docid, function(res) {
      self.success="Basic restore file made, and downloaded now to \""+self.docname+"-"+self.uiService.state.community.attrs.name+".json"+"\". You can proceed to Step Two now. Or, you can edit and upload that file, and then proceed."
      var brfDL=JSON.stringify(res).replace(/{"name/gi,"\r{\"name")
      self.brf=res;
      BrowserFunctionService.download(brfDL, self.docname+"-"+self.uiService.state.community.attrs.name+".json", "application/json")
      self.disabled=false;
    });
  },
  useRestore: function (){
    var self=this;
    if (!Object.keys(this.brf).length) {
      this.success="";
      this.message="No Basic Restore Document found. Return to step one!";
      this.disabled=true;
      return
    } else {
      var teiText="<TEI>\r"+self.brf[0].teiHeader+"\r<text>\r<body>\r<div>\r"
      for (var i=0; i<self.brf[1].pages.length; i++) {
        teiText+='\r<pb n="'+self.brf[1].pages[i].name+'"';
        if (self.brf[1].pages[i].facs) teiText+=' facs="'+self.brf[1].pages[i].facs+'"';
        teiText+='/>'
      }
      teiText+="\r</div></body></text></TEI>";
      processRestoreFile(teiText, self, "REBUILD", function (res){
        if (res.success) self.success="Document \""+self.brf[0].name+"\" successfully rebuilt and pages adjusted to link to trancripts and images. Refresh the browser to see the rebuilt document.";
        else {
          self.success="";
          self.message=res.message;
        }
      });
    }
  },
  loadXMLDocument: function(){
    var teiText = this.filecontent;
    var self=this;
    if (!Object.keys(this.brf).length) {
      this.success="";
      this.message="No Basic Restore Document found. Return to step one!";
      this.disabled=true;
    } else if (!teiText.includes("<TEI")) {
      this.success="";
      this.message = 'The file chosen is not a TEI document. Select a different file';
    } else {
      this.success="Now reloading the chosen file containing \""+this.document.attrs.name+"\".";
      processRestoreFile(teiText, self, "LOAD", function (res){
        if (res.success) self.success="Document \""+self.brf[0].name+"\" successfully loaded and pages adjusted to link to trancripts and images. Refresh the browser to see the reloaded document.";
        else {
          self.success="";
          self.message=res.message;
        }
      });
    }
  },
  loadBasic: function() {
      var text = this.filecontent;
      var self=this;
      if (!text) {
        this.success="";
        this.message = 'Choose a file before clicking on \"Load Basic Restore File\"';
      } else {
        try {
          self.brf=JSON.parse(text);
        } catch (e) {
          self.success="";
          self.message = "JSON parser error: "+e.message
          self.disabled=true;
          self.brf={};
          return;
        }
        //check this is still valid .. ie that the document referenced still exists in the current community docs
        if (!self.uiService.state.community.attrs.documents.some(el=>el._id===self.brf[0]._id)) {
          self.message="This basic reference file references a document which is not current in this community. Either use a current file, or choose Make Basic Restore file";
          self.disabled=true;
          return;
        }
        self.message ="";
        self.success="File loaded and parsed. Proceed to step two.";
        self.disabled=false;
      }
  },
  ngOnChanges: function() {
    this.success="";
    this.message="";
    $('#manageModal').width("930px");
    $('#manageModal').height("600px");
  },
  extractDocDb: function () {
    if (!Object.keys(this.brf).length) {
      this.success="";
      this.message="No Basic Restore Document found. Return to step one!";
      this.disabled=true;
      return;
    } else if (this.brf[0].name!=this.document.attrs.name){
      this.success="";
      this.message="The name of the document \""+this.document.attrs.name+"\" you want to extract from the database must correspond with the name of the document \""+this.brf[0].name+"\" referenced in the basic restore file";
      return;
    } else {
      var self=this;
      var docService = this.docService;
      this.success="Now extracting the committed version of \""+this.document.attrs.name+"\" document from the database";
      docService.getTextTree(this.document).subscribe(function(teiRoot) {
        var teiText=docService.json2xml(BrowserFunctionService.prettyTei(teiRoot));
        teiText="<TEI>\r"+self.brf[0].teiHeader+"\r"+teiText+"\r</TEI>";
        //how many pages found..? find out! compare with basic restore file
        //ok process this one...
        processRestoreFile(teiText, self, "EXTRACT", function (res){
          if (res.success) self.success="Document \""+self.brf[0].name+"\" successfully reloaded and pages adjusted to link to trancripts and images. Refresh the browser to see the reloaded document.";
          else {
            self.success="";
            self.message=res.message;
          }
        });

      });
    }
  }
});

function processRestoreFile(teiText, self, context, callback) {
  var count = (teiText.match(/<pb/g) || []).length;
  if (!self.brf[0].teiHeader) {
    alert("The TEIheader is empty. Supply a TEIheader, clicking on the Edit TEIheader icon beside the document name ");
    callback({success: false, message: "No TEI header"});
    return;
  }
  if (confirm(count+" pages found in document \""+self.document.attrs.name+"\"; "+self.brf[1].pages.length+" pages referenced in the basic restore file (these numbers should be identical). Press OK to continue, Cancel to cancel." )) {
    //validate extracted document..
    $.post(config.BACKEND_URL+'validate?'+'id='+self.uiService.state.community.getId(), {xml:teiText}, function(res) {
        if (res.error.length>0) {
          self.success="";
          if (context=="REBUILD") callback({success: false, message: "Error in parsing rebuilt file. Error message is: "+res.error[0].message});
          if (context=="LOAD") callback({success: false, message: "Error in parsing loaded file. Error message is: "+res.error[0].message});
          if (context=="EXTRACT") callback({success: false, message: "Error in parsing extracted file. Error message is: "+res.error[0].message});
          return;
        } else {
          if (context=="REBUILD") self.success="Rebuilt file successfully parsed. Now writing to the database.";
          if (context=="LOAD") self.success="Loaded file successfully parsed. Now writing to the database.";
          if (context=="EXTRACT") self.success="Extracted file successfully parsed. Now writing to the database.";
          self.message="";
          //first wipe out all teis and docs for the existing document..remove every doc and tei with this id as an ancestor
            $.post(config.BACKEND_URL+'deleteDocDocsTEIs/?docid='+self.docid, function(res) {
              if (context=="REBUILD") self.success=res.message+" from document \""+self.brf[0].name+"\". Now reloading with version rebuilt from the restore file."
              if (context=="LOAD") self.success=res.message+" from document \""+self.brf[0].name+"\". Now reloading with version loaded from a file."
              if (context=="EXTRACT") self.success=res.message+" from document \""+self.brf[0].name+"\". Now reloading with version extracted from the database."
                var comDoc={name:self.brf[0].name, community: self.uiService.state.community.attrs.abbr, text:"", label:"text"};
                var comRes={error:[]};
                var comtext=teiText.slice(teiText.indexOf("<text"),teiText.indexOf("</text"));
                var comcommid=self.uiService.state.community._id;
                self.docService.commit({doc: comDoc, text: comtext, res: comRes}, {community: comcommid}).subscribe(function(res){
                  var myDoc=self.uiService.state.document;  //the one we just wrote
                  self.success="Document \""+self.brf[0].name+"\" successfully reloaded. Adjusting pages now: "
                  adjustRestoredDoc(myDoc, comcommid, self.brf, self, function(res){
                    callback({success:true});
                  });
                })
            });
        }
    });
  } else {
    callback({success: false, message: "Document restore cancelled" });
  }
}

function adjustRestoredDoc(myDoc, comcommid, brf, context, callback){
  //adjust document list in the community; write the teiheader to the restored document; reconcile the pages with revisions tasks etc
  $.post(config.BACKEND_URL+'restoreCommDocs/?newid='+myDoc._id+'&oldid='+brf[0]._id+'&community='+comcommid, function (res) {
    var jsoncall=JSON.parse(JSON.stringify('[{"_id":"'+myDoc._id+'"}, {"$set":{"teiHeader":"'+brf[0].teiHeader.replace(/\\\"/g,'"').replace(/"/g,"\\\"").replace(/(\r\n|\n|\r)/gm,"").replace(/\t/g,"")+'", "meta":'+JSON.stringify(brf[0].meta)+'}}]'));
    UpdateDbService("Document", jsoncall, function(result){
      async.mapSeries(brf[1].pages, function (page, cb){
        $.ajax({
          url:config.BACKEND_URL+'adjustRestorePage?docid='+myDoc._id+"&parent="+myDoc.name,
          type: 'POST',
          data: JSON.stringify(page),
          accepts: 'application/json',
          contentType: 'application/json; charset=utf-8',
          dataType: 'json'
        })
        .done(function(data){
          if (data.success) {
          	context.success+=" "+page.name;
          } else {
          	context.success+=" Error in "+page.name+" ";
          	alert(data.error);
          }
          return cb(null);
        })
        .fail(function( jqXHR, textStatus, errorThrown) {
          context.success+=" System Error in database "+page.name+" "+errorThrown;
          return cb(null);
        });
      }, function (err){
        if (!err) callback({success:true})
        else callback({error: err})
      });
    });
  });
}
//duplicates serverside function

module.exports = restoreDocumentComponent;
