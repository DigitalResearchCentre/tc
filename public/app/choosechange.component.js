var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , DocService = require('./services/doc')
  , config = require('./config')
;


var ChooseChangeComponent = ng.core.Component({
  selector: 'tc-document-choosechangecontrol',
  templateUrl: '/app/choosechange.html',
  inputs: [
    'community', 'context', 'parent', 'document', 'docname'
  ],
}).Class({
  constructor: [UIService, DocService, function(
       uiService, docService
  ) {
    var self=this;
    this._uiService = uiService;
    this._docService=docService;
    this.edit={control:{images:"ALL", imsg:"", transcripts:"ALL", tmsg:""}};
  }],
  ngOnInit: function() {
    var self=this;
    this.success = '';
  },
  closeModalCCo: function() {
    this.message=this.success="";
//    $('#MMADdiv').css("margin-top", "30px");
//    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
  },
  ngOnChanges: function() {
    var self=this;
    if (this.parent=="PAGE") {
      if (!this.document.attrs.control) this.document.attrs.control={images:"INHERITED", imsg:"", transcripts:"INHERITED", tmsg:""};
      this.header= "Who can see what on page "+this.document.attrs.name+" of document "+self.docname;
      this.edit.control=this.document.attrs.control;
    } else if (this.parent=="DOCUMENT") {
      this._docService.refreshDocument(this.document).subscribe(function(doc) {
        if (!doc.attrs.control) self.document.attrs.control={images:"INHERITED", imsg:"", transcripts:"INHERITED", tmsg:""};
        self.header= "Who can see what in document "+self.document.attrs.name;
        self.edit.control=self.document.attrs.control;
      });
    }
    $('#manageModal').width("800px");
    $('#manageModal').height("120px");
  },
  changeControl: function(type) {
    this._uiService.manageModal$.emit({type: "changeControl", context: this, ctype: type, community: this._uiService.state.community, parent: this.parent, document: this.document, docname: this.docname});
  }
});

module.exports = ChooseChangeComponent;
