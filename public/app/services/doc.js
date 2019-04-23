var Observable = Rx.Observable
  , Http = ng.http.Http
  , forwardRef = ng.core.forwardRef
  , EventEmitter = ng.core.EventEmitter
  , Doc = require('../models/doc')
  , RESTService = require('./rest')
  , UIService = require('./ui')
  , RevisionService = require('./revision')
  , bson = require('bson')()
  , ObjectID = bson.ObjectID
;

var DocService = ng.core.Injectable().Class({
  extends: RESTService,
  constructor: [
    Http, UIService, RevisionService,
    function(http, uiService, revisionService){
    var self = this;
    RESTService.call(this, http);

    this._uiService = uiService;
    this._revisionService = revisionService;
    this.resourceUrl = 'docs';
    this.state=uiService.state;

    uiService.docService$.subscribe(function(event) {
      switch (event.type) {
        case 'refreshDocument':
          self.refreshDocument(event.payload).subscribe();
          break;
        case 'refreshDocEntity':
            self.refreshDocEntity(event.payload).subscribe();
            break;
      }
    });
  }],
  modelClass: function() {
    return Doc;
  },
  refreshDocument: function(doc) {
    return this.fetch(doc._id, {
      populate: JSON.stringify('children'),
    });
  },
  refreshDocEntity: function(docEntity) {
    return this.fetch(docEntity._id, {
      populate: JSON.stringify('children'),
    });
  },
  selectEntity: function(docEntity) {
//    console.log("getting the doc entity")
//    console.log(docEntity);
    var uiService = this._uiService
      , self = this
      , state = uiService.state
    ;
    if (docEntity) {
      docEntity.expand = true;
    }
    if (docEntity && state.docEntity !== docEntity) {
      self.refreshDocument(docEntity).subscribe(function(docEntity) {
      });
    }
    uiService.setState('documentEntity', docEntity);
  },
  selectDocument: function(doc) {
    var uiService = this._uiService
      , self = this
      , state = uiService.state
    ;
    if (doc) {
      doc.expand = true;
    }
    if (doc && state.document !== doc) {
      self.refreshDocument(doc).subscribe(function(doc) {
        var thispage=getParameterByName('page', document.location.href);
        var page=null;
        if (thispage) {
          var pagen=0;
          for (var i=0; i<doc.attrs.children.length; i++) {
            if (doc.attrs.children[i].attrs._id==thispage) pagen=i;
          }
          page = doc.attrs.children[pagen];
        }
  //      else var page = doc.getFirstChild();   //but ... doc might have no children
        if (page) {
          if (state.pageSelected) state.pageSelected.attrs.selected=false;
          state.pageSelected=page;
          page.attrs.selected=true;
          if (page && (!state.page || state.page.getParent() !== doc)) {
            self.selectPage(page);
          }
        }
      });
    }
    uiService.setState('document', doc);
  },
  selectPage: function(page) {
    var uiService = this._uiService
      , self = this
      , doc = page ? page.getParent() : null
    ;
    uiService.setState('page', page);
    if (uiService.state.document !== doc) {
      this.selectDocument(doc);
    }
  },
  getTextTree: function(doc) {
    var url = this.url({
      id: doc.getId(),
      func: 'texts',
    });
    return this.http.get(url, this.prepareOptions({}))
      .map(function(res) {
  //      console.log("function 1");
        if (!res._body) {
          return {};
        }
        var nodes = res.json()
          , nodesMap = {}
          , root
        ;
        _.each(nodes, function(node) {
          nodesMap[node._id] = node;
          node._children = _.map(node.children, function(childId) {
            return childId;
          });
        });
  //      console.log('function 2');
        _.each(nodesMap, function(node) {
          if (_.isEmpty(node.ancestors)) {
            root = node;
          } else {
            children = nodesMap[_.last(node.ancestors)].children;
            var index = children.indexOf(node._id);
            if (index > -1) {
              children.splice(index, 1, node);
            }
          }
        });
        _.each(nodesMap, function(node) {
          node.children = _.filter(node.children, function(child) {
            return !!child._id;
          });
        });
        return root;
      })
    ;
  },
  getLinks: function(doc) {
    var url = this.url({
      id: doc.getId(),
      func: 'links',
    });
    return this.http.get(url, this.prepareOptions({})).map(function(res) {
      if (!res._body) return {};
      return res.json();
    });
  },
  getRevisions: function(doc) {
//    console.log(doc);
    return this._revisionService.list({
      search: {
        find: JSON.stringify({doc: doc.getId()}),
        populate: JSON.stringify('user'),
        sort: JSON.stringify('-created'),
      },
    });
  },
  addRevision: function(revisionData) {
    return this._revisionService.create(revisionData);
  },
  json2xml: json2xml,
  commit: function(data, opts, callback) {
    var self = this
      , docRoot = _.defaults(data.doc, {children: []})
      , revisionId = data.revision
      , text = data.text
      , teiRoot = {}
    ;
    if (text) {
  //    self._uiService.changeMessage$.emit({type: 'commit', page: "document",   docname: docRoot.name, message: "Parsing the tree"});
  //    console.log("function 10");
      var xmlDoc = parseTEI(text || '')
        , docTags = ['pb', 'cb', 'lb']
        , docQueue = []
        , cur, prevDoc, curDoc, index, label
      ;
      teiRoot = xmlDoc2json(xmlDoc);
//      console.log("function 1");
      if (docRoot.label === 'text') {
        prevDoc = docRoot;
      }
      _.dfs([teiRoot], function(cur) {
        if (!_.startsWith(cur.name, '#')) {
          index = docTags.indexOf(cur.name);
          // if node is doc
          if (index > -1 || (prevDoc && cur.name === prevDoc.label)) {
            if (cur.name === docRoot.label) {
              if (!prevDoc) {
                curDoc = docRoot;
                docQueue.push(curDoc);
              } else {
                return handleError({
                  message: 'duplicate ' + cur.name  + ' element',
                  element: cur,
                }, callback);
              }
            } else if (prevDoc){
              curDoc = {
                _id: ObjectID().toJSON(),
                label: cur.name,
                children: [],
              };
              if ((cur.attrs || {}).n) {
                curDoc.name = (cur.attrs || {}).n;
              }
              if ((cur.attrs || {}).facs) {
                curDoc.facs = (cur.attrs || {}).facs;
              }
              if (docTags.indexOf(prevDoc.label) < index) {
                docQueue.push(prevDoc);
              }
              while (docQueue.length > 0) {
                label = _.last(docQueue).label;
                if (!label || docTags.indexOf(label) < index) {
                  break;
                }
                docQueue.pop();
              }
              if (docQueue.length > 0) {
                _.last(docQueue).children.push(curDoc);
              }
            }
            prevDoc = curDoc;
          }
          cur.text = '';
        }
        if (prevDoc) {
          cur.doc = prevDoc._id;
        }
      });
//      console.log("function 13");
    }
    if (docRoot._id) {
      return this.update(docRoot._id, {
        tei: teiRoot,
        doc: docRoot,
        revision: revisionId,
        commit: true,
      }).map(function(doc) {
//        console.log("after commit update"+doc);  //second part of horrid hack...
        //I am deeply unproud of this. We are forced to pick up errors in parsing etc on the server here, not in the
        //callbacks to the calling function.  But OK. It works.
        if (doc.attrs.error) {
  //        console.log("error!!!"); console.log(doc.attrs.error);
  //        alert(doc.attrs.error.message);
          self._uiService.changeMessage$.emit({type: 'commit', page: doc.attrs.data.name,   docname: self.state.document.attrs.name, message: doc.attrs.error.message});
          //send a message
          doc.attrs=(doc.attrs.data);
        }
        if (_.isEmpty(doc.attrs.ancestors)) {
          self.selectDocument(doc);
        } else {
          self.selectPage(doc);
        }
      });
    } else {
//      console.log("add options "+opts)
      var TCstate=this._uiService.state;
      return this.create(_.assign(opts, {
        tei: teiRoot,
        doc: docRoot,
        revision: revisionId,
        commit: true,
      })).map(function(doc, err) {
//        console.log("after commit create"); console.log(doc);
        if (doc.attrs.error) {
          alert(doc.attrs.error.message)
        }
        self._uiService.createDocument(doc);
        TCstate.lastDocCreated=doc;  //put it all here? necessary because we do NOT return the do
      });
    }
  },
  checkPagePrevLinks: function(text, prevs) {
    return checkPagePrevLinks(xml2json(text), prevs);
  },
  relinkPage: function(text, link, prevs) {
    var i = 0
      , prev = null
      , pb = null
      , teiRoot = xml2json(text)
      , success = false
    ;
    // find pb and remove it from tree
    _.dfs([teiRoot], function(el) {
      var index = _.findIndex(el.children, function(childEl) {
        return childEl.name === 'pb';
      });
      if (index > -1) {
        pb = el.children[index];
        el.children.splice(index, 1);
        return false;
      }
    });

    function buildPrev(parentEl, prevs, prevIndex, linkId) {
      var prev = prevs[prevIndex];
      _.each(parentEl.children, function(el) {
        if (el.name !== '#text' || (el.text || '').trim() !== '') {
          if (teiElementEqual(prev, el)) {
            if (prev._id === linkId) {
              el.children.unshift(pb);
              success = true;
              return false;
            }
            buildPrev(el, prevs, prevIndex+1, link);
          } else {
            var cur = parentEl;
            _.each(prevs.slice(prevIndex), function(p) {
              var childEl = {
                name: prev.name,
                attrs: prev.attrs,
                children: [],
              };
              cur.children.unshift(childEl);
              cur = childEl;
              if (p._id === linkId) {
                cur.children.unshift(pb);
                success = true;
                return false;
              }
            });
          }
          return false;
        }
      });
    }
    if (link === prevs[0]._id) {
      teiRoot.children.unshift(pb);
      success = true;
    } else {
      buildPrev(teiRoot, prevs, 1, link);
//      console.log("changing now "+prevs); console.log(teiRoot);
    }
    if (success) {
      return json2xml(teiRoot);
    }
  },
});


