var $ = require('jquery')
  , async = require('async')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;

var EditVmapsComponent = ng.core.Component({
  selector: 'tc-managemodal-editvmaps',
  templateUrl: '/app/editvmaps.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/modalresizable'),
  ],
  inputs: [
    'community'
  ]
}).Class({
  constructor: [
    UIService, DocService, ElementRef,
  function(
    uiService, docService, elementRef
  ) {
    this._docService = docService;
    this._elementRef = elementRef;
    this.uiService = uiService;
    this.message="";
    this.success="";
    this.vmaps=[];
    $('#manageModal').width("680px");
    $('#manageModal').height("555px");
  }],
  ngOnInit: function() {
  	var self=this;
  	this.vmaps=[];
 	$.post(config.BACKEND_URL+'community/'+this.community.attrs.abbr+'/vmaps/', function(res) {
 		self.vmaps=res.vMaps;
 	});
  },
  editVMap: function(vmap) {
  	var self=this;
  	$.post(config.BACKEND_URL+'getVMap?community='+this.community.attrs.abbr+'&name='+vmap, function(res) {
 		self.closeModalAP();
		setTimeout(() => {  
			self.uiService.manageModal$.emit({type:'edit-vmap', vMap: res.vmap});
		}, 1000);
 	});
  },
   closeModalAP: function() {
    $('#manageModal').modal('hide');
  },
  deleteVMap: function(vmap) {
  	var self=this;
  	 $.post(config.BACKEND_URL+'deleteVMap?community='+this.community.attrs.abbr+'&name='+vmap, function(res) {
  	  	if (res.success) {
  	  		for (let i=0; i<self.vmaps.length; i++) {
  	  			if (self.vmaps[i].name==vmap) {
  	  				self.vmaps.splice(i, 1);
  	  			}
  	  		}
  	  	}
  	 });
  }
});




module.exports = EditVmapsComponent;
