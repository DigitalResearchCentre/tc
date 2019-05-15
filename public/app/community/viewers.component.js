var UIService = require('../services/ui')
, config = require('../config')
, async = require('async')
, $ = require('jquery')
, Router = ng.router.Router
, sortBy = require('sort-array')
;

var CommunityMembersComponent = ng.core.Component({
  selector: 'tc-community-viewers',
  templateUrl: '/app/community/viewers.html',
  inputs: [
    'community',
  ],
}).Class({
  constructor: [Router, UIService, function(router, uiService) {
    this.state = uiService.state;
    this._router = router;
    this.viewers=[];
    this.uiService=uiService;
  }],
  ngOnInit: function() {
    var self=this;
    $.post(config.BACKEND_URL+'community/'+this.community._id+'/members/', function(res) {
      for (var i=0; i<res.length; i++) {
          var thisMembership=res[i].memberships.filter(function (obj){return String(obj.community) == String(self.community._id);})[0];
          if (thisMembership.role=="VIEWER")
            self.viewers.push({name:res[i].local.name, email: res[i].local.email, date:thisMembership.created, role:thisMembership.role, approvername: thisMembership.approvername, approvermail: thisMembership.approvermail, assigned:thisMembership.pages.assigned, inprogress:thisMembership.pages.inprogress, submitted:thisMembership.pages.submitted, approved:thisMembership.pages.approved, committed:thisMembership.pages.committed, _id:thisMembership._id, user:res[i], pageinstances: {assigned:[], inprogress:[], committed:[], submitted:[],approved:[], committed:[]}})
      }
    });
      //now, get the tasks for each member..
  },
  formatDate: function(rawdate) {
    var date = new Date(rawdate);
    var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return date.getDate()+" "+months[date.getMonth()]+" "+date.getFullYear();
//    return date.toDateString()
  },
  showPage: function(community, document, page) {
    var instruction = this._router.generate([
      'Community', {id: community.getId(), route: 'view', document:document, page:page}
    ]);
    window.location=instruction.toRootUrl();
  },
  changeRole: function(member, user, role) {
    this.uiService.manageModal$.emit({type:'change-role', member: member, user: user, role: role, community:this.community.attrs.name});
  },
  invite: function(community) { //let's invite someone!
    this.uiService.manageModal$.emit({
      type: 'invite-member',
      community:   community,
      inviter: this.state.authUser,
      role: "VIEWER"
    });
  },
  toggleInstance: function(instance) {
    instance.expand = !instance.expand;
  }
});

function adjustNumbers(sourceArray) {
  for (var i=0; i<sourceArray.length; i++) {
    var nlen=0;
    var name=sourceArray[i].name[0];
    if (!isNaN(name[0])) {
      var nlen=0, newName=name;
      while (!isNaN(name[nlen])) nlen++;
      nlen=6-nlen;
      while (nlen> 0 ) {newName = "0" + newName; nlen--}
      sourceArray[i].sortable=newName;
    } else sourceArray[i].sortable=name;
  }
}

module.exports = CommunityMembersComponent;
