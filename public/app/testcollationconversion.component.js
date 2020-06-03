var $ = require('jquery')
  , CommunityService = require('./services/community')
  , config = require('./config')
  , DualFunctionService = require('./services/dualfunctions')
;

var TestCollationConversionComponent = ng.core.Component({
  selector: 'tc-managemodal-test-collation-conversion',
  templateUrl: '/app/testcollationconversion.html',
  inputs : ['community'],
}).Class({
  constructor: [CommunityService, function(communityService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.message=this.success=this.header=""
    }],
  closeModalCE: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  ngOnInit: function() {
    this.header="Test Collation for "+this.community.attrs.name;
//    BrowserFunctionService.makeJsonList();
  },
  ngOnChanges: function() {
//    this.communi
    this.message="";
    this.success="";
    $('#manageModal').width("900px");
    $('#manageModal').height("710px");
  },
  submit: function(){
      var self=this;
      this.converted=DualFunctionService.makeJsonList(this.testText, "TEST");
  }
});



module.exports = TestCollationConversionComponent;
