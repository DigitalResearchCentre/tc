var _ = require('lodash')
  , ejs = require('ejs')
  , fs = require('fs')
  , crypto = require('crypto')
  , async = require('async')
  , express = require('express')
  , multer = require('multer')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , TCMailer = require('../TCMailer')
  , mongoose = require('mongoose')
  , config = require('../config')
  , gridfs = require('../utils/gridfs')
  , libxml = require('libxmljs')
  , Action = models.Action
  , Community = models.Community
  , User = models.User
  , Doc = models.Doc
  , Entity = models.Entity
  , Revision = models.Revision
  , TEI = models.TEI
;


router.use(function(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 
      'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control',
  });
  next();
});

var CommunityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Community, opts);
}, {
  afterCreate: function(req, res, next) {
    return function(community, cb) {
      var  user = req.user;
      user.memberships.push({
        community: community._id,
        role: User.CREATOR,
      });
      user.save(function(err, user) {
        cb(err, community);
      });
    };
  }
});
router.get('/communities/:id/memberships/', function(req, res, next) {
  User.find({
    memberships: {
      $elemMatch: {community: req.params.id},
    },
  }).exec(function(err, users) {
    if (err) {
      next(err);
    } else {
      res.json(users);
    }
  });
});

var EntityResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Entity, opts);
});


var entityResource = new EntityResource({id: 'entity'});
entityResource.serve(router, 'entities');
router.get('/entities/:id/docs/:docId', function(req, res, next) {
  var docId = req.params.docId
    , entityId = req.params.id
  ;
  Entity.getDocs(entityId, docId, function(err, docs) {
    if (err) {
      return next(err);
    }
    res.json(docs);
  });
});

