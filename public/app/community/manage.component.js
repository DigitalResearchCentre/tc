var CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , DocService = require('../services/doc')
    , async = require('async')
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
  }, 
  testCollConversion: function() {
  	 this._uiService.manageModal$.emit({
       type: 'test-collate-conversion',
       community: this.state.community
    });
  },
  removeModOrig: function() {
  	var self=this;
    $.get(config.BACKEND_URL+'adjustModOrig/?community='+this.community.attrs.abbr, function(res) {
    	alert("Found "+res.length+" collations to adjust");
    	var not_changed=0, changed=0;
  		async.map(res, function (result, cb1) {
			var adjustCollation=JSON.parse(result.ce);
			var entity=result.entity;
			var handkeys=Object.keys(adjustCollation.structure.hand_id_map);
			var hasMod=false;
			for (var i=0; i<handkeys.length && !hasMod; i++) {
				if (handkeys[i].includes("-mod") || handkeys[i].includes("-orig")) hasMod=true;
			}
			if (!hasMod) {
				not_changed++;
				cb1(null, "");
			} else {
				changed++;
				for (let i=0; i<adjustCollation.structure.apparatus.length; i++) {
					for (let j=0; j<adjustCollation.structure.apparatus[i].readings.length; j++) {
						for (let k=0; k<adjustCollation.structure.apparatus[i].readings[j].witnesses.length; k++) {
							if (adjustCollation.structure.apparatus[i].readings[j].witnesses[k].includes("-mod")) {
								var mod_str=adjustCollation.structure.apparatus[i].readings[j].witnesses[k];
								var mod_pos=mod_str.indexOf("-mod");
								var wit_str= mod_str.slice(0, mod_pos);
								var orig_str=wit_str+"-orig";
								//check: if there is also a orig here, then we check if it is a duplicate
								for (let m=0; m<adjustCollation.structure.apparatus[i].readings[j].witnesses.length; m++) {
									if (adjustCollation.structure.apparatus[i].readings[j].witnesses[m]==orig_str) {
										let modtext="";
										let origtext="";
									//both mod and orig appear in the reading haha. Now check if the text values of each - k and m- are identical
										for (let n=0; n<adjustCollation.structure.apparatus[i].readings[j].text.length; n++) {
											modtext+=JSON.stringify(adjustCollation.structure.apparatus[i].readings[j].text[n][mod_str]);
											origtext+=JSON.stringify(adjustCollation.structure.apparatus[i].readings[j].text[n][orig_str]);
										}
										if (modtext==origtext) { //we have a duplicate! remove for each text...; adjust name of each mod element; remove orig element
											for (let n=0; n<adjustCollation.structure.apparatus[i].readings[j].text.length; n++) { 
												Object.defineProperty(adjustCollation.structure.apparatus[i].readings[j].text[n], wit_str, Object.getOwnPropertyDescriptor(adjustCollation.structure.apparatus[i].readings[j].text[n], mod_str));
												delete adjustCollation.structure.apparatus[i].readings[j].text[n][mod_str];
												delete adjustCollation.structure.apparatus[i].readings[j].text[n][orig_str];
												for (let p=0; p<adjustCollation.structure.apparatus[i].readings[j].text[n].reading.length; p++) {
													if (adjustCollation.structure.apparatus[i].readings[j].text[n].reading[p]==mod_str) {
														adjustCollation.structure.apparatus[i].readings[j].text[n].reading[p]=wit_str;
													}
													if (adjustCollation.structure.apparatus[i].readings[j].text[n].reading[p]==orig_str) {
														adjustCollation.structure.apparatus[i].readings[j].text[n].reading.splice(p, 1);
														p--;
													}
												}
											}
											for (let n=0; n<adjustCollation.structure.apparatus[i].readings[j].witnesses.length; n++) {
												if (adjustCollation.structure.apparatus[i].readings[j].witnesses[n]==mod_str) {
													adjustCollation.structure.apparatus[i].readings[j].witnesses[n]=wit_str;
												}
												if (adjustCollation.structure.apparatus[i].readings[j].witnesses[n]==orig_str) {
													adjustCollation.structure.apparatus[i].readings[j].witnesses.splice(n, 1);
													n--;
												}
											}
										}
									}
								}
							}
						}
					}
				}
				var url = config.BACKEND_URL + 'putCollation/?entity='+entity+'&community='+self.community.attrs.abbr+'&status=approved';
				var thisCollation={ce: JSON.stringify(adjustCollation)};
				$.ajax({type: 'POST', url: url, data: JSON.stringify({collation: thisCollation}), accepts: 'application/json', contentType: 'application/json; charset=utf-8', dataType: 'json'})
				.done  (function(data) {
					cb1(null, "");
				})
				.fail (function(data) {
					cb1(null, entity);		
				});
			}
        }, function (err, errors) {
			  var error_str=errors.join(" ").trim();
			  if (error_str!="") error_str+="; Unable to write collation for adjusted entities "+error_str+".";
			  else  error_str="; All written to database."
			  alert("changed: "+changed+", not changed: "+not_changed+error_str+"Now adjusting XML collation");
			  changed=not_changed=0;
			  $.get(config.BACKEND_URL+'xmlCollations/?community='+self.community.attrs.abbr, function(res) {
	  				 async.map(res, function (result, cb1) {
	  				 	var entity=result.entity;
	  				 	if (!(result.ce).includes("-orig")) {
	  				 		not_changed++;
	  				 		cb1(null, "");
	  				 	} else {
	  				 		changed++;
	  				 		var myXMLDOM = new DOMParser().parseFromString(result.ce, "text/xml");
	  				 		var rdgs=myXMLDOM.getElementsByTagName("rdg");
	  				 		for (let i=0; i<rdgs.length; i++) {
	  				 			let wits=rdgs[i].getAttribute("wit").split(" ");
	  				 			for (let j=0; j<wits.length; j++) {
	  				 				if (wits[j].includes("-mod")) {
	  				 					let mod_str=wits[j];
	  				 					let mod_pos=mod_str.indexOf("-mod");
										let wit_str= mod_str.slice(0, mod_pos);
										let orig_str=wit_str+"-orig";
										for (let k=0; k<wits.length; k++) {
											if (wits[k]==orig_str) { //got fake orig/mod..
												wits[j]=wit_str;
												wits.splice(k, 1);
												j--;
												k=wits.length;
												let idnos=rdgs[i].getElementsByTagName("idno");
												for (let m=0; m<idnos.length; m++) {
													if (idnos[m].innerHTML==mod_str) {
														idnos[m].innerHTML=wit_str;
													}
													if (idnos[m].innerHTML==orig_str) {
														idnos[m].remove();
														m--;
													}
												}
											}
										}
	  				 				}
	  				 			}		
	  				 			rdgs[i].setAttribute("wit", wits.join(" "));
	  				 		}
	  				 		let newApp={ce: myXMLDOM.documentElement.outerHTML};
	  				 		var dburl=config.BACKEND_URL + 'putCollation/?entity='+entity+'&community='+self.community.attrs.abbr+'&status=xml/positive';
	  				 		$.ajax({
								type: 'POST', url: dburl, data: JSON.stringify({collation: newApp}), accepts: 'application/json', contentType: 'application/json; charset=utf-8', dataType: 'json'
							}).done (function(data){
								cb1(null, "");
							}).fail (function(data) {
								cb1(null, entity);		
							});
	  				 	}	  				 	
					}, function (err, errors) {
						 var error_str=errors.join(" ").trim();
			 			 if (error_str!="") error_str+="; Unable to write collation for adjusted entities "+error_str+".";
			 			 else  error_str="; All written to database."
			 			 alert("XML apparatus entries changed: "+changed+", not changed: "+not_changed+error_str+" All done.");
	  				});
			  })
        });
  	});
  }
});

module.exports = ManageCommunityComponent;
