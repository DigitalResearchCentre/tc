var EventEmitter = ng.core.EventEmitter
  , AuthService = require('./auth')
  , CommunityService = require('./community')
  , DocService = require('./doc')
;

var UIService = ng.core.Class({
  constructor: [AuthService, CommunityService, DocService,
    function(authService, communityService, docService){

    var self = this;
    this.state = {};
    this.loginModel$ = new EventEmitter();
    this.manageModal$ = new EventEmitter();
    this.newPage$ = new EventEmitter();
    this.sendCommand$ = new EventEmitter();
    this.sendXMLData$ = new EventEmitter();
    this._communitySubject = new EventEmitter();
    this._communityService = communityService;
    this._docService = docService;

    authService.authUser$.subscribe(function(authUser) {
      if (authUser) {
        self.authUser = authUser;
        var memberships = authUser.attrs.memberships;
        if (!self._community && memberships.length === 1) {
          self.setCommunity(memberships[0].community);
        }
      }
    });
    this.community = null;
  }],
  setCommunity: function(community) {
    var state = this.state;
    if (state.community !== community) {
      this.community = state.community = community;
      this._communityService.fetch(
        community.getId(), 
        {
          populate: JSON.stringify('documents entities')
        }
      ).subscribe();
      if (community) {
        if (!_.isEmpty(community.attrs.documents)) {
          this.setDocument(_.get(community, 'attrs.documents.0'));
        } else {
          //set document to null
          this.document=null;
        }
      }
    }
    return community;
  },
  setState: function(key, value) {
    return _.set(_state, key, value);
  },
  selectCommunity: function(community) {
    this.community = community;
  },
  setDocument: function(doc) {
    var self =  this;
    if (doc !== this.document) {
      this.document = doc;
      this.document.expand = true;
      this._docService.fetch(doc.getId(), {
        populate: JSON.stringify('children'),
      }).subscribe(function(doc) {
        var first = _.first(doc.attrs.children);
        if (first) {
          self.selectPage(first);
        }
      });
    }
    return doc;
  },
  selectPage: function(page) {
    var docService = this._docService
      , self = this
    ;
    docService.fetch(page.getId(), {
      populate: JSON.stringify('children revisions')
    }).subscribe();

    docService.getTextTree(page).map(function(teiRoot) {
      console.log(docService.json2xml(teiRoot));
    }).subscribe();
  },
});

module.exports = UIService;