var DocResource = _.inherit(Resource, function(opts) {
  Resource.call(this, Doc, opts);
  this.options.auth.update = function(req, res, next) {
    next();
  };
  this.options.auth.create = function(req, res, next) {
    next();
  };
}, {
  execSave: function(req, res, next) {
    return function(obj, callback) {
      var parent, community, doc, after;
      async.waterfall([
        prevSave,
        function(_parent, _after, _community, _doc, parallelCb) {
          parent = _parent;
          after = _after;
          community = _community;
          doc = _doc;
          async.parallel([
            function(cb) {
              if (req.body.revision) {
                var revision = new Revision({
                  doc: doc._id,
                  text: req.body.revision,
                });
                revision.save(function(err, revision, numberAffected) {
                  cb(err, revision);
                });
              } else {
                cb(null, doc);
              }
            },
            function(cb) {
              // TODO: also need move all subtrees
              var prevIndex, prevs, teiparent;
              if (parent) {
                parent.children.unshift(doc._id);
              } else if (after) {
                parent = _.last(after.ancestors);
                var index = _.findIndex(parent.children, function(id) {
                  if (id._id) {
                    id = id._id;
                  }
                  return id.equals(after._id);
                });
                parent.children.splice(index + 1, 0, doc._id);
              }
              if (parent) {
                doc.ancestors = parent.ancestors.concat(parent._id);
                async.waterfall([
                  function(cb1) {
                    parent.save(function(err, parent, numberAffected) {
                      cb1(err, parent);
                    });
                  },
                  function(parent, cb1) {
                    doc.save(function(err, doc, numberAffected) {
                      cb1(err, doc);
                    });
                  },
                  function(doc, cb1) {
                    Doc.getPrevTexts(doc._id, function(err, prevTexts) {
                      if (!prevTexts || prevTexts.length === 0) {
                        TEI.findOne({
                          docs: parent._id, ancestors: []
                        }).exec(function(err, tei) {
                          var teis = [];
                          if (tei) {
                            teis.push(tei);
                          }
                          cb1(err, teis);
                        });
                      } else {
                        cb1(err, prevTexts);
                      }
                    });
                  },
                  function(prevTexts, cb1) {
                    prevs = prevTexts;
                    if (!prevs || prevs.length === 0) {
                      return cb1(null);
                    }
                    prevIndex = _.findLastIndex(prevs, function(prev) {
                      return [
                        '#text', 'pb', 'cb', 'lb'
                      ].indexOf(prev.name) === -1;
                    });
                    teiparent = prevs[prevIndex];
                    console.log(teiparent);
                    var tei = new TEI({
                      ancestors: teiparent.ancestors.concat(teiparent._id),
                      children: [],
                      docs: doc.ancestors.concat(doc._id),
                      name: 'pb',
                    });
                    tei.save(function(err, tei, numberAffected) {
                      cb1(err, tei);
                    });
                  },
                  function(tei, cb1) {
                    if (teiparent) {
                      _.each(teiparent.children, function(child, i) {
                        if (child._id) {
                          teiparent.children[i] = child._id;
                        }
                      });
                      if (prevIndex < prevs.length - 1) {
                        var childIndex = _.findLastIndex(
                          prevs[prevIndex].children,
                          function(id) {
                            if (id._id) {
                              id = id._id;
                            }
                            return id.equals(prevs[prevIndex+1]._id);
                          }
                        );
                        teiparent.children.splice(childIndex+1, 0, tei._id);
                      } else {
                        teiparent.children.unshift(tei._id);
                      }
                      teiparent.save(function(err, tt) {
                        cb1(err);
                      });
                    } else {
                      cb1(null);
                    }
                  }
                ], function(err) {
                  cb(err, doc);
                });
              } else {
                cb(null);
              }
            },
            function(cb) {
              if (community) {
                community.documents.push(doc._id);
                community.save(function(err) {
                  cb(err, community);
                });
              } else {
                cb(null);
              }
            },
          ], function(err, results) {
            console.log(' finish parallel ');
            if (err) {
              parallelCb(err);
            }
            var revision = results[0];
            if (revision) {
              doc.revisions.push(revision._id);
            }
            doc.save(function(err, doc, numberAffected) {
              parallelCb(err, doc);
            });
          });
        },
        function(doc, cb) {
          if (req.body.commit) {
            obj.commit(req.body.commit, cb);
          } else {
            cb(null);
          }
        }
      ], function(err) {
        callback(err, doc);
      });

      function prevSave(prevSaveCallback) {
        async.parallel([
          function(cb) {
            if (req.body.parent) {
              Doc.findOne({_id: req.body.parent}).exec(cb);
            } else {
              cb(null);
            }
          },
          function(cb) {
            if (req.body.after) {
              Doc.findOne({
                _id: req.body.after
              }).populate('ancestors').exec(cb);
            } else {
              cb(null);
            }
          },
          function(cb) {
            if (req.body.community) {
              Community.findOne({
                _id: req.body.community
              }).exec(cb);
            } else {
              cb(null);
            }
          },
          function(cb) {
            console.log('---------------------');
            console.log(obj);
            obj.save(function(err, obj, numberAffected) {
              doc = obj;
              cb(err, doc);
            });
          }
        ], function(err, results) {
          prevSaveCallback.apply(null, [err].concat(results));
        });
      }
    };
  },
});

var userResource = new Resource(User, {id: 'user'});
userResource.serve(router, 'users');

new CommunityResource({id: 'community'}).serve(router, 'communities');
router.put('/communities/:id/add-document', function(req, res, next) {
  var communityId = req.params.id
    , doc = new Doc(req.body)
    , community
  ;

  async.waterfall([
    function(cb) {
      Community.findOne({_id: communityId}).exec(cb);
    },
    function(obj, cb) {
      community = obj;
      doc.save(function(err, doc, numberAffected) {
        cb(err, doc);
      });
    },
    function(doc, cb) {
      community.documents.push(doc);
      community.save(function(err, community, numberAffected) {
        cb(err, community);
      });
    },
  ], function(err) {
    if (err) {
      if (doc._id) {
        doc.remove();
      }
      next(err);
    } else {
      res.json(doc);
    }
  });
});


