var _ = require('lodash')
  , RouteParams = ng.router.RouteParams
  , Router = ng.router.Router
  , Location = ng.router.Location
  , CommunityService = require('../services/community')
  , UIService = require('../services/ui')
  , config = require('../config')
;

var CommunityComponent = ng.core.Component({
  selector: 'tc-community',
  templateUrl: '/app/community/community.html',
  directives: [
    ng.router.ROUTER_DIRECTIVES,
    require('./about.component'),
    require('./home.component'),
    require('./view.component'),
    require('./manage.component'),
    require('../editcommunity.component'),
    require('./members.component'),
    require('./viewers.component'),
    require('./vbase.component'),
  ],
}).Class({
  constructor: [
    RouteParams, Router, Location, CommunityService, UIService,
  function(
    routeParams, router, location, communityService, uiService
  ) {
    this._routeParams = routeParams;
    this._router = router;
    this._location = location;
    this._communityService = communityService;
    this._uiService = uiService;
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
    ;
    this.state = uiService.state;

  }],
  ngOnInit: function() {
    var self = this
      , id = this._routeParams.get('id')
      , route = this._routeParams.get('route')
      , uiService = this._uiService
    ;
    //but we might not be logged in at all
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else {
      this.role="NONE";
    }
    
    
    //so superuser can see it and edit it too

    if (this.state.authUser.attrs.local && this.state.authUser.attrs.local.email=="peter.robinson@usask.ca") this.role="LEADER";
    this.route = route;
    //now, could be refresh after we deleted a community. in that case...don't try and select it!
    //this one causes a problem when superuser wants to look at any community...
    if (this.state.authUser.attrs.local && this.state.authUser.attrs.local.email=="peter.robinson@usask.ca") {
      this._communityService.selectCommunity(id);
      if (!this.state.community.attrs.control) {
        var clone=_.clone(this.state.community.attrs);
        clone.control={transcripts:"ALL", tmsg:"", images:"ALL", imsg:"", collations:"ALL", cmsg:""};
        this._communityService.createCommunity(clone).subscribe(function(community) {
        });
      }
    } else {
      if (this._uiService.state.myCommunities[this._uiService.state.myCommunities.findIndex(x => x._id == id)]
        || this._uiService.state.publicCommunities[this._uiService.state.publicCommunities.findIndex(x => x._id == id)])
        this._communityService.selectCommunity(id);
        //if we are a viewer.. add access to access field
        if (this.role=="VIEWER") {
          $.post(config.BACKEND_URL+'updateViewerAccess?community='+id+'&user='+this.state.authUser._id, function(res){});
        }
        if (!this.state.community.attrs.control) { //set up default for legacy communities
          var clone=_.clone(this.state.community.attrs);
          clone.control={transcripts:"ALL", tmsg:"", images:"ALL", imsg:"", collations:"ALL", cmsg:""};
          this._communityService.createCommunity(clone).subscribe(function(community) {
          });
        }
    } 
    //else: leave community at null
  },
  navigate: function(route) {
    var community = this.state.community;
    var id = community ? community.getId() : this._routeParams.get('id');
    var instruction = this._router.generate([
      'Community', {id: id, route: route}
    ]);
    var urlCall=instruction.toRootUrl()
    this._location.go(urlCall);
    this.route = route;
  },
});

module.exports = CommunityComponent;
