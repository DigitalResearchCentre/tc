var mongoose = require('mongoose')
  , _ = require('lodash')
  , async = require('async')
  , Promise = mongoose.Promise
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
  , OId = mongoose.Types.ObjectId
;

var CommunitySchema = new Schema({
  name: String,
  abbr: String,
  longName: String,
  description: String,
  fonts: [String],
  public: Boolean,
  accept: Boolean,
  autoaccept: Boolean,
  alldolead: Boolean,
  haspicture: Boolean,
  image: String,
  documents: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
});

_.assign(CommunitySchema.methods, {
  getstatus: function(cb) {
    var Community = this.model('Community')
      , self = this
      , documents = this.documents
      , promise = new Promise()
    ;
    documents = Community.populate(this, 'documents');

    return _.when(documents).then(function(documents) {
      return Community.populate(self, {
        path: 'documents.children',
        model: 'Doc',
      });
    }).then(function() {
      var numOfPages = 0
        , numOfTranscripts = 0
        , numOfPagesTranscribed = 0
      ;
      _.each(self.documents, function(doc) {
        numOfPages += (doc.children || []).length;
        _.each(doc.children, function(child) {
          var l = child.revisions.length;
          numOfTranscripts += l;
          numOfPagesTranscribed += l > 0 ? 1 : 0;
        });
      });

      self.status = {
        numOfTranscripts: numOfTranscripts,
        numOfPages: numOfPages,
        numOfPagesTranscribed: numOfPagesTranscribed,
      };
      if (cb) {
        cb(null, self);
      }
      promise.fulfill(self);
      return promise;
    });
  },
});

_.assign(CommunitySchema.statics, {
  getOptFields: function() {
    return ['status'];
  }
});

var TaskSchema = new Schema({
  user: {type: ObjectId, ref: 'User'},
  doc: {type: ObjectId, ref: 'Doc'},
});

var RevisionSchema = new Schema({
  doc: {type: ObjectId, ref: 'Doc'},
  user: {type: ObjectId, ref: 'User'},
  created: {type: Date, default: Date.now},
  committed: {type: Date, default: Date.now},
  status: String, // submitted committed previsous_db
  text: String,
  spentTime: Number,
});

var InvitationSchema = new Schema({

});

var ActionSchema = new Schema({

});

