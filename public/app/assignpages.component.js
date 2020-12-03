var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RestService = require('./services/rest')
  , config = require('./config')
  , async = require('async')
  , $ = require('jquery')
;

var AssignPagesComponent = ng.core.Component({
  selector: 'tc-managemodal-assign-pages',
  templateUrl: '/app/assignpages.html',
  styleUrls: ['/app/community/view.css'],
  directives: [
    require('./directives/modaldraggable')
  ],
  inputs: [
    'community', 'user', 'memberId', 'source'
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
    this.success="";
<<<<<<< HEAD
     $.get(config.BACKEND_URL+'getDocNames/?community='+uiService.state.community._id, function(res) {
		for (var i=0; i<self.state.community.attrs.documents.length; i++) {
			self.state.community.attrs.documents[i].attrs.name=res[i].name;
		}
		//filter those already selected; prepare to deselect, etc, as needed
	 })
=======
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
    $('#manageModal').width("541px");
    $('#manageModal').height("600px");
  }],
  ngOnInit: function(){
<<<<<<< HEAD
  	var self=this;
    this.state.community.attrs.documents[0].expand=false;
     $.get(config.BACKEND_URL+'getDocNames/?community='+this.state.community._id, function(res) {
		for (var i=0; i<self.state.community.attrs.documents.length; i++) {
			self.state.community.attrs.documents[i].attrs.name=res[i].name;
		}
		//filter those already selected; prepare to deselect, etc, as needed
	 })
  },
  ngOnChanges: function(){
  	for (var i=0; i<this.state.community.attrs.documents.length; i++) {
  		if (this.state.community.attrs.documents[i].expand)  {
  			var mydoc=this.state.community.attrs.documents[i];
  			for (var j=0; j<mydoc.attrs.children.length; j++) {
			  mydoc.attrs.children[j].isOther=false;
			  mydoc.attrs.children[j].isAssigned=false
			  if (mydoc.attrs.children[j].attrs.tasks && mydoc.attrs.children[j].attrs.tasks.length>0) {
				for (var k=0; k<mydoc.attrs.children[j].attrs.tasks.length; k++) {
				  if (mydoc.attrs.children[j].attrs.tasks[k].memberId==this.memberId)
					mydoc.attrs.children[j].isAssigned=true;
				  else mydoc.attrs.children[j].isOther=true;
				}
			  }
			}
  		}
  	}
=======
    this.community.attrs.documents[0].expand=false;
    //filter those already selected; prepare to deselect, etc, as needed
    for (var i=0; i<this.community.attrs.documents.length; i++) {
      for (var j=0; j<this.community.attrs.documents[i].attrs.children.length; j++) {
        if (this.community.attrs.documents[i].attrs.children[j].attrs.tasks) {
          for (var k=0; k<this.community.attrs.documents[i].attrs.children[j].attrs.tasks.length; k++) {
            if (this.community.attrs.documents[i].attrs.children[j].attrs.tasks[k].userId==this.user._id)
              this.community.attrs.documents[i].attrs.children[j].isAssigned=true;
            else this.community.attrs.documents[i].attrs.children[j].isOther=true;
          }
        }
      }
    }
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
  },
  toggleDoc: function(doc) {
    doc.expand = !doc.expand;
    if (doc.expand) {
      var self=this;
      //this document may need expanding -- refresh it
      this._docService.selectDocument(doc);
      this._docService.refreshDocument(doc).subscribe(function(mydoc) {
        for (var j=0; j<mydoc.attrs.children.length; j++) {
<<<<<<< HEAD
          mydoc.attrs.children[j].isOther=false;
          mydoc.attrs.children[j].isAssigned=false
          if (mydoc.attrs.children[j].attrs.tasks && mydoc.attrs.children[j].attrs.tasks.length>0) {
            for (var k=0; k<mydoc.attrs.children[j].attrs.tasks.length; k++) {
              if (mydoc.attrs.children[j].attrs.tasks[k].memberId==self.memberId)
              	mydoc.attrs.children[j].isAssigned=true;
=======
          if (mydoc.attrs.children[j].attrs.tasks) {
            for (var k=0; k<mydoc.attrs.children[j].attrs.tasks.length; k++) {
              if (mydoc.attrs.children[j].attrs.tasks[k].userId==self.user._id)
                mydoc.attrs.children[j].isAssigned=true;
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
              else mydoc.attrs.children[j].isOther=true;
            }
          }
        }
      });
    }
  },
  submit: function() {
    //got get all the boxes checked at write them to the document, page by page
    //we will get all the pages together then write them to the database
    var selected=[];
    var deselected=[];
    var self=this;
    for (var i=0; i<this.community.attrs.documents.length; i++) {
      for (var j=0; j<this.community.attrs.documents[i].attrs.children.length; j++) {
        if (this.community.attrs.documents[i].attrs.children[j].selected) {
          //if this is already assigned: now we are deselecting it
          if (this.community.attrs.documents[i].attrs.children[j].isAssigned) {
            deselected.push({pageId:this.community.attrs.documents[i].attrs.children[j]._id, record:{userId:this.user._id, name: this.user.local.name, status: "ASSIGNED", memberId:this.memberId}});
            this.community.attrs.documents[i].attrs.children[j].isAssigned=false;
            for (var m=0; m<this.community.attrs.documents[i].attrs.children[j].attrs.tasks.length; m++) {
              if (this.community.attrs.documents[i].attrs.children[j].attrs.tasks[m].userId==this.user._id) {
                this.community.attrs.documents[i].attrs.children[j].attrs.tasks.splice(m,1);
              }
            }
          }
          else {
            selected.push({pageId:this.community.attrs.documents[i].attrs.children[j]._id, record:{userId:this.user._id, name: this.user.local.name, status: "ASSIGNED", memberId:this.memberId, witname: this.community.attrs.documents[i].attrs.name}});
            this.community.attrs.documents[i].attrs.children[j].isAssigned=true;
            if (!this.community.attrs.documents[i].attrs.children[j].attrs.tasks)
              this.community.attrs.documents[i].attrs.children[j].attrs.tasks=[];
            this.community.attrs.documents[i].attrs.children[j].attrs.tasks.push({userId:this.user._id, name: this.user.local.name});
          }
          this.community.attrs.documents[i].attrs.children[j].selected=false;
        }
      }
    }
    async.parallel([
      function(cb) {
        if (selected.length) {
          $.ajax({
            url: config.BACKEND_URL+'saveAssignPages',
            type: 'POST',
            data:  JSON.stringify({selected: selected}),
            accepts: 'application/json',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
          }).done(function( data ) {
            for (var i=0; i<self.source.members.length; i++){
              if (self.source.members[i]._id==self.memberId)
                self.source.members[i].assigned+=selected.length;
            }
            cb(null);
          })
          .fail(function( jqXHR, textStatus, errorThrown) {
               cb(errorThrown);
         });
        } else cb(null);
      },
      function(cb) {
        if (deselected.length) {
          $.ajax({
            url: config.BACKEND_URL+'deleteAssignPages',
            type: 'POST',
            data:  JSON.stringify({deselected: deselected}),
            accepts: 'application/json',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
          }).done(function( data ) {
            for (var i=0; i<self.source.members.length; i++){
              if (self.source.members[i]._id==self.memberId)
                self.source.members[i].assigned-=deselected.length;
            }
            cb(null);
          })
          .fail(function( jqXHR, textStatus, errorThrown) {
             cb(errorThrown);
         });
        } else cb(null);
      }
    ], function(err, results) {
      if (!err) {
        self.success="Page assignments saved";
        document.getElementById("APSuccess").scrollIntoView(true);
      } else {
        alert(err);
      }
    });
    //right. Now send this infor for each page to the database
  },
  closeModalAP: function() {
    this.message=this.success="";
    $('#manageModal').modal('hide');
  }
});

module.exports = AssignPagesComponent;
