var $ = require('jquery')
  , async = require('async')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , RESTService = require('./services/rest')
  , Dropzone = require('dropzone')
  , ElementRef = ng.core.ElementRef
  , config = require('./config')
;


var EditVmapComponent = ng.core.Component({
  selector: 'tc-managemodal-editvmap',
  templateUrl: '/app/editvmap.html',
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/modalresizable'),
  ],
  inputs: [
    'vMap'
  ]
}).Class({
  constructor: [
    UIService, DocService, ElementRef, RESTService,
  function(
    uiService, docService, elementRef, restService
  ) {
    this._docService = docService;
    this._elementRef = elementRef;
    this.uiService = uiService;
    this.restService = restService;
    this.message="";
    this.chosen={name:"", left:"", top:""};
    this.addwit={name:"", left:50, top:50};
    this.success="";
    this.pdfjsLib = window['pdfjs-dist/build/pdf'];
	this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';
	$( window ).resize(function() {
		$('#manageModal').width($(window).width()-15);
    	$('#manageModal').height($(window).height()-15);
		document.getElementById("div1").style.height=document.getElementById("edVmap").offsetHeight-document.getElementById("div1").offsetTop-45+"px";
		document.getElementById("div2").style.height=document.getElementById("edVmap").offsetHeight-document.getElementById("div1").offsetTop-45+"px";
	});
  }],
  ngOnInit: function() {
  	this.pdf2=this.vMap.pdflabelled.src;
    $('#manageModal').width($(window).width()-15);
    $('#manageModal').height($(window).height()-15);
    var pdf1=atob(this.vMap.pdfunlabelled.src);
    var loadingTask = this.pdfjsLib.getDocument({data: pdf1});
    loadingTask.promise.then(function(pdf) {
    	pdf.getPage(1).then(function(page) {
    		var viewport = page.getViewport({scale: 1});
    		var canvas = document.getElementById('canvas1');
    		var context = canvas.getContext('2d');
    		canvas.height = viewport.height;
    		canvas.width = viewport.width;
    		var renderContext = {
			  canvasContext: context,
			  viewport: viewport
			};
			page.render(renderContext);
    	});
    }); 
  },
  submit: function() {
    var self = this;
    //update wits array
    for (var i=0; i<this.vMap.wits.length; i++) {
    	var myEl=document.getElementById(this.vMap.wits[i].name);
    	this.vMap.wits[i].x=parseInt(myEl.style.left, 10);
    	this.vMap.wits[i].y=parseInt(myEl.style.top, 10);
    }
    //save this sucker!!
    $.ajax({
		url: config.BACKEND_URL+'saveVMap?community='+this.uiService.state.community.attrs.abbr+'&name='+this.vMap.name,
		type: 'POST',
		data:  JSON.stringify(this.vMap),
		accepts: 'application/json',
		contentType: 'application/json; charset=utf-8',
		dataType: 'json'
	}).done(function(data) {
		self.success="Variant Map "+self.vMap.name+" saved to database";
	}).fail(function( jqXHR, textStatus, errorThrown) {
		self.message="Error " + errorThrown ;
	});
  },
  closeModalAP: function() {
    $('#manageModal').modal('hide');
  },
  editPlace: function(which) {
  	this.chosen.name=which;
  	this.chosen.left= parseInt(document.getElementById(which).style.left, 10);
  	this.chosen.top= parseInt(document.getElementById(which).style.top, 10);
   },
  changeLeft: function(){
  	  document.getElementById(this.chosen.name).style.left=this.chosen.left+"px";
  },
  changeTop: function(){
  	  document.getElementById(this.chosen.name).style.top=this.chosen.top+"px";
  },
  addWitWits: function(){
  	this.vMap.wits.push({name:this.addwit.name, x:parseInt(this.addwit.left, 10), y:parseInt(this.addwit.top,10)});
  	this.addwit.name="";
   	this.addwit.left=50;
   	this.addwit.top=50;
  }
});


module.exports = EditVmapComponent;