var BaseNodeSchema = function(modelName) {
  return {
    schema: {
      name: String,
      ancestors: [{type: ObjectId, ref: modelName}],
      children: [{type: ObjectId, ref: modelName}],
    },
    methods: {
      getText: function() {
      },
      getChildrenAfter: function(targetId) {
        if (targetId._id) {
          targetId = targetId._id;
        }
        this.prototype.constructor.findOne({_id: targetId});
      },
    },
    statics: {
      getTreeFromLeaves: function(nodes, cb) {
        var cls = this
          , ancestors = {}
        ;
        _.each(nodes, function(node) {
          _.forEachRight(node.ancestors, function(id) {
            if (!ancestors.hasOwnProperty(id)) {
              ancestors[id] = true;
            } else {
              return false;
            }
          });
        });
        cls.find({_id: {$in: _.keys(ancestors)}}).exec(function(err, results) {
          if (err) {
            return cb(err);
          }
          var objs = {}
            , root, parent, children
          ;
          nodes = results.concat(nodes);
          _.each(nodes, function(node) {
            objs[node._id] = node;
          });
          _.each(nodes, function(node) {
            if (node.ancestors.length === 0) {
              root = node;
            } else {
              parent = objs[_.last(node.ancestors)];
              children = parent.children;
              var index = _.findIndex(children, function(id) {
                return id.equals(node._id);
              });
              children[index] = node;
            }
          });
          cb(err, root);
        });
      },
      getNodesBetween: function(ancestors1, ancestors2, callback) {
        var nodes = []
          , common = []
          , ancestors = []
          , cls = this
        ;
        if (!_.isArray(ancestors1)) {
          ancestors1 = ancestors1.ancestors;
        }
        if (!_.isArray(ancestors2)) {
          ancestors2 = ancestors2.ancestors;
        }

        _.each(_.zip(ancestors1, ancestors2), function(ids) {
          if (ids[0] && ids[1] && ids[0].equals(ids[1])) {
            common.push(ids[0]);
          } else {
            return false;
          }
        });
        ancestors1 = ancestors1.slice(common.length);
        ancestors2 = ancestors2.slice(common.length);

        async.parallel([
          function(cb) {
            if (common.length > 0) {
              cls.find({_id: {$in: common}}, cb);
            } else {
              cb(null, []);
            }
          },
          function(cb) {
            if (ancestors1.length > 0) {
              cls.find({_id: {$in: ancestors1}}, cb);
            } else {
              cb(null, []);
            }
          },
          function(cb) {
            if (ancestors2.length > 0) {
              cls.find({_id: {$in: ancestors2}}, cb);
            } else {
              cb(null, []);
            }
          },
        ], function(err, results) {
          if (err) {
            return callback(err);
          }

          var children = [];
          common = results[0];
          ancestors1 = results[1];
          ancestors2 = results[2];

          if (common.length > 0) {
            children = _.last(common).children;
          }

          if (ancestors1.length > 0) {
            var found = null;
            _.each(children, function(id) {
              if (id.equals(ancestors2[0]._id)) {
                return false;
              }
              if (found) {
                ancestors.push(id);
              }
              if (id.equals(ancestors1[0]._id)) {
                found = true;
              }
            });
          }

          _.each(ancestors1.slice(1), function(obj, i) {
            var children = ancestors1[i].children;
            var index = _.findIndex(children, function(id) {
              return id.equals(obj._id);
            });
            ancestors = ancestors.concat(children.slice(index + 1));
          });

          _.each(ancestors2.slice(1), function(obj, i) {
            var children = ancestors2[i].children;
            _.each(children, function(id) {
              if (!id.equals(obj._id)) {
                ancestors.push(id);
              } else {
                return false;
              }
            });
          });

          cls.find({
            $or: [
              {ancestors: {$in: ancestors}},
              {_id: {$in: ancestors}}
            ],
          }, function(err, objs) {
            callback(err, common.concat(ancestors1, ancestors2, objs));
          });
        });
      },
      getPrev: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({children: id}).exec(cb);
          },
          function(parent, cb) {
            if (parent) {
              var index = _.findIndex(parent.children, function(childId) {
                return childId.equals(id);
              });
              if (index > 0) {
                return cls.findOne({_id: parent.children[index - 1]}).exec(cb);
              }
            }
            return cb(null, null);
          },
        ], callback);
      },
      getDFSPrev: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({_id: id}).exec(cb);
          },
          function(obj, cb) {
            if (!obj) {
              return cb(null, obj);
            }
            cls.find({_id: {$in: obj.ancestors}}).exec(cb);
          },
          function(ancestors, cb) {
            var cur = id
              , dfsPrevId
            ;
            _.forEachRight(ancestors, function(parent) {
              var index = _.findIndex(parent.children, function(childId) {
                return childId.equals(cur);
              });
              if (index > 0) {
                dfsPrevId = parent.children[index - 1];
                return false;
              } else {
                cur = parent._id;
              }
            });
            if (dfsPrevId) {
              cls.findOne({_id: dfsPrevId}).exec(function(err, dfsPrev) {
                if (err) {
                  cb(err);
                } else {
                  async.whilst(function() {
                    return (dfsPrev.children || []).length > 0;
                  }, function(cb1) {
                    cls.findOne({_id: _.last(dfsPrev.children)}).exec(
                      function(err, obj) {
                        dfsPrev = obj;
                        cb1(err, obj);
                      }
                    );
                  }, function(err) {
                    if (err) {
                      return cb(err);
                    }
                    if (dfsPrev) {
                      cb(null, dfsPrev);
                    }
                  });
                }
              });
            } else {
              cb(null, null);
            }

          }
        ], callback);
      },
      getFirstLeaf: function(id, callback) {
        var cls = this;
        async.waterfall([
          function(cb) {
            cls.findOne({_id: id}).exec(cb);
          },
          function(obj, cb) {
            if ((obj.children || []).length > 0) {
              cls.getFirstLeaf(obj.children[0], cb);
            } else {
              cb(null, obj);
            }
          }
        ], callback);
      },
    }
  };
};

