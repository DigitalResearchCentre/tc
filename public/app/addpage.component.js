var $ = require('jquery')
  , Router = ng.router.Router
  , UIService = require('./ui.service')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
  , AuthService = require('./auth.service')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var AddPageComponent = ng.core.Component({
  selector: 'tc-managemodal-addpage',
  templateUrl: '/app/addpage.html',
  directives: [
    require('./directives/filereader'),
    require('../directives/modaldraggable'),
  ],
  inputs: [
    'parent', 'after',
  ]
}).Class({
  constructor: [
    Router, CommunityService, AuthService, UIService, DocService, ElementRef,
  function(
    router, communityService, authService, uiService, docService, elementRef
  ) {
    this._docService = docService;
    this._router = router;
    this._elementRef = elementRef;

    this.uiService = uiService;
    this.message="";
    this.success="";
    this.oneormany="OnePage";
    this.pageName="";
    this.page={http:""};
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
      , url = config.IMAGE_UPLOAD_URL
      , $dropzone = $('.dropzone', $el);
    ;
    this.$dropzone = $dropzone;
    $('#manageModal').width("430px");
    $('#manageModal').height("355px");
    if (config.env !== 'production') {
      url += '?env=' + config.env;
    }
    $dropzone.dropzone({
      url: url,
      autoProcessQueue: false,
    });
    $dropzone.on('success', function(res) {
      console.log(res);
    });
  },
  ngOnChanges: function() {
    console.log(this.parent);
    console.log(this.after);
  },
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  showSingle: function() {
    $("#MMADPsingle").show();
    $("#MMADPmultiple").hide();
  },
  showMany: function(){
    $("#MMADPsingle").hide();
    $("#MMADPmultiple").show();
  },
  fromFile: function() {
    $("#MMAPPSingleFile").show();
    $("#MMAPPSingleWeb").hide();
  },
  fromWeb: function(){
    $("#MMAPPSingleWeb").show();
    $("#MMAPPSingleFile").hide();
  },
  fromZip: function() {
    $("#MMAPPMFF").show();
    $("#MMAPPMFDD").hide();
  },
  fromDD: function(){
    $("#MMAPPMFDD").show();
    $("#MMAPPMFF").hide();
  },
  submit: function() {
    var self = this
      , uiService = this.uiService
      , router = this._router
    ;
    if (this.oneormany=="OnePage") {
      if (this.pageName === "") {
        this.message="You must supply a name for the page";
        return;
      } else {
        this.message="";
        var options = {
          name: this.pageName, 
          text: '<text><body><pb n="'+this.pageName+'"/></body></text>'
        };
        if (this.parent) {
          options.parent = this.parent;
        } else if (this.after) {
          options.after = this.after;
        }

        this._docService.addPage(options).subscribe(function(page) {
          uiService.selectPage(page);
          router.navigate(['Community', {
            id: uiService.community.getId(), route: 'view'
          }]);

          self.$dropzone.each(function(i, el) {
            console.log(el);
            console.log(arguments);
            el.dropzone.processQueue();
          });
          console.log("added "+self.pageName);
          self.success="Page "+self.pageName+" added";
        });
      }
    }
   },
   closeModalAP: function() {
     this.message=this.success=this.pageName="";
     $('#manageModal').modal('hide');
   }
});

module.exports = AddPageComponent;


 
