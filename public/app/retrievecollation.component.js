var $ = require('jquery')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , BrowserFunctionService = require('./services/functions')
;

var RetrieveCollationComponent = ng.core.Component({
  selector: 'tc-managemodal-retrievecollation',
  templateUrl: '/app/retrievecollation.html',
  inputs : ['community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.message=this.success=this.header;""
    }],
  closeModalCE: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  ngOnInit: function() {
    this.header="Retrieve Collation for "+this.community.attrs.name;
  },
  ngOnChanges: function() {
//    this.communi
    this.message="";
    this.success="";
    $('#manageModal').width("500px");
    $('#manageModal').height("210px");
  },
  submit: function(){
      var self=this;
      $.get(config.BACKEND_URL+'getCollations/?community='+this.community.attrs.abbr, function(res) {
          var bill=res;
          self.success="Collation for "+res.length+" block(s) found. Now downloading..Check your downloads folder; close this window when it is downloaded"
          BrowserFunctionService.download("["+res+"]", self.community.attrs.abbr+"-COLLATION", "application/json")
      });
  }
});



module.exports = RetrieveCollationComponent;