var baseNode = BaseNodeSchema('Node');

var NodeSchema = new Schema(baseNode.schema);
_.assign(NodeSchema.methods, baseNode.methods);

var baseDoc = BaseNodeSchema('Doc');
var DocSchema = new Schema(_.assign(baseDoc.schema, {
  label: String,
  revisions: [{type: ObjectId, ref: 'Revision'}],
}));

function _loadChildren(cur, queue) {
  var children = cur.children
    , ancestors = cur.ancestors.concat(cur._id)
    , ids = []
  ;
  for (var i = 0, len = children.length; i < len; i++) {
    var child = children[i];
    if (!child._id) {
      child._id = new OId();
    } else if (_.isString(child._id)) {
      child._id = new OId(child._id);
    }
    if (!child.name) {
      child.name = '' + (i + 1);
    }
    child.ancestors = ancestors;
    queue.push(child);
    ids.push(child._id);
  }
  return ids;
}

function _loadDocTexts(doc, texts) {
  var indexes = doc.texts || []
    , ancestors = doc.ancestors.concat(doc._id)
    , ids = []
    , text
  ;
  for (var i = 0, len = indexes.length; i < len; i++) {
    text = texts[indexes[i]];
    text.docs = ancestors;
    ids.push(text._id);
  }
  return ids;
}

function _loadEntityTexts(obj, texts) {
  var indexes = obj.texts || []
    , ancestors = obj.ancestors.concat(obj._id)
    , ids = []
    , text
  ;
  for (var i = 0, len = indexes.length; i < len; i++) {
    text = texts[indexes[i]];
    text.entities = ancestors;
    ids.push(text._id);
  }
  return ids;
}

function _loadXMLTexts(obj, texts) {
  var ancestors = obj.ancestors.concat(obj._id)
    , ids = []
    , text
  ;
  text = texts[obj.textIndex];
  delete obj.textIndex;
  text.xmls = ancestors;
  ids.push(text._id);
  return ids;
}

_.assign(DocSchema.statics, baseDoc.statics, {
  getPrevTexts: function(id, callback) {
    async.waterfall([
      function(cb) {
        Doc.getDFSPrev(id, cb);
      },
      function(doc, cb) {
        if (!doc) {
          return cb(null, null);
        }
        TEI.find({docs: doc.ancestors.concat(doc._id)}).exec(cb);
      },
      function(teiLeaves, cb) {
        if (teiLeaves) {
          TEI.getTreeFromLeaves(teiLeaves, cb); 
        } else {
          cb(null, null);
        }
      },
    ], function(err, teiRoot) {
      if (err || !teiRoot) {
        return callback(err, []);
      }
      var cur = teiRoot
        , prevs = [cur]
        , index
      ;
      while ((cur.children || []).length > 0) {
        index = _.findLastIndex(cur.children, function(child) {
          return !(_.isString(child) || child instanceof OId) && 
            !(child.name === '#text' && child.text.trim() === '');
        });
        if (index !== -1) {
          cur = cur.children[index];
          prevs.push(cur);
        } else {
          break;
        }
      }
      callback(err, prevs);
    });
  },
  getNextTexts: function(id, callback) {
    async.waterfall([
      function(cb) {
        Doc.findOne({children: id}).exec(cb);
      },
      function(parent, cb) {
        var index;
        if (parent) {
          index = _.findIndex(parent.children, function(child) {
            return child.equals(id);
          });
          if (parent.children.length > index) {
            return Doc.findOne(parent.children[index+1]).exec(cb);
          }
          // TODO no siblings
        }
        return cb(null, null);
      },
      function(doc, cb) {
        if (!doc) {
          return cb(null, null);
        }
        TEI.find({docs: doc.ancestors.concat(doc._id)}).exec(cb);
      },
      function(teiLeaves, cb) {
        if (teiLeaves) {
          TEI.getTreeFromLeaves(teiLeaves, cb); 
        } else {
          cb(null, null);
        }
      },
    ], function(err, teiRoot) {
      if (err || !teiRoot) {
        return callback(err, []);
      }
      var cur = teiRoot
        , nexts = [cur]
        , index
      ;
      while ((cur.children || []).length > 0) {
        index = _.findIndex(cur.children, function(child) {
          return !(_.isString(child) || child instanceof OId) && 
            !(child.name === '#text' && child.text.trim() === '');
        });
        if (index !== -1) {
          cur = cur.children[index];
          nexts.push(cur);
        } else {
          break;
        }
      }
      callback(err, nexts);
    });
  },
});

