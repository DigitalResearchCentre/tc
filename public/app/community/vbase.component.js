var UIService = require('../services/ui')
, Viewer = require('./viewer.component')
, config = require('../config')
, async = require('async')
, $ = require('jquery')
, Router = ng.router.Router
, sortBy = require('sort-array')
;

var VBaseComponent = ng.core.Component({
  selector: 'tc-community-vbase',
  templateUrl: '/app/community/vbase.html',
  inputs: [
    'community',
  ],
  directives: [
  	require('../directives/filereader'),
    require('../directives/splitter').SPLITTER_DIRECTIVES,
    Viewer,
  ]
}).Class({
  constructor: [Router, UIService, function(router, uiService) {
  	var self=this;
    this.state = uiService.state;
    if (this.state.authUser._id) {
      for (var i=0; i<this.state.authUser.attrs.memberships.length; i++) {
        if (this.state.authUser.attrs.memberships[i].community.attrs._id==this.state.community.attrs._id)
          this.role=this.state.authUser.attrs.memberships[i].role;
      }
    } else this.role="NONE";
    this._router = router;
    this.viewers=[];
    this.uiService=uiService;
    this.uiService.getFileName$.subscribe(function (filename) {
      filename.indexOf('.')!=-1? self.filename = filename.substr(0, filename.lastIndexOf('.')): self.filename=filename;
    });
    this.success="Loading..."
    this.vBases=[];
    this.vBase={};
    this.showWitList=false;
    this.searchDone=false;
    this.found=0;
    this.doSaveCondition=false;
    this.conditionName="";
    this.origConditionName="";
    this.varFrom=1;
    this.varTo=50;
    this.error="";
    this.varnums=[0,1,2,3,4,5,6,7,8,9,"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]

  }],
  ngOnInit: function() {
    var self=this;
    this.error=this.success="";
    $.post(config.BACKEND_URL+'community/'+this.community.attrs.abbr+'/vbases/', function(res) {
      if (res.result=="success") {
      	if (res.nvars==0) {
      		self.error="No VBases present for this community."
      		self.success="";
      	} else {
      		self.vBases=res.vBases;
      		self.vBase=self.vBases[0];
      		if (!self.vBase.witlist.includes('\\all')) self.vBase.witlist.push("\\all");
      		self.success=self.vBases.length+" VBase(s) loaded";
      		if (self.vBase.conditionsets.length>1) { //first variants set is always blank
      			self.conditions=self.vBase.conditionsets[1].conditions;
      			self.conditionName=self.origConditionName=self.vBase.conditionsets[1].name;
      			self.vBase.conditionsets[1].selected=true;
      			for (var i=2; i<self.vBase.conditionsets.length; i++) {
      				self.vBase.conditionsets[i].selected=false;
      			}
      			self.searchVBase();
      		}
      		else self.conditions=self.vBase.conditionsets[0].conditions;
      	}
      }
      var height=window.innerHeight-$("tc-header").height()-$("div.container-fluid").height()-$("tc-manage-community").height();
      $(".panel-left").height(height);
      $(".panel-right").height(height);
      window.addEventListener('resize', function (event){
      	  var height=window.innerHeight-$("tc-header").height()-$("div.container-fluid").height()-$("tc-manage-community").height();
      	  $(".panel-left").height(height);
      	  $(".panel-right").height(height);
      });
    });
  },
 /* ngDoCheck: function(){   //a bit costly in overhead... ngOnChanges does not seem to work as expected
  	//if we have changed a vbase name.. go change it..
  	for (var j=0; j<this.vBases.length; j++) {
  		if (this.vBases[j].name!=this.vBases[j].origname) {
  			this.vBases[j].saved=false;
  		} else {
  			if (this.vBases[j].indb) this.vBases[j].saved=true;
  		}
  	}
  }, */
  changeVBName: function(){
  	 for (var j=0; j<this.vBases.length; j++) {
  		if (this.vBases[j].name!=this.vBases[j].origname) {
  			this.vBases[j].saved=false;
  		} else {
  			if (this.vBases[j].indb) this.vBases[j].saved=true;
  		}
  	}
  },
  isVBase: function(){
  	if (JSON.stringify(this.vBase) === '{}') return(false);
  	else return(true);
  },
  onResize: function($event) {
  	  var height=window.innerHeight-$("tc-header").height()-$("div.container-fluid").height()-$("tc-manage-community").height();
      $(".panel-left").height(height);
      $(".panel-right").height(height);
  },
  choose: function(vBase) {
  	var self=this;
  	for (var j=0; j<this.vBases.length; j++){this.vBases[j].selected=false};
  	if (vBase.varsites.length==0) {
  		$.post(config.BACKEND_URL+'getVBase?'+'name='+vBase.origname+'&community='+this.community.attrs.abbr, function(res) {
  			if (res.success) {
  				vBase.varsites=res.varsites;
  				vBase.conditionsets=res.conditionsets;
  				vBase.selected=true;
  				vBase.witlist=res.witlist;
  				self.vBase=vBase;
  				if (!self.vBase.witlist.includes('\\all')) self.vBase.witlist.push("\\all");
   				self.conditions=vBase.conditionsets[0].conditions;
   				self.searchDone=false;
  			}
  			else self.error="Database error";
  		});
  	} else {
  		vBase.selected=true;
  		this.vBase=vBase;
  		this.searchDone=false;
  		this.conditions=vBase.conditionsets[0].conditions;
  	}
  },
  addCondition: function () {
  	this.conditions.push({in: true, spec:"", wits:""});
  },
  removeCondition: function (i) {
  	this.conditions.splice(i, 1);
  },
  chooseSearch: function (conditionset) {
  	this.conditions=conditionset.conditions;
  	this.conditionName=this.origConditionName=conditionset.name;
  	for (var i=1; i<this.vBase.conditionsets.length; i++) {
  		if (this.origConditionName==this.vBase.conditionsets[i].name) this.vBase.conditionsets[i].selected=true;
		else this.vBase.conditionsets[i].selected=false;
  	}
  	this.searchVBase();
  },
  deleteCond: function(conditionset) {
  	var self=this;
  	$.post(config.BACKEND_URL+'deleteVBCondition?'+'vBase='+this.vBase.origname+'&community='+this.community.attrs.abbr+'&condition='+conditionset.name, function(res) {
  		if (res.success=="1") { //keep in sync
  			$.post(config.BACKEND_URL+'getVBaseConditions?'+'name='+self.vBase.origname+'&community='+self.community.attrs.abbr, function(res) {
  				  var isChosen=conditionset.selected;
  				  self.vBase.conditionsets=res.conditionsets;
  				  if (isChosen && self.vBase.conditionsets.length>1) {  //set up with first set of conditions chosen
  				  	self.conditions=self.vBase.conditionsets[1].conditions;
  				  	self.vBase.conditionsets[1].selected=true;
  				  	self.conditionName=self.origConditionName=self.vBase.conditionsets[1].name;
  				  	for (var i=2; i<self.vBase.conditionsets.length; i++) {
						self.vBase.conditionsets[i].selected=false;
					}
					self.searchVBase();
  				  }
  				  if (isChosen && self.vBase.conditionsets.length==1) {//do search to load
  				  	self.conditionName=self.origConditionName="";
  				  	self.searchDone=false;
  					self.varsites=[];
  					self.found=0;
  				  }
  				  if (!isChosen) {//must be at least one element left..
					for (var i=1; i<self.vBase.conditionsets.length; i++) {
						if (self.origConditionName==self.vBase.conditionsets[i].name) self.vBase.conditionsets[i].selected=true;
						else self.vBase.conditionsets[i].selected=false;
					}
  				  }
  			})
  		}
  	});
  },
  saveCondition: function(){  //can only be here after a successful search
  	var self=this;
  	this.error=this.success="";
  	if (!this.vBase.indb) {
  		this.error="You must save this vBase to the database before you can save a search. Use the \"Save\" button beside this vBase in the left column";
  		return;
  	}
  	if (this.conditionName=="") {
  		this.error="You must provide a name for the search you are saving";
  		$(".saveCondVB").css('background-color', '#ffdddd');
  		return;
  	} else {
  		if (this.conditionName.length>24) {
  			this.error="The search name must be less than 24 characters long";
  			$(".saveCondVB").css('background-color', '#ffdddd');
  			return;
  		}
  		if (this.conditionName==this.origConditionName) { //save changes to existing condition
  			//annoyingly ... we have to delete the conditions then add them back. Update in site does not work. Spent ages figuring that
  			$.post(config.BACKEND_URL+'deleteVBCondition?'+'vBase='+this.vBase.origname+'&community='+this.community.attrs.abbr+'&condition='+this.conditionName, function(res) {
  				if (res.success=="1") {
  				//get the offset of the existing condition
  					var offset=0;
  					for (var i=1; i<self.vBase.conditionsets.length; i++) {
  						if (self.vBase.conditionsets[i].name==self.origConditionName) offset=i;
  					}
  					$.ajax({
						url: config.BACKEND_URL+'insertVBConditions?community='+self.community.attrs.abbr+'&vBase='+self.vBase.name,
						type: 'POST',
						data:  JSON.stringify({offset:offset, name: self.conditionName, conditions: self.conditions}),
						accepts: 'application/json',
						contentType: 'application/json; charset=utf-8',
						dataType: 'json'
					}).done(function(data) {
						self.success="Search "+self.conditionName+" saved to database";
						$(".saveCondVB").css('background-color', 'white');
					}).fail(function( jqXHR, textStatus, errorThrown) {
						self.error="error" + errorThrown ;
					});
  				}
  			});
  		} else {//we are trying to save under the name of an existing condition
			for (var i=0; i<this.vBase.conditionsets.length; i++) {
				if (this.vBase.conditionsets[i].name==this.conditionName) {
					this.error="There is already a search named \""+this.conditionName+"\"";
					$(".saveCondVB").css('background-color', '#ffdddd');
					return;
				}
			}
		//we are here.. we can save. This time just add to array
			$.ajax({
				url: config.BACKEND_URL+'saveVBName?community='+this.community.attrs.abbr+'&vBase='+this.vBase.name,
				type: 'POST',
				data:  JSON.stringify({name: this.conditionName, conditions: this.conditions}),
				accepts: 'application/json',
				contentType: 'application/json; charset=utf-8',
				dataType: 'json'
			}).done(function(data) {
				self.success="Search "+self.conditionName+" saved to database";
				$(".saveCondVB").css('background-color', 'white');
				//we have to push these conditions to the local condition sets. 
				//loaded conditions might be out of sync. So reload the conditions for this vBase to bring browser and vBase in sync
				$.post(config.BACKEND_URL+'getVBaseConditions?'+'name='+self.vBase.origname+'&community='+self.community.attrs.abbr, function(res) {
					self.vBase.conditionsets=res.conditionsets;
					self.origConditionName=self.conditionName;  //serves as a flag so we know its in the db under this name
					for (var i=1; i<self.vBase.conditionsets.length; i++) {
						if (self.vBase.conditionsets[i].name==self.origConditionName) self.vBase.conditionsets[i].selected=true;
						else self.vBase.conditionsets[i].selected=false;
					}
				});
			}).fail(function( jqXHR, textStatus, errorThrown) {
				self.error="error" + errorThrown ;
			});
		}
  	}
  },
  searchVBase: function(){ //ok so this is where it happens
  	var found=[];
  	var varsites=[];
  	this.error="";
  	this.searchDone=false;
  	if (!this.vBase.witlist.includes('\\all')) this.vBase.witlist.push("\\all");
  	//parse the conditions first
  	for (var k=0; k<this.conditions.length; k++) {
  		var wits=this.conditions[k].wits.split(" ");
  		this.conditions[k].witoffsets=[];
  		for (var m=0; m<wits.length; m++) {if (wits[m]=="") wits.splice(m--, 1)};
  		if (wits.length==0) {
  			if (k==0 && this.conditions.length==1) {
  				this.error="No witnesses specified. You have to list some witnesses!"
  				var condition=".conditionVB:nth('0')";
  				$(condition).css('background-color', '#ffdddd');
  				break;
 		    } else {
  		    	this.conditions.splice(k, 1);
				this.error+="No witnesses specified in condition. That condition removed. ";
				k--;
				continue;
  		    }
  		}
  		else {
  			var condition=".conditionVB:nth("+k+")";
  			$(condition).css('background-color', 'white');
			for (var j=0; j<wits.length; j++) {
				var place=this.vBase.witlist.indexOf(wits[j]);
				if (place==-1) {
					this.error="Witness \""+wits[j]+"\" in condition "+(k+1)+" not present in the witness list";
					var condition=".conditionVB:nth("+k+")";
					$(condition).css("color", "red");
					return;
				} else {
					var condition=".conditionVB:nth("+k+")";
					$(condition).css("color", "black");
					this.conditions[k].witoffsets.push(place);
				}
			}
		} 
		//check if there is anything in the specifications
		if (this.conditions[k].spec) {
			var regex = /\d+/g;
			var matches = this.conditions[k].spec.match(regex);
			if (this.conditions[k].gt) delete this.conditions[k].gt;
			if (this.conditions[k].lt) delete this.conditions[k].lt;
			if (this.conditions[k].nwits) delete this.conditions[k].nwits;
			if (!matches) {
				this.error="Specification \""+this.conditions[k].spec+"\" in condition "+(k+1)+" must contain a number";
				var spec=".specVB:nth("+k+")";
				$(spec).css("color", "red");
				return;
			} else {
				var spec=".specVB:nth("+k+")";
				$(spec).css("color", "black");
				this.conditions[k].nwits=parseInt(matches[0]);
			}
			if (this.conditions[k].spec.indexOf("<")!=-1) {
				this.conditions[k].lt=true;
			} else if (this.conditions[k].spec.indexOf(">")!=-1) {
				this.conditions[k].gt=true;
			}
		}
  	}
  	///ok teed up conditions now...
  	for (var i=0; i<this.vBase.varsites.length; i++) {
  		for (var j=0; j<this.vBase.varsites[i].variants.length; j++) {
  			var condFail=false;
  			for (var k=0; k<this.conditions.length; k++) {
  				var t=this.varnums[j];
  				var nts=0; 
  				if (this.conditions[k].wits=="\\all") {
  				  for (var l=0; l<this.vBase.varsites[i].matrix.length; l++) {
  				  	if (this.vBase.varsites[i].matrix[l]==t) nts++;
  				  }
  				}
  				else for (var l=0; l<this.conditions[k].witoffsets.length; l++) {
  					if (this.vBase.varsites[i].matrix[this.conditions[k].witoffsets[l]]==t) nts++;
  				}
  				if (this.conditions[k].spec=="") {
  					if (this.conditions[k].in) {
  						if (this.conditions[k].witoffsets.length!=nts) {
  							condFail=true;
  							k=this.conditions.length;
  						}
  					} else {
  						if (nts!=0) {
  							condFail=true;
  							k=this.conditions.length;
  						}
  					}
  				} else {//we have a spec...Can either be < or > or the same number as mss found
  					if (this.conditions[k].gt) {
  						if (nts<=this.conditions[k].nwits) {
  							condFail=true;
  							k=this.conditions.length;
  						}
  					} else if (this.conditions[k].lt) {
  						if (nts>=this.conditions[k].nwits) {
  							condFail=true;
  							k=this.conditions.length;
  						}
  					} else {
  						if (nts!=this.conditions[k].nwits) {
  							condFail=true;
  							k=this.conditions.length;
  						}
  					}
  				}
   			}
  			if (!condFail) {
  				found.push({varsite:i, variant:j});
  			}
  		}
  	}
  	this.success="Search finished";
	for (var i=this.varFrom-1; i<this.varTo && i<found.length; i++) {
		//ok... let's put it nicely together here
		//make the lemma..
		var varsite=this.vBase.varsites[found[i].varsite];
		var nvars=found[i].variant;
		var entName=varsite.entity;
		var voffset=this.varnums[nvars];
		var readings=[];
		var nwits=0;
		var wits=""
		//do reading first
		for (var k=0; k<varsite.matrix.length; k++) {
			if (varsite.matrix[k]==voffset) {
				nwits++;
				if (wits=="") wits+=this.vBase.witlist[k];
				else  wits+=" "+this.vBase.witlist[k];
			}
		}
		readings.push({reading: "<span style='color:red'>"+varsite.variants[nvars]+"</span>", nWits: nwits, wits: wits});
		for (var j=0; j<varsite.variants.length; j++) {
			if (j!=nvars) {
				var voffset=this.varnums[j];
				nwits=0;
				wits="";
				for (var k=0; k<varsite.matrix.length; k++) {
					if (varsite.matrix[k]==voffset) {
						nwits++;
						if (wits=="") wits+=this.vBase.witlist[k];
						else  wits+=" "+this.vBase.witlist[k];
					}
				}
				readings.push({reading: varsite.variants[j], nWits: nwits, wits: wits});
			}
		}
		//make the lemma
		var start=0, end=0, lemstart=parseInt(this.vBase.varsites[found[i].varsite].from), lemend=parseInt(this.vBase.varsites[found[i].varsite].to), lemma="";
		//might be whole block..
		if (!this.vBase.varsites[found[i].varsite].from) {
			lemma="Whole block";
		} else {
			for (var k=found[i].varsite; k>=0; k--) {
				if (this.vBase.varsites[k].entity!=varsite.entity || (!this.vBase.varsites[k].from)) {
					start=k+1;
					k=0;
				} else if (k==0) {
					start=0;
				}
			}
			for (var k=found[i].varsite; k<this.vBase.varsites.length; k++) {
				if (this.vBase.varsites[k].entity!=varsite.entity || (!this.vBase.varsites[k].to)) {
					end=k-1;
					k=this.vBase.varsites.length;
				} else if (k==this.vBase.varsites.length-1) end=k;
			}
			for (var k=start; k<=end; k++) {
				//exclude cases where we have an overlap: ie varfrom of consecutive varsites are identical
				if (this.vBase.varsites[k].from!=this.vBase.varsites[k-1].from) {
					if (this.vBase.varsites[k].from==lemstart) lemma+="<span style='color:red'>"+this.vBase.varsites[k].variants[0]+"</span> ";
					else if (parseInt(this.vBase.varsites[k].from)<lemstart || parseInt(this.vBase.varsites[k].to)>lemend ) lemma+=this.vBase.varsites[k].variants[0]+" ";
				}
			}
		}
		varsites.push({lemma: "<b>"+varsite.entity+": "+lemma+"</b>", readings: readings});
	}
  	this.searchDone=true;
  	this.varsites=varsites;
  	this.found=found.length;
  },
  toggleinout: function(condition) {
  	if (condition.in) condition.in=false;
  	else condition.in=true;
  },
  save: function(vBase) { //write the vbase to the dbase
  	var self=this;
  	if (!vBase.saved) {
  		if (!vBase.indb) {
			$.post(config.BACKEND_URL+'isAlreadyVBase?'+'name='+vBase.name+'&community='+this.community.attrs.abbr, function(res) {
				if (!res.success) self.error="Database error";
				else {
					if (res.isDuplicate) {
						self.error="There is already a vBase named "+vBase.name+". Change the name of the vBase and try again."
					} else { //here we are going to save the vBase
					   $.ajax({
						  url: config.BACKEND_URL+'saveVBase?'+'community='+self.community.attrs.abbr+"&name="+vBase.name,
						  type: 'POST',
						  data:  JSON.stringify(vBase),
						  accepts: 'application/json',
						  contentType: 'application/json; charset=utf-8',
						  dataType: 'json'
						})
						 .done(function( data ) {
						   self.success="VBase "+vBase.name+" saved to database";
						   vBase.saved=true;
						   vBase.indb=true;
						   vBase.origname=vBase.name;
						  })
						 .fail(function( jqXHR, textStatus, errorThrown) {
							self.error="error" + errorThrown ;
						});
					}
				}
			});
		} else { //we are just changing the name of the database
			$.post(config.BACKEND_URL+'changeVBaseName?origname='+vBase.origname+'&community='+this.community.attrs.abbr+"&name="+vBase.name, function(res) {
				if (!res.success) self.error="Database error";
				else self.success="VBase saved as "+vBase.name;
				vBase.origname=vBase.name;
				vBase.saved=true;
			});
		}
  	}
  },
  delete: function(vBase) {
  	var self=this;
  	for (var j=0; j<this.vBases.length; j++) {
  		if (this.vBases[j]==vBase) {  //also pull from database
  			if (vBase.indb) {
				var k=j;
				$.post(config.BACKEND_URL+'deleteVBase?'+'name='+vBase.origname+'&community='+this.community.attrs.abbr, function(res) {
					if (res.success)  self.vBases.splice(k, 1);
					else self.error="Database error";
				});
			} else self.vBases.splice(j, 1);
  		}
  	};
  },
  filechange: function(filecontent, filename) {
     var myXMLDOM = new DOMParser().parseFromString(filecontent, "text/xml");
     var apps=myXMLDOM.getElementsByTagName("app");
	 var wits=myXMLDOM.getElementsByTagName("witness");
	 var newVBase={};
	 this.error="";
	 this.success="Loading...";
	 var nRdgs=0;
	 newVBase.witlist=[];
	 newVBase.varsites=[];
	  //if we don't have either of these abort;
	  if (wits.length==0) {
	  	this.error="The XML input file teiHeader <sourceDesc> lacks a <listWit> element with embedded <witness> elements.";
		return;
	  }
	  if (apps.length==0) {
		 this.error="The XML input file contains no <app> elements.";
		 return;
	  } else {
	  	""+apps.length+" elements found in this file. Converting the file into a VBase"
	  }
	var witsMap= new Map();
	for (var i=0; i<wits.length; i++) {
		newVBase.witlist.push(wits[i].childNodes[0].nodeValue);
		witsMap.set(wits[i].childNodes[0].nodeValue, i);
  	}
  	//ok. Let's go through the list now...
  	var noLabelWarningGiven=false;
  	var noVartypeWarningGiven=false;
   	var noVarFromToWarningGiven=false;
  	var lemPresentWarningGiven=false;
   	var rdgAbsentWarningGiven=false;
 	for (var i=0; i<apps.length; i++) {
		label=apps[i].getAttribute("n");
		if (!label) {
			if (!noLabelWarningGiven) this.error+="\rNo n value declared for an app element. Using the number of the app instead";
			noLabelWarningGiven=true;
			label=i+1;
		}
		var vartype=apps[i].getAttribute("type");
		var varfrom=apps[i].getAttribute("from");
		var varto=apps[i].getAttribute("to");
		if (!vartype) {
			if (noVartypeWarningGiven) this.error+="\rNo variant type value declared for an app element. Using type=main instead";
			noVartypeWarningGiven=true;
			vartype="main";
		}
		if (vartype=="main") {
		  var matrixrow = new Array(wits.length)
		  matrixrow.fill("?");
		  if (!varfrom || !varto) {
			if (noVarFromToWarningGiven) this.error+="\rNo from and/or to value declared for an app element. Using from and to=0 instead. This will cause problems";
			noVarFromToWarningGiven=true;
			varfrom=varto=0;
		  }
		}
		else {  //must be a lacuna
		  var matrixrow = new Array(wits.length)
		  matrixrow.fill("0");
		}
		var varsites=[];
		var rdgs=apps[i].getElementsByTagName("rdg");
		nRdgs+=rdgs.length;
		var lems=apps[i].getElementsByTagName("lem");
		if (rdgs.length==0) {
		 	if (!rdgAbsentWarningGiven) this.error+="\rAn <app> element found with no <rdg> elements. This might result in unpredictable results";
		 	rdgAbsentWarningGiven=true;
		}
		
		if (lems.length>0) {
		 	if (!lemPresentWarningGiven) this.error+="\rA <lem> element found in a <rdg> elements. This iteration of VBase ignores <lem> elements, assuming that the first <rdg> element stands in place of a <lem>";
		 	lemPresentWarningGiven=true;
		}
		var varsite={};
		varsite.vartype=vartype;
		varsite.entity=label;
		if (vartype=="main") {
			varsite.from=varfrom;
			varsite.to=varto;
		}
		var variants=[];
		if (vartype=="lac") { //there are no witnesses missing this entity. Missing witnesses get 1. Wits present are 0
			  if (rdgs[0])	 {
				var lacwits=rdgs[0].getElementsByTagName("idno");
				for (var j=0; j<lacwits.length; j++) {
				  var thisWit=lacwits[j].childNodes[0].nodeValue;
				  var indexWit=witsMap.get(thisWit);
				  matrixrow[indexWit]=1;
				}
				variants.push("Block present");  //default. all wits present
				if (rdgs.length>0) { // some wits do not have the block. They are reading 1
					variants.push("Block absent"); 
				} 
			  }
			} else { //not dealing with whole block variants...
				//no variants -- ie only one reading -- but still need to record it
				if (rdgs.length==1) {
				  var rdgwits=rdgs[0].getElementsByTagName("idno");
				  variants.push(rdgs[0].childNodes[0].nodeValue);
				  for (j=0; j<rdgwits.length; j++) {
					var thisWit=rdgwits[j].childNodes[0].nodeValue;
					var indexWit=witsMap.get(thisWit);
					matrixrow[indexWit]=0;
				  }
				} else {//deal with multiple readings here
				  for (var j=0; j<rdgs.length; j++) {  //first reg is always the lemma. We ignore any lemma element present
					var rdgwits=rdgs[j].getElementsByTagName("idno");
					var rdgindex=this.varnums[j];
					var thisrdg=rdgs[j].childNodes[0].nodeValue;
					variants.push(thisrdg);
					for (var k=0; k<rdgwits.length; k++) {
					  var thisWit=rdgwits[k].childNodes[0].nodeValue;
					  var indexWit=witsMap.get(thisWit);
					  matrixrow[indexWit]=rdgindex;
					}
				  }
			}
		}
		varsite.variants=variants;
		varsite.matrix=matrixrow.join("");
		newVBase.varsites.push(varsite);
		newVBase.conditionsets=[{name:"", conditions:[{in: true, spec:"", wits:""}]}];
		if (i%1000==0) {
			this.success=""+i+" sites of variation processed for "+nRdgs+" variants";
		}
	}
	this.success=this.filename+" successfully loaded. "+apps.length+" sites of variation found, with "+nRdgs+" variants. Ready to search!"
	newVBase.nRdgs=nRdgs;
	newVBase.saved=false;
	newVBase.indb=false;
	newVBase.nVars=newVBase.varsites.length
	newVBase.selected=true;
	newVBase.origname=this.filename;
	newVBase.name=this.filename;  //passed by event emitter
	for (var j=0; j<this.vBases.length; j++){this.vBases[j].selected=false};
	this.vBase=newVBase;
	this.origConditionName=this.conditionName="";
	this.doSaveCondition=false;
	this.searchDone=false;
	this.conditions=this.vBase.conditionsets[0].conditions;
	this.vBases.push(newVBase);
  },
});


module.exports = VBaseComponent;