router.put('/communities/:id/add-member', function(req, res, next) {
  var communityId = req.params.id
    , userId = req.body.user
    , role = req.body.role
    , community
  ;
  async.parallel([
    function(cb) {
      Community.findOne({_id: communityId}).exec(cb);
    },
    function(cb) {
      User.findOne({_id: userId}).exec(cb);
    },
  ], function(err, results) {
    if (err) {
      next(err);
    } else {
      var community = results[0]
        , user = results[1]
      ;
      user.memberships.push({
        community: community._id,
        role: role,
      });
      user.save(function(err, user) {
        if (err) {
          return next(err);
        }
        res.json(user);
      });
    }
  });
});

var docResource = new DocResource({id: 'doc'});
docResource.serve(router, 'docs');
router.get('/docs/:id/entities/:entityId?', function(req, res, next) {
  var docId = req.params.id
    , entityId = req.params.entityId
  ;
  Doc.getEntities(docId, entityId, function(err, entities) {
    if (err) {
      return next(err);
    }
    res.json(entities);
  });
});
router.get('/docs/:id/texts', function(req, res, next) {
  var docId = req.params.id;
  TEI.find({docs: docId}).exec(function(err, teis) {
    if (err) {
      return next(err);
    }
    TEI.getTreeFromLeaves(teis, function(err, teiRoot) {
      res.json(teiRoot);
    });
  });
});

router.get('/docs/:id/links', function(req, res, next) {
  var docId = req.params.id;

  Doc.getOutterBoundTexts(docId, function(err, bounds) {
    if (err) {
      return next(err);
    }
    res.json({
      prev: bounds[0],
      next: bounds[1],
    });
  });

  /*
  async.parallel([
    function(cb) {
      Doc.getPrevTexts(docId, cb);
    },
    function(cb) {
      Doc.getNextTexts(docId, cb);
    },
  ], function(err, results) {
    if (err) {
      return next(err);
    }
    _.each(results, function(objs) {
      _.each(objs, function(obj) {
        _.each(obj.children, function(child, i) {
          if (child._id) {
            obj.children[i] = child._id;
          }
        });
      });
    });
    res.json({
      prev: results[0],
      next: results[1],
    });
  });
  */
});

function confirmMembership(action) {
  var payload = action.payload
    , user = payload.user
    , community = payload.community
    , role = payload.role
    , hash = payload.hash
  ;
}

function requestMembership(action, callback) {
  var buf = crypto.randomBytes(64)
    , payload = action.payload
  ;
  payload.hash = buf.toString('hex');
  async.parallel([
    function(cb) {
      User.findOne({_id: payload.user}, cb);
    },
    function(cb) {
      Community.findOne({_id: payload.community}, cb);
    },
    function(cb) {
      User.find({
        'memberships.community': payload.community,
        'memberships.role': User.CREATOR,
      }, cb);
    },
    function(cb) {
      new Action(action).save(function(err, obj) {
        cb(err, obj);
      });
    },
  ], function(err, results) {
    var user = results[0]
      , community = results[1]
      , leader = results[2][0]
      , action = results[3]
      , message
    ;
    if (!err) {
      message = ejs.render(
      fs.readFileSync(
        __dirname + '/../views/joinletternotifyleader.ejs', 'utf8'),
        {
          username: user.local.name,
          hash: action.payload.hash,
          url: `${config.BACKEND_URL}actions/${action._id}`,
          communityemail: leader.email,
          useremail: user.local.email,
          communityname: community.name,
          communityowner: leader.name
        }
      );
      TCMailer.nodemailerMailgun.sendMail({
        from: TCMailer.addresses.from,
        to: leader.local.email,
        subject: `
          Application from ${user.local.name} to join Textual Community`,
        html: message,
        text: message.replace(/<[^>]*>/g, '')
      });
      var obj = action.toObject();
      delete obj.payload.hash;
      callback(err, obj);
    } else {
      callback(err);
    }
  });
}

function validateAction(action) {
  return action.type && action.payload;
}

