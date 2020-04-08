var EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , UIService = require('../services/ui')
  , $ = require('jquery')
;


var FileReaderBinary2Component = ng.core.Component({
  selector: 'tc-filereaderbinary2',
  template: '<input id="FRinput2" class="btn wizardbutton" style="margin: auto; color: white; text-align: center" type="file"/>',
  // style="width: 250px; display: inline-block"
  outputs: [
    'filechange2', 
  ],
}).Class({
  constructor: [ElementRef, UIService, function(elementRef, uiService) {
    this._elementRef = elementRef;
	this.uiService = uiService;
    this.filechange2 = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
    ;
    $el.bind('change', function(event) {
      var reader = new FileReader();
      self.uiService.getFileName$.emit({type: "pdf2", name: event.target.files[0].name});
      reader.onload = function(evt) {
        self.filechange2.emit(evt.target.result);
      };
      reader.readAsDataURL(event.target.files[0]);
    });
  },
});

module.exports = FileReaderBinary2Component;
