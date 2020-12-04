var $ = require('jquery')
  , CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , config = require('./config')
  , BrowserFunctionService = require('./services/functions')
  , DualFunctionService = require('./services/dualfunctions')
;

var makeNexusCollationComponent = ng.core.Component({
  selector: 'tc-managemodal-makenexuscollation',
  templateUrl: '/app/makenexuscollation.html',
  inputs : ['community'],
  directives: [
    require('./directives/modaldraggable'),
    require('./directives/filereader'),
  ],
}).Class({
  constructor: [CommunityService, UIService, function(communityService, uiService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.success="";
    this.message="";
    this.uiService = uiService;
    }],
  closeModalCXN: function() {
    this.message=this.success="";
//    $('#MMADdiv').css("margin-top", "30px");
//    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  filechange: function(filecontent) {
    this.filecontent = filecontent;
  },
  ngOnChanges: function() {
    this.success="";
    this.message="";
    $('#manageModal').width("500px");
    $('#manageModal').height("150px");
  },
  submit: function(){
      var self=this;
      var text = this.filecontent;
      if (!text) {
        this.message = 'Choose a file';
        $('#manageModal').height("220px");
        return;
      } else $.post(config.BACKEND_URL+'validate?'+'id='+this.community.getId(), {
  //      xml: "<TEI><teiHeader><fileDesc><titleStmt><title>dummy</title></titleStmt><publicationStmt><p>dummy</p></publicationStmt><sourceDesc><p>dummy</p></sourceDesc></fileDesc></teiHeader>\r"+text+"</TEI>",
          xml: text,
      }, function(res) {
        if (res.error.length>0) {
          //check that error line exists
            self.uiService.manageModal$.emit({
              type: 'parse-xmlload',
              error: res.error,
              docname: "Source apparatus file",
              lines: text.split("\n")
            });
          return;
        } else {
          //convert this text to NEXUS...not asynchronous!
          self.success="Parsed uploaded file. Now convering to NEXUS";
          $('#manageModal').height("220px");
          self.message="";
          var result=DualFunctionService.makeNEXUS(text);
          result=result.replace(/<br\/>/gi, "\r").replace(/&nbsp;/gi," ");
    
          BrowserFunctionService.download(result, self.community.attrs.abbr+"-NEXUS", "text/plain");
		  self.message="";
		  self.success="Converted to NEXUS. Check your downloads folder.";
      }
    });
  }
});


//duplicates serverside function
//move to dualfunctions some time
function makeNEXUS(source) {
  var converted="#NEXUS\rBEGIN DATA;\r";
  var myXMLDOM = new DOMParser().parseFromString(source, "text/xml");
  var apps=myXMLDOM.getElementsByTagName("app");
  var wits=myXMLDOM.getElementsByTagName("witness");
  //if we don't have either of these abort;
  if (wits.length==0) {
      return({error:"The XML input file teiHeader <sourceDesc> lacks a <listWit> element with embedded <witness> elements.", result:""});
  }
  if (apps.length==0) {
      return({error:"The XML input file contains no <app> elements.", result:""});
  }
  var taxlabels="TAXLABELS\r";
  var matrix="MATRIX\r";
  var witsMap= new Map();
  var varnums=[0,1,2,3,4,5,6,7,8,9,"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
  for (var i=0; i<wits.length; i++) {
    taxlabels+="    ["+i+"] "+wits[i].childNodes[0].nodeValue+"\r";
    witsMap.set(wits[i].childNodes[0].nodeValue, i);
  }
  converted+="\rDIMENSIONS\r    NTAX="+wits.length+"\r    NCHAR="+apps.length+"\r;\r"
  converted+='FORMAT\r    respectcase SYMBOLS="0~9 a~z A~Z"\r    MISSING=?\r    GAP=-\r    TRANSPOSE\r;\r\r'
  converted+="STATELABELS\r";
  //do all the variants..
  for (var i=0; i<apps.length; i++) {
    var label=apps[i].getAttribute("n");
    var vartype=apps[i].getAttribute("type");
    var from=apps[i].getAttribute("from");
    var to=apps[i].getAttribute("to");
    if (vartype=="main") label+="_"+from+"_"+to; else label+="_whole";
    label=label.replace(/ /gi, "_").replace(/:/gi, "_").replace(/=/gi, "_").replace(/-/gi, "_");;
    converted+="    "+(i+1)+" "+label;
//build the matrix now too
//first deal with wits which have or do not have this verse
    if (vartype=="main") {
      var matrixrow = new Array(wits.length)
      matrixrow.fill("?");
    }
    else {
      var matrixrow = new Array(wits.length)
      matrixrow.fill("0");
    }
//    console.log(matrixrow);
    var rdgs=apps[i].getElementsByTagName("rdg");
    if (vartype=="lac") { //there are no witnesses missing this entity
      converted+=" whole"
      if (!rdgs[0])
        matrix+="    ["+(i+1)+"] "+label+" "+matrixrow.join("")+"\r";
      else {
        converted+=" lacuna"
        var lacwits=rdgs[0].getElementsByTagName("idno");
        for (var j=0; j<lacwits.length; j++) {
          var thisWit=lacwits[j].childNodes[0].nodeValue;
          var indexWit=witsMap.get(thisWit);
          matrixrow[indexWit]=1;
        }
        matrix+="    ["+(i+1)+"] "+label+" "+matrixrow.join("")+"\r";
      }
    } else { //not dealing with whole block variants...
        //no variants -- ie only one reading --
        if (rdgs.length==1) {
          var rdgwits=rdgs[0].getElementsByTagName("idno");
          converted+=" "+standardChar(rdgs[0].childNodes[0].nodeValue.replace(/ /gi,"_"));
          for (j=0; j<rdgwits.length; j++) {
            var thisWit=rdgwits[j].childNodes[0].nodeValue;
            var indexWit=witsMap.get(thisWit);
            matrixrow[indexWit]=0;
          }
          matrix+="    ["+(i+1)+"] "+label+" "+matrixrow.join("")+"\r";
        } else {//deal with multiple readings here
          for (var j=0; j<rdgs.length; j++) {
            var rdgwits=rdgs[j].getElementsByTagName("idno");
            var rdgindex=varnums[rdgs[j].getAttribute("varSeq")-1];
            converted+=" "+standardChar(rdgs[j].childNodes[0].nodeValue.replace(/ /gi,"_"));
            for (var k=0; k<rdgwits.length; k++) {
              var thisWit=rdgwits[k].childNodes[0].nodeValue;
              var indexWit=witsMap.get(thisWit);
              matrixrow[indexWit]=rdgindex;
            }
          }
          matrix+="    ["+(i+1)+"] "+label+" "+matrixrow.join("")+"\r";
        }
    }
    converted+="\r"
  }
  converted+=";\r\r"
  converted+=taxlabels+";\r\r";
  converted+=matrix+";\r";
  converted+="endblock;\r\rBEGIN ASSUMPTIONS;\r    ancstates archetype=0: all;\r;\rendblock;"
  return({error:"", result:converted});
}





module.exports = makeNexusCollationComponent;