function handleError(err, callback) {
  if (_.isFunction(callback)) {
    callback(err);
  }
  return Observable.throw(err);
}


function createObjTree(node, queue) {
  var obj = {
    name: node.nodeName,
    children: [],
  };
  if (node.entity) {
    obj.entity = node.entity;
  }
  switch (node.nodeType) {
    case node.ELEMENT_NODE:
      var attrs = {};
      _.each(node.attributes, function(attr) {
        attrs[attr.name] = attr.value;
      });
      if (attrs) {
        obj.attrs = attrs;
      }
      _.each(node.childNodes, function(childNode) {
        queue.push({parent: obj, child: childNode});
      });
      break;
    case node.TEXT_NODE:
      obj.text = node.nodeValue;
      break;
    case node.COMMENT_NODE:
      obj.text = node.nodeValue;
      break;
    case node.DOCUMENT_TYPE_NODE:
      obj = '';
      break;
    //case node.DOCUMENT_NODE:
    //case node.PROCESSING_INSTRUCTION_NODE:
    //case node.DOCUMENT_FRAGMENT_NODE:
    default:
      break;
  }
  return obj;
}

function loadObjTree(xmlDoc, parentEl, obj, queue) {
  var childEl;
  if (!obj) {
    return
  }
  if (obj.name === '#text') {
    childEl = xmlDoc.createTextNode(obj.text);
  } else if (obj.name === '#comment') {
    childEl = xmlDoc.createComment(obj.text || '');
  } else {
    childEl = xmlDoc.createElement(obj.name);
    _.each(obj.attrs, function(v, k) {
      childEl.setAttribute(k, v);
    });
    _.each(obj.children, function(child) {
      if (!_.isString(child)) {
        queue.push({parent: childEl, child: child});
      }
    });
  }
  parentEl.appendChild(childEl);
}

