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
  },
  isImageViewable:function(page, self) {
    if (self.role=="CREATOR" || self.role=="LEADER") return true;   //always veiwable
    if (self.role=="NONE") {
        if ((page.attrs.control && page.attrs.control.images!="INHERITED") && page.attrs.control.images=="ALL") return true;
        if ((page.attrs.control && page.attrs.control.images!="INHERITED") && page.attrs.control.images!="ALL") {self.imsg=page.attrs.control.imsg; self.image=null; return false};
        if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && self.document.attrs.control.images=="ALL") return true;
        if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && self.document.attrs.control.images!="ALL") {self.imsg=self.document.attrs.control.imsg; self.image=null; return false};
        if (self.community.attrs.control && self.community.attrs.control.images=="ALL")  return true;
        if (self.community.attrs.control && self.community.attrs.control.images!="ALL") {self.imsg=self.community.attrs.control.imsg; self.image=null; return false};
        return true;
    }
    if (self.role=="VIEWER") {
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images=="ALL" || page.attrs.control.images=="VIEWERS")) return true;
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images!="ALL" && page.attrs.control.images!="VIEWERS")) {self.imsg=page.attrs.control.imsg; self.image=null; return false};
      if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && (self.document.attrs.control.images=="ALL" || self.document.attrs.control.images=="VIEWERS")) return true;
      if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && (self.document.attrs.control.images!="ALL" && self.document.attrs.control.images!="VIEWERS")) {self.imsg=self.document.attrs.control.imsg; self.image=null; return false};
      if (self.community.attrs.control && (self.community.attrs.control.images=="ALL" || self.community.attrs.control.images=="VIEWERS"))  return true;
      if (self.community.attrs.control && (self.community.attrs.control.images!="ALL" && self.community.attrs.control.images!="VIEWERS")) {self.imsg=self.community.attrs.control.imsg; self.image=null; return false};
      return true;
    }
    if (self.role=="MEMBER") {
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images=="ALL" || page.attrs.control.images=="VIEWERS" || page.attrs.control.images=="MEMBERS")) return true;
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images!="ALL" && page.attrs.control.images!="VIEWERS" && page.attrs.control.images!="MEMBERS")) {self.imsg=page.attrs.control.imsg; self.image=null; return false};
      if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && (self.document.attrs.control.images=="ALL" || self.document.attrs.control.images=="VIEWERS" || self.document.attrs.control.images=="MEMBERS")) return true;
      if ((self.document.attrs.control && self.document.attrs.control.images!="INHERITED") && (self.document.attrs.control.images!="ALL" && self.document.attrs.control.images!="VIEWERS" && self.document.attrs.control.images!="MEMBERS")) {self.imsg=self.document.attrs.control.imsg; self.image=null; return false};
      if (self.community.attrs.control && (self.community.attrs.control.images=="ALL" || self.community.attrs.control.images=="VIEWERS" || self.community.attrs.control.images=="MEMBERS"))  return true;
      if (self.community.attrs.control && (self.community.attrs.control.images!="ALL" && self.community.attrs.control.images!="VIEWERS" && self.community.attrs.control.images!="MEMBERS")) {self.imsg=self.community.attrs.control.imsg; self.image=null; return false};
      return true;
    }
    self.image=null;
    return(false);
  },
  isPageViewable:function(page, self) {
    if (self.role=="CREATOR" || self.role=="LEADER") return true;   //always veiwable
    if (self.role=="NONE") {
        if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && page.attrs.control.transcripts=="ALL") return true;
        if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && page.attrs.control.transcripts!="ALL") {self.tmsg=page.attrs.control.tmsg; return false};
        if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && self.document.attrs.control.transcripts=="ALL") return true;
        if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && self.document.attrs.control.transcripts!="ALL") {self.tmsg=self.document.attrs.control.tmsg; return false};
        if (self.community.attrs.control && self.community.attrs.control.transcripts=="ALL") return true;
        if (self.community.attrs.control && self.community.attrs.control.transcripts!="ALL") {self.tmsg=self.community.attrs.control.tmsg;  return false};
        return true;
    }
    if (self.role=="VIEWER") {
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts=="ALL" || page.attrs.control.transcripts=="VIEWERS")) return true;
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts!="ALL" && page.attrs.control.transcripts!="VIEWERS")) {self.tmsg=page.attrs.control.tmsg; return false};
      if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && (self.document.attrs.control.transcripts=="ALL" || self.document.attrs.control.transcripts=="VIEWERS")) return true;
      if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && (self.document.attrs.control.transcripts!="ALL" && self.document.attrs.control.transcripts!="VIEWERS")) {self.tmsg=self.document.attrs.control.tmsg;  return false};
      if (self.community.attrs.control && (self.community.attrs.control.transcripts=="ALL" || self.community.attrs.control.transcripts=="VIEWERS"))  return true;
      if (self.community.attrs.control && (self.community.attrs.control.transcripts!="ALL" && self.community.attrs.control.transcripts!="VIEWERS")) {self.tmsg=self.community.attrs.control.tmsg; return false};
      return true;
    }
    if (self.role=="MEMBER") {
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts=="ALL" || page.attrs.control.transcripts=="VIEWERS" || page.attrs.control.transcripts=="MEMBERS")) return true;
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts!="ALL" && page.attrs.control.transcripts!="VIEWERS" && page.attrs.control.transcripts!="MEMBERS")) {self.tmsg=page.attrs.control.tmsg; return false};
      if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && (self.document.attrs.control.transcripts=="ALL" || self.document.attrs.control.transcripts=="VIEWERS" || self.document.attrs.control.transcripts=="MEMBERS")) return true;
      if ((self.document.attrs.control && self.document.attrs.control.transcripts!="INHERITED") && (self.document.attrs.control.transcripts!="ALL" && self.document.attrs.control.transcripts!="VIEWERS" && self.document.attrs.control.transcripts!="MEMBERS")) {self.tmsg=self.document.attrs.control.tmsg; return false};
      if (self.community.attrs.control && (self.community.attrs.control.transcripts=="ALL" || self.community.attrs.control.transcripts=="VIEWERS" || self.community.attrs.control.transcripts=="MEMBERS"))  return true;
      if (self.community.attrs.control && (self.community.attrs.control.transcripts!="ALL" && self.community.attrs.control.transcripts!="VIEWERS" && self.community.attrs.control.transcripts!="MEMBERS")) {self.tmsg=self.community.attrs.control.tmsg; return false};
      return true;
    }
  },
}

module.exports = BrowserFunctionService;
