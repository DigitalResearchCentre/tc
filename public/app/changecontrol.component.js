var $ = require('jquery')
  , CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
;

var changeControlComponent = ng.core.Component({
  selector: 'tc-community-changecontrol',
  templateUrl: '/app/changecontrol.html',
  inputs : ['community', 'parent', 'context', 'document', 'ctype', 'docname'],
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
    this.ancestor="";
    }],
  ngOnInit: function() {
    this.success="";
  },
  closeModalCCh: function() {
    this.message=this.success="";
//    $('#MMADdiv').css("margin-top", "30px");
//    $('#MMADbutton').css("margin-top", "20px");

    $('#manageModal').modal('hide');
  },
  submit: function(){
    if (this.parent=="COMMUNITY") {
      var self=this;
      var clone=_.clone(this.community.attrs);
      if (this.ctype=="transcripts") {
        clone.control.transcripts=this.control;
        clone.control.tmsg=this.cmessage;
      }
      if (this.ctype=="images") {
        clone.control.images=this.control;
        clone.control.imsg=this.cmessage;
      }
      if (this.ctype=="collations") {
        clone.control.collations=this.control;
        clone.control.cmsg=this.cmessage;
      }
      this._communityService.createCommunity(clone).subscribe(function(community) {
        if (self.ctype=="images") self.context.edit.control.images=self.control;
        else if (self.ctype=="transcripts") self.context.edit.control.transcripts=self.control;
        else if (self.ctype=="collations") self.context.edit.control.collations=self.control;
        self.success="Access control changes saved"
      });
    }
    if (this.parent=="DOCUMENT" || this.parent=="PAGE") {
      var self=this;
      if (this.ctype=="images") {this.document.attrs.control.images=this.control; this.document.attrs.control.imsg=this.cmessage;}
      if (this.ctype=="transcripts") {this.document.attrs.control.transcripts=this.control; this.document.attrs.control.tmsg=this.cmessage;}
      this.docService.update(this.document._id, {control: this.document.attrs.control}).subscribe(function(document){
        self.success="Changes saved"
      });
    }
  },
  choose: function(group) {
    this.control=group;
    this.success="";
    if (this.parent=="COMMUNITY") {
      if (this.ctype=="transcripts") {
        if (this.community.attrs.control.tmsg && this.community.attrs.control.transcripts==group) this.cmessage=this.community.attrs.control.tmsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any transcript of any page of any document in this community";
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any transcript of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any transcript of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any transcript of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
      }
      if (this.ctype=="images") {
        if (this.community.attrs.control.imsg && this.community.attrs.control.images==group) this.cmessage=this.community.attrs.control.imsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any image of any page of any document in this community";
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any image of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any image of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any image of any page of any document in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
      }
      if (this.ctype=="collations") {
        if (this.community.attrs.control.imsg && this.community.attrs.control.images==group) this.cmessage=this.community.attrs.control.imsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any collation of any textual entity in this community";
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any collation of any textual entity in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to collations.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any collation of any textual entity in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to collations.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any collation of any textual entity in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to collations.";
        }
      }
    }
    if (this.parent=="DOCUMENT") {
      //document may not be fully loaded..
      if (this.ctype=="images") {
        if (this.document.attrs.control.imsg && this.document.attrs.control.images==group) this.cmessage=this.document.attrs.control.imsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any image of any page of "+this.document.attrs.name+" in this community";
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any image of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any image of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any image of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="INHERITED"){
          this.cmessage="Who can see any image of any page in  "+this.document.attrs.name+" is inherited from the settings for community "+this.community.attrs.name+". Change those settings by selecting 'Edit' beside the community name in the Textual Communities panel.";
        }
      }
      if (this.ctype=="transcripts") {
        if (this.document.attrs.control.tmsg && this.document.attrs.control.transcripts==group) this.cmessage=this.document.attrs.control.tmsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any transcript of any page of "+this.document.attrs.name+" in this community";
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any transcript of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any transcript of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any transcript of any page of "+this.document.attrs.name+" in this community. Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="INHERITED"){
          this.cmessage="Who can see any image of any page in  "+this.document.attrs.name+" is inherited from the settings for community "+this.community.attrs.name+". Change those settings by selecting 'Edit' beside the community name in the Textual Communities panel.";
        }
      }
    }
    if (this.parent=="PAGE") {
      if (this.ctype=="images") {
        if (this.document.attrs.control.imsg && this.document.attrs.control.images==group) this.cmessage=this.document.attrs.control.imsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any image of page "+this.document.attrs.name+" in document "+this.docname;
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any image of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any image of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any image of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to images.";
        }
        else if (group=="INHERITED"){
          this.cmessage="Who can see any image of page "+this.document.attrs.name+" is inherited from the settings for document "+this.docname+". Click the lock icon beside the document name to edit those settings.";
        }
      }
      if (this.ctype=="transcripts") {
        if (this.document.attrs.control.tmsg && this.document.attrs.control.transcripts==group) this.cmessage=this.document.attrs.control.tmsg;
        else if (group=="ALL"){
          this.cmessage="Anyone can see any transcript of page "+this.document.attrs.name+" in document "+this.docname;
        }
        else if (group=="VIEWERS"){
          this.cmessage="Only registered viewers, community members and leaders can see any transcript of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="MEMBERS"){
          this.cmessage="Only community members and leaders can see any transcript of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="LEADERS"){
          this.cmessage="Only community leaders can see any transcript of page "+this.document.attrs.name+" in document "+this.docname+". Email "+this.uiService.state.authUser.attrs.local.name+" at "+this.uiService.state.authUser.attrs.local.email+" to request access to transcripts.";
        }
        else if (group=="INHERITED"){
          this.cmessage="Who can see any transcript of page "+this.document.attrs.name+" is inherited from the settings for document "+this.docname+". Click the lock icon beside the document name to edit those settings.";
        }
      }
    }
  },
  ngOnChanges: function() {
    this.success="";
    if (this.parent=="COMMUNITY") {
      this.spec="all "+this.ctype;
      this.header= "Who can see "+this.ctype+ " in community \""+this.community.attrs.name+"\"";
      if (this.ctype=="images") this.choose(this.community.attrs.control.images);
      else if (this.ctype=="transcripts") this.choose(this.community.attrs.control.transcripts);
      else if (this.ctype=="collations") this.choose(this.community.attrs.control.collations);
    } else if (this.parent=="PAGE") {
          this.spec="all "+this.ctype+" of page "+this.document.attrs.name;
          this.header= "Who can see "+this.ctype+ " of page \""+this.document.attrs.name+"\"";
          this.ancestor="document";
          if (this.ctype=="images") this.choose(this.document.attrs.control.images);
          else if (this.ctype=="transcripts") this.choose(this.document.attrs.control.transcripts);
    } else if (this.parent=="DOCUMENT") {
      //document mau not be fully loaded
      var self=this;
      this.docService.refreshDocument(this.document).subscribe(function(doc) {
        if (!doc.attrs.control) self.document.attrs.control={images:"INHERITED", imsg:"", transcripts:"INHERITED", tmsg:""};
        self.spec="all "+self.ctype+" in this document";
        self.header= "Who can see "+self.ctype+ " in document \""+self.document.attrs.name+"\"";
        self.ancestor="community";
        if (self.ctype=="images") self.choose(self.document.attrs.control.images);
        else if (self.ctype=="transcripts") self.choose(self.document.attrs.control.transcripts);
      });
    }
    $('#manageModal').width("740px");
    $('#manageModal').height("340px");
  },
});

//duplicates serverside function

module.exports = changeControlComponent;