function parseXML(text) {
  var parser, xmlDoc;
  if (window.DOMParser) {
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(text, 'text/xml');
  } else {
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
    xmlDoc.async = false;
    xmlDoc.loadXML(text);
  }
  return xmlDoc;
}

function xmlDoc2json(xmlDoc) {
  var queue = []
    , text = xpath(xmlDoc, '//tei:text|//text').iterateNext()
    , obj = createObjTree(text, queue)
  ;
//  console.log("function 15a")
  while (queue.length > 0) {
    var item = queue.shift()
      , parent = item.parent
      , child = createObjTree(item.child, queue)
    ;
    if (_.isNumber(item.child.textIndex)) {
      child.textIndex = item.child.textIndex;
    }
    parent.children.push(child);
  }
//  console.log("function 15")
  return obj;
}

function xml2json(xml) {
  var xmlDoc = parseXML(xml);
  return xmlDoc2json(xmlDoc);
}

function json2xml(obj) {
  return new XMLSerializer().serializeToString(json2xmlDoc(obj)).replace(/\n\s*\n/g, '\n');
}

function json2xmlDoc(obj) {
  var xmlDoc = document.implementation.createDocument('', '', null)
    , queue = []
  ;
  loadObjTree(xmlDoc, xmlDoc, obj, queue);
  while (queue.length > 0) {
    var item = queue.shift()
      , parentEl = item.parent
      , child = item.child
    ;
    loadObjTree(xmlDoc, parentEl, child, queue);
  }
  return xmlDoc;
}

