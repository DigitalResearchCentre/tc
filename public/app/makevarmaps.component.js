var $ = require('jquery');
var URI = require('urijs')
  , UIService = require('./services/ui')
  , CommunityService = require('./services/community')
  , DocService = require('./services/doc')
  , config = require('./config')
  , UpdateDbService = require('./services/updatedb')
  , async = require('async')
  , BrowserFunctionService = require('./services/functions')
 ;
//this cute code from https://jsfiddle.net/pdfjs/cq0asLqz/?utm_source=website&utm_medium=embed&utm_campaign=cq0asLqz
//works with  <script src="//mozilla.github.io/pdf.js/build/pdf.js"></script>
//require('jquery-ui/draggable');
//require('jquery-ui/resizable');
//require('jquery-ui/dialog');

var MakeVarMapsComponent = ng.core.Component({
  selector: 'tc-managemodal-createVarMaps',
  templateUrl: '/app/makevarmaps.html',
   inputs : ['community'],
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereaderBinary'),
    require('./directives/filereaderBinary2'),
  ],
}).Class({
  constructor: [
     CommunityService, UIService, DocService, function(
        communityService, uiService, docService
    ) {
    var self=this;
//    var Doc = TCService.Doc, doc = new Doc();
	this.pdfjsLib =  window['pdfjs-dist/build/pdf'];
	this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';

    this.doc = {name:""};
    $('#manageModal').width("420px");
    $('#manageModal').height("285px");
    this.message="";
    this.success="";
    this.text="";
    this.uiService = uiService;
    this._communityService = communityService;
    this.uiService.getFileName$.subscribe(function (fileName) {
      if (fileName.type=="pdf1") self.pdf=fileName.name;  //pdf unlabelled
      if (fileName.type=="pdf2") self.pdf2=fileName.name;  //pdf2 labelled
    });
    $.get(config.BACKEND_URL+'getDocNames/?community='+uiService.state.community._id, function(res) {
		for (var i=0; i<self.state.community.attrs.documents.length; i++) {
			self.state.community.attrs.documents[i].attrs.name=res[i].name;
		}
		//filter those already selected; prepare to deselect, etc, as needed
	 })
    this._docService = docService;
    this.doc = {name:"", text:""};
    /*this for scope variables */
    this.filecontent = '';
    this.state=uiService.state;
    
  }],
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  filechange2: function(filecontent) {
    this.filecontent2 = filecontent;
  },
  submit: function() {
    var self = this
      , docService = this._docService
      , text = this.text || this.filecontent  //without witness labels
      , text2 = this.text2 || this.filecontent2   //with witness labels
      , community = this.state.community
    ;
    this.message="";
    this.success="";
    var positions=[];
     if (this.doc.name === undefined || this.doc.name.trim() === "" ) {
      this.message = 'The Variant Map must have a name';
      $('#MMADdiv').css("margin-top", "0px");
      $('#MMADbutton').css("margin-top", "10px");
      $('#manageModal').height("340px");
      return;
    } else { 
    	$.post(config.BACKEND_URL+'isAlreadyVMap?'+'name='+this.doc.name+'&community='+community.attrs.abbr, function(res) {
			if (!res.success) {
				self.message="Database error";
				return;
			} else {
				if (res.isDuplicate) {
					self.message="There is already a Variant Map named "+self.doc.name+"."
					 $('#manageModal').height("340px");
					return;
				} else {		
					//do we already have a document with this name...?
					if (!text) {
					  self.message = 'Choose a pdf stemma file without witness labels';
					 $('#manageModal').height("340px");
					  return;
					}
					if (!text2) {
					  self.message = 'Choose a pdf stemma file with witness labels';
					  $('#manageModal').height("340px");
					  return;
					}

					self.message="";
					self.success="Reading PDF documents.";
				// pdf read in as readAsDataURL; have to strip off preface
					//first: check that the unlabelled pdf is ok
					text=text.replace("data:application/pdf;base64,", "")
					try { var textout=atob(text);}
					catch(err) {
						self.success="";
						self.message+="Error reading "+self.pdf+". Is it a pdf file?"
						$('#manageModal').height("340px");
						return;
					}
					var loadingTask = self.pdfjsLib.getDocument({data: textout});
					loadingTask.promise.then(function(pdf) {
						self.success+= " "+self.pdf+" read. ";
						$('#manageModal').height("340px");
					})
					.catch(function(err){
						self.success="";
						self.message+="Error reading "+self.pdf+". Is it a pdf file?" 
						$('#manageModal').height("340px");
						return;   
					});
					text2=text2.replace("data:application/pdf;base64,", "")
					try {var text2out=atob(text2)}
					catch(err) {
						self.success="";
						self.message+="Error reading "+self.pdf2+". Is it a pdf file?"
						$('#manageModal').height("340px");
						return;
					}
					var pheight=0;
					var pwidth=0;
					loadingTask = self.pdfjsLib.getDocument({data: text2out});  //this must be the labelled file
					loadingTask.promise.then(function(pdf) {
						pdf.getPage(1).then(function(page) {
							pheight=page.view[3];
							pwidth=page.view[2];
						    var vMap={name: self.doc.name.trim(), community: self.community.attrs.abbr, pheight: pheight, pwidth: pwidth, pdfunlabelled:{name: self.pdf, src: text}, pdflabelled:{name:self.pdf2, src: text2 }, wits: positions};
							page.getTextContent().then(function(textContent) {
								for (var i=0; i<textContent.items.length; i++) {
									var thisDoc=self.community.attrs.documents.filter(function (obj){return String(obj.attrs.name) == textContent.items[i].str})[0];
									if (thisDoc) {
										positions.push({name:textContent.items[i].str, x:textContent.items[i].transform[4], y:pheight-textContent.items[i].transform[5]})
									}
								}
								self.success+= " "+self.pdf2+" read. ";
								//create the vmap structure;
								var vMap={name: self.doc.name.trim(), community: self.community.attrs.abbr, pheight: pheight, pwidth: pwidth, pdfunlabelled:{name: self.pdf, src: text}, pdflabelled:{name:self.pdf2, src: self.filecontent2 }, wits: positions};
								//close this dialogue. And start a new one to edit this vmap
								self.closeModalADX();
								setTimeout(() => {  
									self.uiService.manageModal$.emit({type:'edit-vmap', vMap: vMap});
								}, 1000);
							}).catch(function(err){
								self.success="";
								self.message+="Error reading "+self.pdf2+". Is it a pdf file?"
								$('#manageModal').height("340px");
								return;
							}) 
						}).catch(function(err){
							self.message+="Error reading "+self.pdf2+". Is it a pdf file?"
							$('#manageModal').height("340px");
							self.success="";
							return;
						})
					}).catch(function(err){
						$('#manageModal').height("340px");
						self.success="";
						self.message+="Error reading "+self.pdf+". Is it a pdf file?"
						return;
					})
				}
			}
		});
	 }
  },
  closeModalADX: function() {
    this.message=this.success=this.doc.name=this.text="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    $('#manageModal').height("285px");
    this.filecontent = '';
    this.state=this.uiService.state;
    this.doc = {name:"", text:""};
    $('#FRinput').val("");
  }
});



module.exports = MakeVarMapsComponent;
