var ElementRef = ng.core.ElementRef
  , $ = require('jquery')
;

var ModalResizable = ng.core.Directive({
  selector: '[modal-resizable]',
}).Class({
  constructor: [ElementRef, function(elementRef) {
    this._elementRef = elementRef;
  }],
  ngOnInit: function() {
    var el = this._elementRef.nativeElement
      , $el = $(el)
      , $document = $(document)
      , startX = 0, startY = 0, x = 0, y = 0, startWidth=0, startHeight=0
    ;
  $el.on('mousedown', function(event) {
      // Prevent default dragging of selected content
      event.preventDefault();
      startX = event.clientX;
      startY = event.clientY;
      startWidth = $('#manageModal').width();
      startHeight = $('#manageModal').height();
      $document.on('mousemove', doDrag);
      $document.on('mouseup', stopDrag);
    });
    function doDrag(e) {
      $('#manageModal').width((startWidth + e.clientX - startX) + 'px');
      $('#manageModal').height((startHeight + e.clientY - startY) + 'px');
   //   console.log(startWidth, e, startX, p.style.width);
    };
   function stopDrag(e) {
     $(document).off('mousemove', doDrag);
     $(document).off('mouseup', stopDrag);
   };
  }
});


module.exports = ModalResizable;
