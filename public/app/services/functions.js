var $ = require('jquery')
;


var BrowserFunctionService = {
  prettyTei: function(teiRoot) {
    _.dfs([teiRoot], function(el) {
      var children = [];
      _.each(el.children, function(childEl) {
        if (['pb', 'cb', 'lb', 'div','body','/div'].indexOf(childEl.name) !== -1) {
          children.push({
            name: '#text',
            text: '\n',
          });
        }
        children.push(childEl);
      });
      el.children = children;
    });
    return teiRoot;
  },
  download: function (content, filename, contentType)  {
      if(!contentType) contentType = 'application/octet-stream';
      var a = document.createElement('a');
      var blob = new Blob([content], {'type':contentType});
      a.href = window.URL.createObjectURL(blob);
      a.download = filename;
      a.click();
  }
}

module.exports = BrowserFunctionService;