router.get('/actions/:id', function(req, res, next) {
  Action.findOne({_id: req.params.id}, function(err, action) {
    var payload = action.payload
      , role = payload.role
    ;
    if (payload.hash && payload.hash === req.query.hash) {
      async.parallel([
        function(cb) {
          User.findOne({_id: payload.user}, cb);
        },
        function(cb) {
          Community.findOne({_id: payload.community}, cb);
        },
      ], function(err, results) {
        var user = results[0]
          , community = results[1]
        ;
        user.memberships.push({
          community: community._id,
          role: role,
        });
        async.parallel([
          function(cb) {
            user.save(function(err, obj) {
              cb(err, obj);
            });
          },
          function(cb) {
            payload.hash = '';
            action.save(function(err, obj) {
              cb(err, obj);
            });
          },
        ], function(err) {
          if (err) {
            next(err);
          } else {
            res.redirect('/app');
          }
        });
      });
    } else {
      res.json({message: 'invalid hash'});
    }
  });
});

router.post('/actions', function(req, res, next) {
  var action = req.body;
  console.log(action);
  if (!validateAction(action)) {
    return next({error: 'Action format error'});
  }
  switch (action.type) {
    case 'request-membership':
      requestMembership(action, function(err, _action) {
      console.log('requestMembership finish');
        console.log(err);
        if (err) {
          next(err);
        } else {
          res.json(_action);
        }
      });
      break;
    default:
      next({error: 'action not found'});
  }
});


router.get('/auth', function(req, res, next) {
  if (req.isAuthenticated()) {
    req.params.user = req.user._id;
    next();
  } else {
    res.json({});
  }
}, userResource.detail());



var upload = multer({
  storage: gridfs,
});
router.post('/upload', upload.any(), function(req, res, next) {
  console.log(req.files);
  res.json(req.files);
});

router.get('/gridfs/:id',  function(req, res, next) {
  gridfs.gfs.findOne({ _id: req.params.id }, function(err, file) {
    if (err || !file) {
      return next(err, file);
    }
    res.set('Content-Length', file.length);
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'inline; filename="' + file.filename + '"');
    gridfs.gfs.createReadStream({
      _id: req.params.id,
    }).pipe(res);
  })
});

router.post('/sendmail', function(req, res, next) {
  TCMailer.nodemailerMailgun.sendMail(req.body, function(err, status) {
    if (!err) {
      res.json(status);
    } else {
      next(err);
    }
  });
});

router.post('/validate', function(req, res, next) {
  var xmlDoc, errors;
  try {
    xmlDoc = libxml.parseXml(req.body.xml);
    xmlDoc.setDtd('TEI', 'TEI-TC', './data/TEI-transcr-TC.dtd');
    xmlDoc = libxml.parseXml(xmlDoc.toString(), {
      dtdvalid: true,
    })
    errors = xmlDoc.errors;
  } catch (err) {
    errors = err;
  }
  res.json({
    error:   _.map(errors, function(err) {
      return _.assign({}, err, {
        message: err.message,
      });
    }),
  });
});

module.exports = router;
/*
<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb/>
    <l n="1"> hello <lb/> world </l>
    <lb/>
  </div>
  <div n="div2">
    <l n="1">
      foo
      <pb n="1v"/>
      <lb/>
      bar
    </l>
  </div>
</body>
</text>

<text>
<body>
  <div n="div1">
    <pb n="1r"/>
    <head n="h1"> head </head>
    <ab n="ab1"> ab1 </ab>
    <ab n="ab2"> ab2 </ab>
    <lb n="1r1"/>
    <l n="1"> hello <lb  n="1r2"/> world </l>
    <lb  n="1r3"/>
     <l n="2"> foo  bar </l>
    <lb  n="1r4"/>
     <l n="3"> good  good </l>
  </div>
  <div n="div2">
        <lb n="1r5"/>
    <l n="1">
      foo

      <pb n="1v"/>
      <lb n="1v1"/>
      bar
    </l>
    <pb n="2r"/>
<lb n="2r1"/>
     <l n="1"> see <lb n="2r2"/> you</l>
  </div>
</body>
</text>

 */
