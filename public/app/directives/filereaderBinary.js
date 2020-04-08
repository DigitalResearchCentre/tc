var EventEmitter = ng.core.EventEmitter
  , ElementRef = ng.core.ElementRef
  , UIService = require('../services/ui')
  , $ = require('jquery')
;


var FileReaderBinaryComponent = ng.core.Component({
  selector: 'tc-filereaderbinary',
  template: '<input id="FRinput" class="btn wizardbutton" style="margin: auto; color: white; text-align: center" type="file"/>',
  // style="width: 250px; display: inline-block"
  outputs: [
    'filechange', 
  ],
}).Class({
  constructor: [ElementRef, UIService, function(elementRef, uiService) {
    this._elementRef = elementRef;
	this.uiService = uiService;
    this.filechange = new EventEmitter();
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , self = this
    ;
    $el.bind('change', function(event) {
      var reader = new FileReader();
      self.uiService.getFileName$.emit({type:"pdf1", name: event.target.files[0].name});
       reader.onload = function(evt) {
        self.filechange.emit(evt.target.result);
      };
      reader.readAsDataURL(event.target.files[0]);
    });
  },
});

module.exports = FileReaderBinaryComponent;