function iterate(iter, cb) {
  var result = iter.iterateNext();
  while (result) {
    cb(result);
    result = iter.iterateNext();
  }
}

function teiElementEqual(el1, el2) {
  return el1.name === el2.name &&
    (el1.attrs || {}).n === (el2.attrs || {}).n;
}

function checkPagePrevLinks(teiRoot, prevs) {
  var i = 0
    , prev = null
  ;
  _.dfs([teiRoot], function(el) {
    if (el.name === 'pb') {
      return false;
    } else if (el.name !== '#text' || (el.text || '').trim() !== '') {
    //seems to be a bug here.. prevs[i] can go out of scope in cases of pages being added
      if (!prevs[i]) return false;
      if (teiElementEqual(prevs[i], el)) {
        prev = prevs[i]
        i += 1;
      } else {
        return false;
      }
    }
  });
  return prev;
}

function xpath(xmlDoc, expr) {
  var nsResolver = xmlDoc.createNSResolver(
    xmlDoc.ownerDocument === null ?
      xmlDoc.documentElement :
      xmlDoc.ownerDocument.documentElement
  );

  function teiNSResolver(prefix) {
    var ns = nsResolver.lookupNamespaceURI(prefix)
      , nsMap = {
        'tei': 'http://www.tei-c.org/ns/1.0',
        'det': 'http://textualcommunities.usask.ca/'
      }
    ;
    return ns || nsMap[prefix] || nsMap.tei;
  }

  return xmlDoc.evaluate(expr, xmlDoc, teiNSResolver);
}

function parseTEI(text) {
  var xmlDoc = parseXML(text);
  /*
  _.each([
    '//tei:body/tei:div[@n]',
    '//tei:body/tei:div[@n]/tei:head[@n]',
    '//tei:body/tei:div[@n]/tei:ab[@n]',
    '//tei:body/tei:div[@n]/tei:l[@n]',
  ], function(expr) {
    var iter = xpath(xmlDoc, expr)
      , cur = iter.iterateNext()
    ;
    while(cur) {
      cur.entity = cur.getAttribute('n');
      cur = iter.iterateNext();
    }
  }); */
//  console.log("xmldoc"); console.log(xmlDoc);
  return xmlDoc;
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}



module.exports = DocService;