function _checkLinks(prevs, nexts, teiRoot) {
  var cur = teiRoot
    , continueTeis = {}
    , prev, next
  ;
  while (cur.prev) {
    prev = prevs.shift();
    cur.prev = new OId(cur.prev);
    if (prev && prev._id.equals(cur.prev)) {
      cur._id = cur.prev;
      continueTeis[cur._id] = cur;
      if (prevs.length > 0) {
        cur.prevChildIndex = _.findIndex(prev.children, function(id) {
          return id.equals(prevs[0]._id);
        });
        cur._children = _.map(prev.children, function(child) {
          if (_.isString(child)) {
            child = new OId(child);
          } else if (child._id) {
            child = child._id;
          }
          return child;
        });
        cur.nextChildIndex = cur._children.length;
      } else {
        return new Error('prev element is not match: ' + cur);
      }
      if ((cur.children || []).length > 0) {
        cur = cur.children[0];
      } else {
        cur = {};
      }
    } else {
      return new Error('prev elements are not match: ' + prev._id + ' ' + cur);
    }
  }
  while (prevs.length > 1) {
    prev = prevs.shift();
    cur = {
      _id: prev._id,
      attrs: prev.attrs,
      children: [],
    };
    continueTeis[cur._id] = cur;
    cur.prevChildIndex = _.findIndex(prev.children, function(id) {
      return id.equals(prevs[0]._id);
    });
    cur._children = _.map(prev.children, function(child) {
      if (_.isString(child)) {
        child = new OId(child);
      } else if (child._id) {
        child = child._id;
      }
      return child;
    });
    cur.nextChildIndex = cur._children.length;
  }
  cur = teiRoot;
  while (cur.next) {
    next = nexts.shift();
    cur.next = new OId(cur.next);
    if (next && next._id.equals(cur.next)) {
      cur._id = new OId(cur.next);
      continueTeis[cur._id] = cur;
      if (cur.prev && !cur.next.equals(cur.prev)) {
        return new Error('prev and next conflict' + cur);
      }
      if (nexts.length > 0) {
        cur.nextChildIndex = _.findIndex(next.children, function(id) {
          return id.equals(nexts[0]._id);
        });
        cur._children = _.map(next.children, function(child) {
          if (_.isString(child)) {
            child = new OId(child);
          } else if (child._id) {
            child = child._id;
          }
          return child;
        });
        if (!cur.hasOwnProperty('prevChildIndex')) {
          cur.prevChildIndex = -1;
        }
      } else {
        return new Error('next element is not match: ' + cur);
      }

      if ((cur.children || []).length > 0) {
        cur = _.last(cur.children);
      } else {
        cur = {};
      }
    } else {
      return new Error('next elements are not match' + next._id + ' ' + cur);
    }
  }
  while (nexts.length > 1) {
    next = nexts.shift();
    cur = {
      _id: next._id,
      attrs: next.attrs,
      children: [],
    };
    continueTeis[cur._id] = cur;
    cur.nextChildIndex = _.findIndex(next.children, function(id) {
      return id.equals(nexts[0]._id);
    });
    cur._children = _.map(next.children, function(child) {
      if (_.isString(child)) {
        child = new OId(child);
      } else if (child._id) {
        child = child._id;
      }
      return child;
    });
    if (!cur.hasOwnProperty('prevChildIndex')) {
      cur.prevChildIndex = -1;
    }
  }
  return continueTeis;
}

