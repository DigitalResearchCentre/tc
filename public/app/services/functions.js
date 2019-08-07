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
  isImageViewable:function(page, state) {
    if (state.role=="CREATOR" || state.role=="LEADER") return true;   //always veiwable
    if (state.role=="NONE") {
        if ((page.attrs.control && page.attrs.control.images!="INHERITED") && page.attrs.control.images=="ALL") return true;
        if ((page.attrs.control && page.attrs.control.images!="INHERITED") && page.attrs.control.images!="ALL") {state.imsg=page.attrs.control.imsg; state.image=null; return false};
        if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && state.document.attrs.control.images=="ALL") return true;
        if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && state.document.attrs.control.images!="ALL") {state.imsg=state.document.attrs.control.imsg; state.image=null; return false};
        if (state.community.attrs.control && state.community.attrs.control.images=="ALL")  return true;
        if (state.community.attrs.control && state.community.attrs.control.images!="ALL") {state.imsg=state.community.attrs.control.imsg; state.image=null; return false};
        return true;
    }
    if (state.role=="VIEWER") {
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images=="ALL" || page.attrs.control.images=="VIEWERS")) return true;
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images!="ALL" && page.attrs.control.images!="VIEWERS")) {state.imsg=page.attrs.control.imsg; state.image=null; return false};
      if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && (state.document.attrs.control.images=="ALL" || state.document.attrs.control.images=="VIEWERS")) return true;
      if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && (state.document.attrs.control.images!="ALL" && state.document.attrs.control.images!="VIEWERS")) {state.imsg=state.document.attrs.control.imsg; state.image=null; return false};
      if (state.community.attrs.control && (state.community.attrs.control.images=="ALL" || state.community.attrs.control.images=="VIEWERS"))  return true;
      if (state.community.attrs.control && (state.community.attrs.control.images!="ALL" && state.community.attrs.control.images!="VIEWERS")) {state.imsg=state.community.attrs.control.imsg; state.image=null; return false};
      return true;
    }
    if (state.role=="MEMBER") {
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images=="ALL" || page.attrs.control.images=="VIEWERS" || page.attrs.control.images=="MEMBERS")) return true;
      if ((page.attrs.control && page.attrs.control.images!="INHERITED") && (page.attrs.control.images!="ALL" && page.attrs.control.images!="VIEWERS" && page.attrs.control.images!="MEMBERS")) {state.imsg=page.attrs.control.imsg; state.image=null; return false};
      if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && (state.document.attrs.control.images=="ALL" || state.document.attrs.control.images=="VIEWERS" || state.document.attrs.control.images=="MEMBERS")) return true;
      if ((state.document.attrs.control && state.document.attrs.control.images!="INHERITED") && (state.document.attrs.control.images!="ALL" && state.document.attrs.control.images!="VIEWERS" && state.document.attrs.control.images!="MEMBERS")) {state.imsg=state.document.attrs.control.imsg; state.image=null; return false};
      if (state.community.attrs.control && (state.community.attrs.control.images=="ALL" || state.community.attrs.control.images=="VIEWERS" || state.community.attrs.control.images=="MEMBERS"))  return true;
      if (state.community.attrs.control && (state.community.attrs.control.images!="ALL" && state.community.attrs.control.images!="VIEWERS" && state.community.attrs.control.images!="MEMBERS")) {state.imsg=state.community.attrs.control.imsg; state.image=null; return false};
      return true;
    }
    state.image=null;
    return(false);
  },
  isPageImageTranscriptLocked: function(doc, state) {
    if (doc.attrs=="dummy" || !state.document || state.document.attrs.requested) return false;  //not yet fully loaded
    if (!this.isImageViewable(doc, state)) {return true;}
    if (!this.isPageViewable(doc, state)) {doc.isPageITlocked=true; return true;}
    return(false);
  },
  isPageViewable:function(page, state) {
    if (state.role=="CREATOR" || state.role=="LEADER") return true;   //always veiwable
    if (state.role=="NONE") {
        if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && page.attrs.control.transcripts=="ALL") return true;
        if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && page.attrs.control.transcripts!="ALL") {state.tmsg=page.attrs.control.tmsg; return false};
        if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && state.document.attrs.control.transcripts=="ALL") return true;
        if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && state.document.attrs.control.transcripts!="ALL") {state.tmsg=state.document.attrs.control.tmsg; return false};
        if (state.community.attrs.control && state.community.attrs.control.transcripts=="ALL") return true;
        if (state.community.attrs.control && state.community.attrs.control.transcripts!="ALL") {state.tmsg=state.community.attrs.control.tmsg;  return false};
        return true;
    }
    if (state.role=="VIEWER") {
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts=="ALL" || page.attrs.control.transcripts=="VIEWERS")) return true;
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts!="ALL" && page.attrs.control.transcripts!="VIEWERS")) {state.tmsg=page.attrs.control.tmsg; return false};
      if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && (state.document.attrs.control.transcripts=="ALL" || state.document.attrs.control.transcripts=="VIEWERS")) return true;
      if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && (state.document.attrs.control.transcripts!="ALL" && state.document.attrs.control.transcripts!="VIEWERS")) {state.tmsg=state.document.attrs.control.tmsg;  return false};
      if (state.community.attrs.control && (state.community.attrs.control.transcripts=="ALL" || state.community.attrs.control.transcripts=="VIEWERS"))  return true;
      if (state.community.attrs.control && (state.community.attrs.control.transcripts!="ALL" && state.community.attrs.control.transcripts!="VIEWERS")) {state.tmsg=state.community.attrs.control.tmsg; return false};
      return true;
    }
    if (state.role=="MEMBER") {
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts=="ALL" || page.attrs.control.transcripts=="VIEWERS" || page.attrs.control.transcripts=="MEMBERS")) return true;
      if ((page.attrs.control && page.attrs.control.transcripts!="INHERITED") && (page.attrs.control.transcripts!="ALL" && page.attrs.control.transcripts!="VIEWERS" && page.attrs.control.transcripts!="MEMBERS")) {state.tmsg=page.attrs.control.tmsg; return false};
      if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && (state.document.attrs.control.transcripts=="ALL" || state.document.attrs.control.transcripts=="VIEWERS" || state.document.attrs.control.transcripts=="MEMBERS")) return true;
      if ((state.document.attrs.control && state.document.attrs.control.transcripts!="INHERITED") && (state.document.attrs.control.transcripts!="ALL" && state.document.attrs.control.transcripts!="VIEWERS" && state.document.attrs.control.transcripts!="MEMBERS")) {state.tmsg=state.document.attrs.control.tmsg; return false};
      if (state.community.attrs.control && (state.community.attrs.control.transcripts=="ALL" || state.community.attrs.control.transcripts=="VIEWERS" || state.community.attrs.control.transcripts=="MEMBERS"))  return true;
      if (state.community.attrs.control && (state.community.attrs.control.transcripts!="ALL" && state.community.attrs.control.transcripts!="VIEWERS" && state.community.attrs.control.transcripts!="MEMBERS")) {state.tmsg=state.community.attrs.control.tmsg; return false};
      return true;
    }
  },
}

module.exports = BrowserFunctionService;
