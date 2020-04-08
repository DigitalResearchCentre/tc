var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
  , config = require('../config')
;

var ManageCommunityComponent = ng.core.Component({
  selector: 'tc-manage-community',
  templateUrl: '/app/community/manage.html',
  inputs: [ 'community',],
  directives: [
  ],
}).Class({
  constructor: [UIService, CommunityService, function(
    uiService, communityService
  ) {
    this._uiService = uiService;
    this._communityService = communityService;
    this.state = uiService.state;
  }],
  ngOnChanges: function(){
  	if (this.state.community.attrs.rebuildents==undefined) {
    	this.state.community.attrs.rebuildents=false;
    	this._communityService.createCommunity(this.state.community.attrs).subscribe(function(community) {
    	  //all ok
    	},function(err) {
            if (err) alert(err.json().message);
        });
     }
  },
  loadModal: function(which) {
    if (which=='uploadcss-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "css"});
    else if (which=='uploadjs-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "js"});
    else if (which=='uploaddtd-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype: "dtd"});
    else if (which=='add-xml-document') this._uiService.manageModal$.emit({type: "add-xml-document", community: this.community});
    else if (which=='collationeditor-community') this._uiService.manageModal$.emit({type: "uploadfile-community", community: this.community, filetype:"json"});
    else if (which=='collationeditor-choosebase') this._uiService.manageModal$.emit({type: "choosebase-community", community: this.community});
    else if (which=='collationeditor-choosewitnesses') this._uiService.manageModal$.emit({type: "choosebase-choosewitnesses", community: this.community});
    else if (which=='collationeditor-retrievecollation') this._uiService.manageModal$.emit({type: "retrievecollation", community: this.community});
    else if (which=='collationeditor-makenexuscollation') this._uiService.manageModal$.emit({type: "makenexuscollation", community: this.community});
    else if (which=='collationeditor-createVarMaps') this._uiService.manageModal$.emit({type: "createVarMaps", community: this.community});
    else if (which=='collationeditor-editVarMaps') this._uiService.manageModal$.emit({type: "editvMaps", community: this.community});
    else this._uiService.manageModal$.emit(which);
  },
  isLeader: function() {
    var state = this.state;
    return this._communityService.isLeader(state.community, state.authUser);
  },
  setCollEnts: function(){
  	if (this.state.community.attrs.rebuildents) this.state.community.attrs.rebuildents=false
  	else this.state.community.attrs.rebuildents=true;
  	this._communityService.createCommunity(this.state.community.attrs).subscribe(function(community) {
    	  //all ok
	},function(err) {
		if (err) alert(err.json().message);
	});
  },
  isCreator: function(){
    var state = this.state;
    return this._communityService.isCreator(state.community, state.authUser);
  },
  deleteCommunity: function(){
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       docname: "",
       header: "Delete community "+this.community.attrs.name,
       warning: "Are you sure? This will delete the community and all documents, transcripts, encodings, and images. It cannot be undone.",
       action: 'deleteCommunity'
     });
  },
  deleteAllDocs: function(){
    this._uiService.manageModal$.emit({
       type: 'confirm-message',
       page: "",
       docname: "",
       header: "Delete all documents from community "+this.community.attrs.name,
       warning: "Are you sure? This will delete all documents, transcripts, encodings, and images from this community. It cannot be undone.",
       action: 'deleteAllDocs'
     });
  },
  viewAllCommunities: function(){  //superuser function. Only available to nominated superuser
    this._uiService.manageModal$.emit({
       type: 'view-allcommunities',
     });
  },
  viewAllUsers: function(){  //superuser function. Only available to nominated superuser
    this._uiService.manageModal$.emit({
       type: 'view-allusers',
     });
  },
  exportTranscriptsFromTC1: function(){
    this._uiService.manageModal$.emit({
       type: 'export-tc1transcripts',
     });
  },
  exportUsersFromTC1: function(){
    this._uiService.manageModal$.emit({
       type: 'export-tc1users',
     });
  },
  exportDBVersionFromTC1: function(){
    this._uiService.manageModal$.emit({
       type: 'export-tc1dbversion',
     });
  },
  createDefaultTranscripts: function(){
    this._uiService.manageModal$.emit({
       type: 'create-defaulttranscripts',
     });
  }
});

module.exports = ManageCommunityComponent;