function _parseTei(teiRoot, docRoot, entityRoot) {
  var docMap = {}
    , docs = []
    , teis = []
    , entities = []
    , continueTeis = {}
    , queue, cur, foundPrev, foundNext
  ;

  docMap[docRoot._id] = docRoot;
  console.log('--- start commit ---');
  console.log('--- parse docs ---');
  queue = [];
  docRoot.children = _loadChildren(docRoot, queue);
  while (queue.length > 0) {
    cur = queue.shift();
    cur.children = _loadChildren(cur, queue);
    if (_.isString(cur._id)) {
      cur._id = new OId(cur._id);
    }
    docs.push(cur);
    docMap[cur._id] = cur;
  }

  console.log('--- parse entity ---');
  //  Entity
  console.log('--- parse xmls ---');
  //  TEI
  queue = [teiRoot];
  _.defaults(teiRoot, {
    ancestors: [],
    _id: new OId(),
  });
  while (queue.length > 0) {
    cur = queue.shift();
    if (cur.name === '#text') {
      cur.children = [];
    }
    foundPrev = 0;
    if (cur.prev) {
      foundPrev = _.findIndex(cur.children, function(child) {
        return !child.prev;
      });
      if (foundPrev === -1) foundPrev = 0;
      delete cur.prev;
    }
    foundNext = null;
    if (cur.next) {
      foundNext = _.findLastIndex(cur.children, function(child) {
        return !child.next;
      }) + 1;
      delete cur.next;
    }
    cur.children = _loadChildren(cur, queue);
    if (foundNext === null) {
      foundNext = cur.children.length;
    }
    cur.children = cur.children.slice(foundPrev, foundNext);
    if (cur.doc) {
      if (_.isString(cur.doc)) {
        cur.doc = new OId(cur.doc);
      }
      cur.docs = docMap[cur.doc].ancestors.concat(cur.doc);
      delete cur.doc;
    }
    if (_.isNumber(cur.prevChildIndex)){
      if (!continueTeis[cur._id]) {
        continueTeis[cur._id] = cur;
      }
    } else {
      teis.push(cur);
    }
  }

  return {
    teis: teis,
    docs: docs,
    continueTeis: continueTeis,
  };
}

_.assign(DocSchema.methods, baseDoc.methods, {
  commit: function(data, callback) {
    var self = this
      , teiRoot = data.tei
      , docRoot = self.toObject()
      , continueTeis
    ;
    docRoot.children = data.doc.children;
    /*
    async.waterfall([
      function(cb) {
        Community.findOne({docs: doc.ancestors[0]}).exec(cb);
      },
      function(community, cb) {
        Entity.find({
          _id: {$in: community.entities},
          name: entityRoot.name,
        }).exec(cb);       
      },
      function(entity, cb) {
        if (!entity) {
          entityRoot._id = new OId();
        }
      }
    ]);
    */
    async.parallel([
      function(cb) {
        Doc.getPrevTexts(self._id, cb);
      },
      function(cb) {
        Doc.getNextTexts(self._id, cb);
      },
    ], function(err, results) {
      console.log('----- got prevs and nexts------');
      var result;
      if (err) {
        return callback(err);
      }
      continueTeis = _checkLinks(results[0], results[1], teiRoot);
      if (continueTeis.error) {
        return callback(continueTeis);
      } 
      result = _parseTei(teiRoot, docRoot);
      self.children = docRoot.children;

      async.parallel([
        function(cb) {
          Doc.remove({ancestors: self._id}, function(err) {
            if (err) {
              cb(err);
            }
            async.parallel([
              function(cb1) {
                self.save(function(err, doc) {
                  cb1(err, doc);
                });
              },
              function(cb1) {
                console.log('--- save doc ---');
                Doc.collection.insert(result.docs, function(err, objs) {
                  console.log('--- save doc done ---');
                  cb1(err, objs);
                });
              },
            ], cb);
          });
        },
        function(cb) {
          var deleteTeis = [];
          console.log(continueTeis);
          async.forEachOf(continueTeis, function(tei, id, cb1) {
            var _children = tei._children || []
              , prevChildIndex = tei.prevChildIndex
              , nextChildIndex = tei.nextChildIndex
              , prevChildren = _children.slice(0, prevChildIndex + 1)
              , nextChildren = _children.slice(nextChildIndex)
            ;
            deleteTeis.push.apply(
              deleteTeis, _children.slice(prevChildIndex + 1, nextChildIndex));
            tei.children = prevChildren.concat(tei.children, nextChildren);
            if (prevChildIndex < nextChildIndex) {
              return TEI.collection.update({_id: new OId(id)}, {
                $set: {
                  attrs: tei.attrs,
                  children: tei.children,
                },
              }, cb1);
            } else {
              return TEI.collection.update({_id: new OId(id)}, {
                $set: {
                  attrs: tei.attrs,
                },
              }, cb1);
            }
          }, function(err) {
            if (err) return cb(err);
            deleteTeis = _.map(deleteTeis, function(id) {
              if (_.isString(id)) {
                return new OId(id);
              } else {
                return id;
              }
            });
            console.log('=================================');
            console.log(deleteTeis);
            console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
            TEI.remove({
              $or: [
                {ancestors: {$in: deleteTeis}},
                {_id: {$in: deleteTeis}},
              ]
            }, cb);
          });
        },
        function(cb) {
          console.log('--- save text ---');
          TEI.collection.insert(result.teis, function(err, objs) {
            console.log('--- save text done ---');
            if (err) console.log(err);
            cb(err, objs);
          });
        },
      ], function(err) {
        console.log(err);
        callback(err);
       
      });
    });

    /*
    this.save();
    var teis = TEI.find({docs: this._id});
    function findTree(teis) {
      return [];
    }
    var teitree = findTree(teis);
    Doc.collection.insert(docs);
    */
    // TODO find out all tei need be deleted
    // then delete them
  }
});

var Doc = mongoose.model('Doc', DocSchema);

var baseEntity = BaseNodeSchema('Entity');
var EntitySchema = new Schema(_.assign(baseEntity.schema, {

}));
_.assign(EntitySchema.methods, baseEntity.methods);
var Entity = mongoose.model('Entity', EntitySchema);


var baseTEI = BaseNodeSchema('TEI');
var TEISchema = new Schema(_.assign(baseTEI.schema, {
  text: String,
  docs: [{type: ObjectId, ref: 'Doc'}],
  entities: [{type: ObjectId, ref: 'Entity'}],
  attrs: {type: Schema.Types.Mixed},
}));
_.assign(TEISchema.methods, baseTEI.methods);
_.assign(TEISchema.statics, baseTEI.statics);

var TEI = mongoose.model('TEI', TEISchema);


var NodeSchemaSchema = new Schema({
  name: String,
});

module.exports = {
  Community: mongoose.model('Community', CommunitySchema),
  User:  require('./user'),
  Doc: Doc,
  Entity: Entity,
  TEI: TEI,
  Revision: mongoose.model('Revision', RevisionSchema),
};


