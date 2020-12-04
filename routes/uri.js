var _ = require('lodash')
  , ejs = require('ejs')
  , fs = require('fs')
  , path = require('path')
  , crypto = require('crypto')
  , async = require('async')
  , express = require('express')
  , multer = require('multer')
  , router = express.Router()
  , Resource = require('./resource')
  , models = require('../models')
  , TCMailer = require('../localmailer')
  , mongoose = require('mongoose')
  , config = require('../config')
  , gridfs = require('../utils/gridfs')
  , libxml = require('libxmljs')
  , Community = models.Community
  , Action = models.Action
  , User = models.User
  , Doc = models.Doc
  , Collation = models.Collation
  , Entity = models.Entity
  , Revision = models.Revision
  , TEI = models.TEI
  , VMap = models.VMap
  , RESTError = require('./resterror')
  , ObjectId = mongoose.Types.ObjectId
  , FunctionService = require('../services/functions')
  , DualFunctionService = require('../public/app/services/dualfunctions')
  , config=require('../config')
  , $ = require('jquery')
;

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

router.use(function(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Origin, X-Requested-With, Content-Type, Accept, Key, Cache-Control',
  });
  next();
});


router.get('**', function(req, res, next) {
  //ok, what do we have...
//  console.log(req.user);
  var detparts=req.params[0].slice(1).split("/");
  var authparts=detparts[0].split(":");
  var nameparts=detparts[1].split(":");
  var entityparts=[];
  var docparts=[];
  var inentity=false;
  var indoc=false;
  var errfound=false;
/*  if (!req.user) res.status(400).send('You have to be logged into Textual Communities to use the URI interface');  //may relax this later
  else */
  if (authparts[0]!='urn') res.status(400).send('URI protocol "'+authparts[0]+'" not recognized. "urn" expected');
  else if (authparts[1]!='det') res.status(400).send('URN Namespace Identifier "'+authparts[1]+'" not recognized. "det" expected');
  else if (authparts[2]!='tc') res.status(400).send('URN det naming authority prefix "'+authparts[2]+'" not recognized. "tc" expected');
  else if (authparts[3]!='usask') res.status(400).send('URN det naming authority organization "'+authparts[3]+'" not recognized. "usask" expected');
  else {
    //check validity of property value string
    if (detparts[1]!="") {  //could be search for communities only, no entities etc
      for (var i=0; i<nameparts.length; i++) {
        var bits=nameparts[i].split("=");
        if (bits.length==1) {
          errfound=true;
          res.status(400).send("Error in det name string: "+nameparts[i]+". The property name and value should be in 'property=value' form");
          i=nameparts.length;
        } else {
          if (bits[0]=="entity") {inentity=true; indoc=false};
          if (bits[0]=="document") {inentity=false; indoc=true};
          if (bits[0]=="vmap") {processVmap(bits, req, res, authparts[4]); return};
          if (inentity) entityparts.push({property:bits[0], value:bits[1]})
          if (indoc) docparts.push({property:bits[0], value:bits[1]})
        }
      }
    }
    if (!errfound) {
    //ok so far.. now, is this a public community?
    // we coujld be asking for all communities,in which case community is *
      if (authparts[4]=="*") {
          Community.find({public:true}, function(err, communities){
            if (err) res.status(400).send("Database error "+err);
            else {
              if (req.query.type=="count") res.json({count: communities.length});
              else if (req.query.type=="list") {
                var mycommunities=[];
                communities.forEach(function(community){ mycommunities.push({community:community.name})});
                res.json(mycommunities);
              } else {
                res.status(400).send("Error in query string '"+JSON.stringify(req.query)+"'. Only types count and list accepted in this context");
              }
            }
          });
      } else {
//        console.log(authparts[4]);
//      currently every community API is open...
        Community.findOne({abbr:authparts[4]}, function(err, community){
  //        console.log(community)
          if (!community) res.status(400).send('The community "'+authparts[4]+'" is not known on this Textual Communities server, or is not publicly available.');
          else { //fun starts! we got a community. Now, what do we have??? are we looking for just entity, just document, or text
            //ok.. we have only entity search, document search, or text search
            if (detparts[1].indexOf("entity=")!=-1 && detparts[1].indexOf("document=")!=-1) {
              //for now: implement only retrieval of base level units of text and Collation
              //in the future, permit retrieval of higher level units by community leaders
              if (detparts[1].indexOf("entity=")<detparts[1].indexOf("document=")) {
                var seekEntity=detparts[1].slice(detparts[1].indexOf("entity="), detparts[1].indexOf(":document="));
                var seekDocument=detparts[1].slice(detparts[1].indexOf("document="));
              } else {
                var seekDocument=detparts[1].slice(detparts[1].indexOf("document="), detparts[1].indexOf(":entity="));
                var seekEntity=detparts[1].slice(detparts[1].indexOf("entity="));
              }
              processText(req, res, next, authparts[4], seekEntity, seekDocument, detparts[1], entityparts, docparts);
            } else if (detparts[1].indexOf("entity=")!=-1) {
              entityRequest(req, res, community.entities, detparts[1], entityparts, 0, authparts[4], function(err, foundEntity) {
                if (!err) res.json(foundEntity);
              });
            } else if (detparts[1].indexOf("document=")!=-1) {
              docRequest(req, res, community.documents, detparts[1], docparts, 0, function(err, foundDoc) {
                var children=[];
                if (err) {next(err)} else {
                  //ok. what are we returning. If it is a page, we are currently supporting xml and a full html page
                  if (req.query.type=="transcript" && (foundDoc.label=="pb" || foundDoc.label=="lb" || foundDoc.label=="cb" )){
                    Doc.getTexts(foundDoc._id, function(err, texts) {
                      if (err) { next(err)} else {
                        if (req.query.format=="xml") {
                          res.send(formatXML(texts, true));
                        } else if (req.query.format=="html") {
                          var xml=formatXML(texts, false);
                          res.render('dettranscript.ejs', { source: formatHTML(xml), url: config.host_url});
                        } else { //deal with images, or whatevs
                          var key, result="?";
                          for (key in req.query) { if (req.query.hasOwnProperty(key)) {result+=key + "=" + req.query[key]+"&";}}; result=result.slice(0, -1);
                          res.status(400).send( "Cannot deal with request query '"+result+"'")
                        }
                      }
                    });
                  } else if (req.query.type=="IIIF") {
                    if (!foundDoc.image) res.json([]);
                    else {
                      if (foundDoc.image.startsWith("http")) var url=foundDoc.image+'/info.json';
                      else var url=config.IIIF_URL + foundDoc.image +'/info.json';
                      if (req.query.format=="url") {
                        res.json([{url:url}]);
                      } else if (req.query.format=="json") {
                        $.get(url, function(source) {
                          res.json([{source:source}]);
                        });
                      } else res.status(400).send( "Cannot deal with IIIF request format '"+req.query.format+"'");
                    }
                  } else if (req.query.type=="transcriptInf") {
                  		var seekDocument=detparts[1].slice(9, detparts[1].indexOf(":"));
                  		//get the document this is part of
                  		var pid= foundDoc.ancestors[0];
                  		Doc.findOne({_id: ObjectId(pid)}, function (err, parent){
                  			//now get the revisions...
                  			Revision.find({doc: foundDoc._id}, function (err, revisions){
                  				//ok .. go get the users, the date, the status of each
                  				let pRevisions=[];
                  				let users=[];
                  				revisions.forEach(function(revision) {
                  					if (!users.includes(String(revision.user))) users.push(String(revision.user))
                  					pRevisions.push({created: revision.created, status:revision.status, user:String(revision.user)})
                  				});
                  				//filter: so we are left with.. all users who carried out in progress or submitted transcripts
                  				//get last commit date
                  				var d = new Date(1990, 1, 1, 0, 0, 0, 0);
                  				var committed={date:d, user:""};
                  				pRevisions.forEach(function(previs) { 
                  					if (previs.status=='COMMITTED') if (previs.created>committed.date) {committed.date=previs.created; committed.user=previs.user}
                  				});
                  				//only get revisions etc BEFORE last commit date
                  				var transcribers=[];
                  				var uncommittedTranscripts=false;
                  				pRevisions.forEach(function(previs) { 
                  					if (previs.status=="IN_PROGRESS" || previs.status=="SUBMITTED") {
                  						if (previs.created>committed.date) {
                  							uncommittedTranscripts=true;
                  						}  else {
                  							if (!transcribers.includes(previs.user)) transcribers.push(previs.user);
                  						}
                  					}
                  				});
                  				//now get the user information
                  				async.map(users, function(user, cb){
                  					User.findOne({_id:ObjectId(user)}, function(err, myUser){
                  						if (err || !myUser) cb(err);
                  						else {
                  							cb(null, {user: user, name: myUser.local.name});
                  						}
                  					});
                  				}, function (err, results) {
                  					//replace id in transcribers and committer with name
                  					if (committed.user!="") {
                  						let username=results.filter(function (obj){return String(obj.user) == String(committed.user);})[0]
                  						committed.user=username.name;
                  					}	
                  					transcribers.forEach(function(transcriber,index){
                  						let username=results.filter(function (obj){return String(obj.user) == String(transcriber);})[0]
                  						transcribers[index]=username.name;
                  					})
     					           res.json({commitdate: committed.date, committer:committed.user, transcribers: transcribers, uncommittedtranscripts: uncommittedTranscripts, teiHeader: parent.teiHeader})                 			
                  				});
                   			})
                  		});
                  }  else if (req.query.type=="attrs") {
                  	res.json(foundDoc);
                  } else res.json({name:foundDoc.name, label:foundDoc.label, nparts: foundDoc.children.length, hasImage: foundDoc.hasOwnProperty("image")});
                }
              })
            }
            else res.status(400).send("entity and/or document declaration required by det urn syntax "+detparts[1]);
          }
        });
      }
    }
  }
});

function formatHTML(xml) {
  var p4=xml;
  p4=p4.replace(/<head/g, "<h3");
	p4=p4.replace(/<\/head/g, "</h3");
	p4=p4.replace(/<row/g, "<tr");
	p4=p4.replace(/<\/row/g, "</tr");
	p4=p4.replace(/<cell/g, "<td");
	p4=p4.replace(/<\/cell/g, "</td");
  p4=p4.replace(/ rend=/g, " class=");
  p4=p4.replace("<text>", "");
  p4=p4.replace("</text>", "");
  p4=p4.replace("<body>", "");
  p4=p4.replace("</body>", "");
  return(p4);
}

function formatXML(texts, isXML) {
  var nodes = JSON.parse(JSON.stringify(texts))
    , nodesMap = {}
    , root
  ;
  _.each(nodes, function(node) {
    node._children = _.map(node.children, function(childId) {
           return childId;
     });
     nodesMap[node._id] = node;
  });
  _.each(nodesMap, function(node) {
    if (_.isEmpty(node.ancestors)) {
      root = node;
  //                            console.log(root);
    } else {
      var children = nodesMap[_.last(node.ancestors)].children;
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
  var myPage= json2xmlDoc(root).children[0].outerHTML.normalize();
  myPage=myPage.replace(/\n/g, "");
  if (isXML)  myPage=myPage.replace(/><\/pb>/g, "/>").replace(/><\/lb>/g, "/>").replace(/><\/cb>/g, "/>").replace(/><\/gap>/g, "/>");
  return(myPage);
}

function entityRequest(req, res, entities, name, entityparts, i, community, callback) {
    if (entityparts[i].value=="*") { //wild card for docs at this level
      if (req.query.type=="count") {res.json({count: entities.length})}
      else if (req.query.type!="list" && req.query.type!="apparatus") {res.status(400).send("Error in query string '"+JSON.stringify(req.query)+"'. Only types count, list and apparatus                                                                                        accepted in this context")}
      else {
        if (entityparts[i].property=="*"|| (i==0 && entityparts[i].property=="entity")) {
          async.mapSeries(entities, function(myEntity, cb){ //how many children does each one have. Also.. here is where we extract the collaton
              var thisEntityProperty=myEntity.entityName.slice(myEntity.entityName.lastIndexOf(":")+1,myEntity.entityName.lastIndexOf("="));
              Entity.find({ancestorName:myEntity.entityName}, function(err, myentities){
                cb(err, {name:myEntity.name, label:thisEntityProperty, nparts: myentities.length})
              });
          }, function (err, results) {
            if (err) {res.status(400).send("Database error")}
            else {
                res.json(results);
              }
            })
        } else {//find by property value
          //no need to search for entities, we got them already...just return the entities matching this property value
          async.mapSeries(entities, function(myEntity, cb) {
            if (req.query.type=="apparatus") {
                if (myEntity.isTerminal) {
                  var format=req.query.format;
                  if (format=="NEXUS") format="xml/positive"
                  Collation.findOne({id:community+"/"+myEntity.entityName+"/"+format}, function (err, myCollation){
                    if (!myCollation) cb(err, {name: myEntity.entityName, collation:"NONE"})
                    else cb(err, {name: myEntity.entityName, collation: myCollation.ce})
                  });
                }
            } else {
              var thisEntityProperty=myEntity.entityName.slice(myEntity.entityName.lastIndexOf(":")+1,myEntity.entityName.lastIndexOf("="));
              if (thisEntityProperty==entityparts[i].property) {
                Entity.find({ancestorName:myEntity.entityName}, function(err, myentities){
                  cb(err, {name:myEntity.name, label:thisEntityProperty, nparts: myentities.length})
                });
              } else cb(null, null);
            }
          }, function (err, results) {
              for (var j=0; j<results.length; j++){ if (!results[j]) results.splice(j--,1)};
              if (err) res.send(err);
              else if (req.query.type=="apparatus") {
                  var content="", missing=""
                  for (var j=0; j<results.length; j++) {
                //    console.log()
                    if (results[j].collation=="NONE") {
                      missing+=results[j].name+" ";
                    } else {
                        results[j].collation=results[j].collation.replace("<?xml version='1.0' encoding='utf-8'?>","").replace('<TEI xmlns="http://www.tei-c.org/ns/1.0">',"").replace('</TEI>',"").replace('xml:id',"n");
                        content+="<br/>"+results[j].collation.replace(/</gi, "&lt;").replace(/&lt;app/gi, "<br/>&nbsp;&nbsp;&nbsp;&nbsp;&lt;app").replace(/&lt;lem/gi, "<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;lem").replace(/&lt;rdg/gi, "<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;rdg").replace(/&lt;\/app/gi, "<br/>&nbsp;&nbsp;&nbsp;&nbsp;&lt;/app").replace(/&lt;\/ab/gi, "<br/>&lt;/ab");
                    }
                  }
                  makeCollatedWitList(community, entityparts, function(witlist) {
                    var today = new Date().toLocaleString('en-GB',{  day : 'numeric',month : 'long',year : 'numeric', hour: '2-digit', minute:'2-digit'})
                    var startXML="<?xml version='1.0' encoding='utf-8'?>"+'<TEI xmlns="http://www.tei-c.org/ns/1.0">'+"<teiHeader><fileDesc><titleStmt><title>";
                    var endXML="</div></body></text></TEI>".replace(/</gi, "&lt;");
                    startXML+="Collation for "+name+", output for "+req.user.local.name+" ("+req.user.local.email+"), generated at "+today+'</title></titleStmt><publicationStmt><p rend="ital">dummy</p></publicationStmt><sourceDesc>'+witlist+'</sourceDesc></fileDesc></teiHeader><text><body><div>'
                    content=startXML.replace(/</gi, "&lt;")+content+"<br/>"+endXML;
                    if (req.query.format=="NEXUS") content=DualFunctionService.makeNEXUS(content);
                    if (missing) content="No collation found for "+missing+"<br/>"+content;
                    res.send(content);
                  });
              }
              else res.json(results);

          });
       }
    }
  } else {//recurse till we hit end, or hit *
    //construct the entity name to this point..are we matching up to now?
    var thisEnt=community;
    var foundEnt=false;
    for (var k=0; k<entityparts.length && k<=i; k++) {thisEnt+=":"+entityparts[k].property+"="+entityparts[k].value}
    for (var j=0; j<entities.length; j++) {
      //have to ensure we have match of full entity name. Either, matching whole string, or matching includes following :
      if (thisEnt==entities[j].entityName || thisEnt+":"==entities[j].entityName.slice(0, thisEnt.length+1)) {
        //we match!
        foundEnt=true;
          if (i==entityparts.length-1) {//the one we wanted..
          var thisEntityProperty=entities[j].entityName.slice(entities[j].entityName.lastIndexOf(":")+1, entities[j].entityName.lastIndexOf("="));
          if (!entities[j].isTerminal) {
            var thisEntity=entities[j];
            Entity.find({ancestorName: thisEntity.entityName}, function(err, myentities){
              callback(err, {name: thisEntity.name, nparts:myentities.length, ancestorName: ("ancestorName" in entities[j])?thisEntity.ancestorName:"", entityName:thisEntity.entityName, label:thisEntityProperty});
            });
          }
          else {  //terminal! now we could be looking for an apparatus...
            if (req.query.type=="apparatus") {  //we are looking only for the apparatus for one unit
                Collation.findOne({id:community+"/"+entities[j].entityName+"/"+req.query.format}, function (err, myCollation){
                  if (err || !myCollation) {
                    {res.status(400).send("Error finding collation of block '"+entities[j].entityName+"'. There may be no collation of this block")}
                  }
                  else res.send(myCollation.ce.replace(/</gi, "&lt;"));
                })
            } else {
              callback(null, {name: entities[j].name, nparts:0, ancestorName: ("ancestorName" in entities[j])?entities[j].ancestorName:"", entityName:entities[j].entityName, label:thisEntityProperty});
            }
          }
        } else { //go round again
            //but... only go if this entity has children... else error
            Entity.find({ancestorName:thisEnt}, function(err, myentities){
              if (myentities.length==0) {
                res.status(400).send('Found "'+thisEnt+'" as part of "'+name+'", but this has no children');
              } else {
                entityRequest(req, res, myentities, name, entityparts, i+1, community, callback);
              }
            });
        }
      }
    } //if we got here, no match!
    if (!foundEnt) res.status(400).send("Cannot find "+name);
  }
};

function docRequest(req, res, documents, name, docparts, i, callback) {
  if (docparts[i].value=="*") { //wild card for docs at this level
    if (req.query.type=="count") {res.json({count: documents.length})}
    else if (req.query.type!="list") {res.status(400).send("Error in query string '"+JSON.stringify(req.query)+"'. Only types count and list accepted in this context")}
    else {
      if (docparts[i].property=="*" || (i==0 && docparts[i].property=="document")) {
        var foundline=0;
        async.mapSeries(documents, function(myDoc, cb){
          Doc.findOne({_id: myDoc}, function (err, thisDoc){
            if (!thisDoc.hasOwnProperty('name') && thisDoc.label=="lb") {
              foundline++;
              cb(err, {name: foundline, nparts: thisDoc.children.length, label:thisDoc.label,hasImage: thisDoc.hasOwnProperty("image")});
            }
            else cb(err, {name: thisDoc.name, nParts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image")});
          })
        }, function (err, results){
          if (err) res.status(400).send("Database error")
          else {
            res.json(results);
          }
        });
      } else { //we have a defined property. Filter documents by property name
        var foundline=0;
        async.mapSeries(documents, function(myDoc, cb){
          Doc.findOne({_id: myDoc, label:docparts[i].property}, function (err, thisDoc){
            if (thisDoc) {
              if (docparts[i].property=="lb" && !thisDoc.hasOwnProperty('name')) {
                foundline++;
                cb(err, {name: foundline, nparts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image")});
              } else cb(err, {name: thisDoc.name, nparts: thisDoc.children.length, label:thisDoc.label, hasImage: thisDoc.hasOwnProperty("image") });
            } else cb(err, null)
          });
        }, function (err, results) {
          //remove non-matching pages
          for (var i=0; i<results.length; i++){ if (!results[i]) results.splice(i--,1)};
          if (!err) res.json(results);
          else res.send(err);
        });
      }
    }
  }
  else {
    var foundDoc={};
    //special case: lb elements are not given explicit names
    var foundline=0;
    async.mapSeries(documents, function(myDoc, cb){
      Doc.findOne({_id: myDoc}, function (err, thisDoc){ //we may not number line breaks explicitly
        if (!thisDoc.hasOwnProperty('name') && thisDoc.label=="lb") {
          foundline++;
//          console.log("looking for the line")
          if (foundline==docparts[i].value) {
//            console.log("got the line?")
            foundDoc=thisDoc;
            foundDoc.name=""+foundline;
            cb("found document");
          } else cb(err);
        }
        else if (thisDoc.name==docparts[i].value) {
          foundDoc=thisDoc
          cb("found document");
        }
        else cb(err);
      })
    }, function (err) {
      if (err=="found document") {
        if (i==docparts.length-1) {
          callback(null, foundDoc);
        } else {//recurse...
          //but if we don't have children, and we are looking for a child..death
          if (foundDoc.children.length==0) {
            res.status(400).send("Cannot find "+name);
          }
          else
          docRequest(req, res, foundDoc.children, name, docparts, i+1, callback);
        }
      } else {
        res.status(400).send("Cannot find "+name);
      }
    });
  }
  //ok, we are asking for a document..
  //first, could be we are looking for all the documents, or all the parts of one part of a document
}

function processText(req, res, next, community, seekEntity, seekDocument, detString, entityparts, docparts) {
  //presently, only support: listing of docs with a particular entity; text of an entity in a doc returned in various formats including colledtior
  //return all documents containing a particular entity
  //need to support: find all entities present in a document..or part of a document..
  if (entityparts[entityparts.length-1].value=="*" && docparts.length>0) {
//    console.log("here");
      getDocEntities(community, seekDocument, seekEntity,  entityparts, docparts, function (result){

          res.json(result);
      });
  } else if (docparts[docparts.length-1].value=="*" && docparts.length==1) { //looking for documents holding this text
      getEntityDocs(community, seekEntity, req, res, docparts, entityparts, function (result){
        res.json(result);
      });
  } else if (docparts[docparts.length-1].value=="*" && docparts.length==2) {//this is looking for a page range: pages holding this entity
      getEntityDocs(community, seekEntity, req, res, docparts, entityparts, function (result){
        res.json(result);
      });
  } else if (docparts[docparts.length-1].value=="*" && docparts.length>2) {
      res.status(400).send("Unable to search for documents holding an entity below the page level.");
  } else if (docparts.length>1)  {
      //we ONLY support base level entities at the full document level
      res.status(400).send("Unable to retrieve texts holding an entity in documents below the whole document level.");
  } else { //we only support retrieval at base level
      Entity.findOne({entityName: community+":"+seekEntity}, function (err, myEntity) {
        if (!myEntity.isTerminal) res.status(400).send("Entity '"+seekEntity+"' contains other elements. Only base level entities may be retrieved (lines, not poems; paragraphs not chapters, etc)");
        else if (req.query.format=="xml") getXMLText(res, next, community, seekEntity, seekDocument, detString, entityparts, docparts, true);
        else if (req.query.format=="CollEditor") getXMLText(res, next, community, seekEntity, seekDocument, detString, entityparts, docparts, false);
        else res.status(400).send("Can only retrieve texts in XML or Collation Editor format.");

      });
  }
}

//we return a list of entities present in a document, or document part. Sp final entity must be *:* or maybe x:*
function  getDocEntities(community, seekDocument, seekEntity,  entityparts, docparts, callback){
  //first find the doc.  We are only going to look down to the page level, not lower\
  var ancestors=[];  //inital search is going to be looking for docs with no ancestors.. work our day down the tree
  var iteration=1;
  async.mapSeries(docparts, function (docpart, cb1) {//do a deep div to find the document...
    Doc.findOne({name:docpart.value, community:community, ancestors: ancestors}, function (err, myDoc){
      if (!err && myDoc) {
//        console.log(myDoc);
        ancestors.push(myDoc._id)
        cb1(null, myDoc._id);
      } else {
        cb1(err, []);
      }
    });
  }, function (err, result) {
    //ok, now find the entities as specified...a bit tricky as we have to get the entity ancestors of all teis present in this page, not just the entities which start on this page
    if (entityparts[0].value=="*" && entityparts.length==1) {
      var myEntities=[];
      TEI.find({docs: result[result.length-1]}, function (err, teis){
        async.each(teis, function(teiel, cb2) {
 //           console.log(teiel._id);
            if (teiel.isEntity) {
                if (!myEntities.some(e => e.entity === teiel.entityName)) myEntities.push({entity: teiel.entityName, collateable:teiel.isTerminal});
                cb2(null);
            } else { //gp looking for the entity...by definition the tei must be inside a documemnt..
              var nextTeiId=teiel.ancestors[teiel.ancestors.length-1];
              async.whilst (
                function () {return nextTeiId!=null},
                function(cb1) {
                  TEI.findOne({_id: nextTeiId}, function(err, ancestorTei){
                    if (ancestorTei.isEntity && ancestorTei.name!="text") {
        //              if (ancestorTei.name!="text") console.log (ancestorTei);
                      if (!myEntities.some(e => e.entity === ancestorTei.entityName)) myEntities.push({entity: ancestorTei.entityName, collateable:ancestorTei.isTerminal});
                      nextTeiId=ancestorTei.ancestors[ancestorTei.ancestors.length-1];
                      cb1(null, null);
                    } else {
                      if (ancestorTei.ancestors.length==0) nextTeiId=null;
                      else nextTeiId=ancestorTei.ancestors[ancestorTei.ancestors.length-1];
                      cb1(null, null);
                    }
                  })
                },
                function (err) {
                  cb2(null); //finished this each
                }
              )
            }
          }, function (err) {
            callback(myEntities);
          });
      })
    }
  });
}

function makeCollatedWitList(community, entityparts, callback) {
//  console.log(entityparts);
  var entitySought=community;
  for (var i=0; i<entityparts.length-1; i++) {
    entitySought+=":"+entityparts[i].property+"="+entityparts[i].value;
  }
//  console.log("looking for "+entitySought);
  Community.findOne({abbr:community}, function(err, myCommunity) {
    if (typeof myCommunity.ceconfig.witnesses != "undefined") {
      var listWit="<listWit>";
      for (var i=0; i<myCommunity.ceconfig.witnesses.length; i++) {
        listWit+="<witness>"+myCommunity.ceconfig.witnesses[i]+"</witness>";
      }
      listWit+="</listWit>"
      callback(listWit);
    } else {
      async.map(myCommunity.documents, function(myDoc, cb){
        Doc.findOne({_id: myDoc}, function (err, thisDoc){
          //test here if this wit has this entity in it...
          TEI.findOne({entityAncestor:entitySought, "docs.0":ObjectId(myDoc)}, function (err, isTEI) {
            if (isTEI)  cb(err, thisDoc.name);
            else (cb(err, ""));
          })
        });
      }, function (err, results) {
        var listWit="<listWit>";
        for (var i=0; i<results.length; i++) {
          if (results[i]!="")
            listWit+="<witness>"+results[i]+"</witness>";
        }
        listWit+="</listWit>"
        callback(listWit);
      });
    }
  });
}
function getEntityDocs(community, seekEntity, req, res, docparts, entityparts, callback) {
  //bring back the number of documents holding this entity, the names of the documents, or the page range of the document
  //we are either searching for documents holding this entity...
 // console.log("here in ged docparts "); console.log(docparts);
  if (docparts.length==1) {
    TEI.find({entityName: community+":"+seekEntity, community: community}, function (err, texts) {
      if (err) res.status(400).send("Database search error "+err);
      else if (req.query.type=="count") {res.json({count: texts.length})}
      else if (req.query.type!="list") {res.status(400).send("Error in query string '"+JSON.stringify(req.query)+"'. Only types count and list accepted in this context")}
      else if (req.query.type=="list") {
      	//we need to return these in the order in which they are in the master docs
      	Community.findOne({abbr:community}, function(err, myCommunity){
     // 		console.log(myCommunity.documents);
      		async.mapSeries(myCommunity.documents, function(myDoc, cb){
      		  //does this doc contain this entity?
      		  let myEnt= community+":"+seekEntity;
     //		  console.log("here "+myDoc+" entity "+myEnt+" community "+community);
     		  //we have all the texts.. just match the document id against values in the texts array
     		  let foundText=false;
     		  texts.forEach(function(text) {
     //		  	console.log("ancestor "+text.docs[0]);
     		  	if (String(text.docs[0])==String(myDoc)) foundText=true;
     		  });
     		  if (foundText) {
				  Doc.findOne({_id:myDoc}, function(err, thisDoc){
					cb(err, {name: thisDoc.name})
				  })
			  } else {cb(err, "")};
			}, function(err, results){
			  if (err) res.status(400).send("Database error");
			  else callback(results.filter(Boolean));
			});
      	});
      }
    });
  } else {//more than one doc part. We must be looking for a page range
    //we have to look at every page in the docoment. Either the page tei is the ancestor of the entity TEI, or is a child of the entity TEI
    //first find the entity, the document, and check every page within it..
    var listPages=[];
//    console.log(seekEntity);
    Doc.findOne({name:docparts[0].value, community:community, ancestors: []}, function (err, myDoc){
     if (!myDoc) {
     	 res.status(400).send("No document "+docparts[0].value+" in this community");
     } else {
		  //find the tei for this entity in this doc. does it exist?
		 if (!myDoc) res.status(400).send("No document "+err+docparts[0].value+"");
//		  console.log(myDoc);
		  TEI.find({entityName: community+":"+seekEntity, community: community, docs: {$in:[myDoc._id]}}, function(err, myTEIs){
			if (err) res.status(400).send('error in database search for '+seekEntity+' in document '+myDoc.name);
			else {
			  async.forEachOf(myTEIs, function(myTEI) {  //there could be more than one...
				const cb1 = _.last(arguments);
				async.mapSeries(myDoc.children, function(thisDoc, cb2){ //check each page. Does it have myTEI as an ancestor:
	  //            console.log("doc "+thisDoc+" myTEI" +myTEI._id);
				  TEI.findOne({name:"pb", docs: {$in:[thisDoc]}, ancestors:{$in:[myTEI._id]}}, function (err, inTEI) {
					if (!err) {
					  if (inTEI) { //this page is a child of the tei
						Doc.findOne({_id:thisDoc}, function(err, pbDoc){
						  if (listPages.indexOf(pbDoc.name)==-1) listPages.push(pbDoc.name);
						  cb2(null, []);
						})
					  } else { //might be the other way around! tei is a child of the page
						if ((myTEI.docs).indexOf(thisDoc)!=-1) {
						  Doc.findOne({_id:thisDoc}, function(err, pbDoc){
							if (listPages.indexOf(pbDoc.name)==-1) listPages.push(pbDoc.name);
							cb2(null, []);
						  });
						} else cb2(null, []);
					  }
					} else cb2(err, []);
				  })
				}, function (err, results){
				  cb1(err, []);
				})
			  }, function (err, results){
				if (err) res.status(400).send('error in database search for '+seekEntity+' in document '+myDoc.name);
				else {
				  if (req.query.type=="count") res.json({count: listPages.length});
				  else if (req.query.type=="list") res.json(listPages);
				  else res.status(400).send("Error in query string '"+JSON.stringify(req.query)+"'. Only types count and list accepted in this context");
				}
			  });
			}
		})
      }
    })
  }
}

function json2xmlDoc(obj) {
  const { document } = (new JSDOM(`...`)).window;
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

function getXMLText(res, next, community, seekEntity, seekDocument, detString, entityparts, docparts, isXML) {
  //find the community, the document, the entity...
  Community.findOne({abbr:community}, function(err, myCommunity){
    if (err || !myCommunity)  res.status(400).send("Error finding community '"+community+"'.");
    else {
      var foundDoc=null;
//      console.log(seekDocument);
      async.forEachOf(myCommunity.documents, function(thisDoc) {
          const callback = _.last(arguments);
          Doc.findOne({_id:thisDoc}, function(err, thisDoc){
            if (err || !thisDoc) callback(err);
            else if (thisDoc.name==docparts[0].value) {
              foundDoc=thisDoc;
              callback(null);
            } else callback(null);
          });
      }, function (err){
        if (err || !foundDoc) res.status(400).send("Error finding document '"+seekDocument+"'.");
        else {//get the teis for this
          TEI.find({entityName:community+":"+seekEntity, docs: {$in:[foundDoc._id]}}, function (err, teis){
            if (err) res.status(400).send("Error finding teis for document '"+seekDocument+"'.");
            else {
              var foundVersions=[];
              if (!isXML) var content='{"_id": "'+foundDoc.name+'_'+seekEntity+'", "context": "'+seekEntity+'","tei":"", "transcription_id": "'+foundDoc.name+'","transcription_siglum": "'+foundDoc.name+'","siglum": "'+foundDoc.name+'", "witnesses":[';
              var counter=0;
              async.forEachOf(teis, function(version) {
                const cb2 = _.last(arguments);
                var teiContent={"content":""};
                FunctionService.loadTEIContent(version, teiContent).then(function (){
                  //get the page name...
                  Doc.findOne({_id: version.docs[1]}, function(err, myPage){
                    if (isXML) foundVersions.push({place: myPage.name, text: teiContent.content})
                    else {
                      if (counter>0) {
                        content+=","+DualFunctionService.makeJsonList(teiContent.content, foundDoc.name+"("+counter+")");
                      }
                      else  content+=DualFunctionService.makeJsonList(teiContent.content, foundDoc.name);
                      counter++;
                    }
                    cb2(err);
                  })
                });
              }, function(err){
                if (isXML) res.json(foundVersions);
                else {
                  content+=']}';
                  res.json(JSON.parse(content));
                }
              });
            }
          })
        }
      });
    }
  })
}

function processVmap (bits, req, res, community) {
	if (bits[1]=="*") {
		 VMap.find({community: community}, function(err, vmaps) {
			if (err) {
				res.json({result: err});
			} else {
			if (vmaps.length) {
				 var VMaps=[];
				 vmaps.forEach(function(vmap){
					VMaps.push({name:vmap.name, unlabelled: vmap.pdfunlabelled.name, nwits:vmap.wits.length})
				 });
				 if (req.query.type=="count") {
					res.json({count: vmaps.length});
				} else if  (req.query.type=="list") {
					res.json(VMaps);
				} else {
					res.json({error: "No valid request type"})
				}
			 } else { //no varmaps
				 res.json({error:"No variant maps found"});
			 }
		  }
		}); 
	} else {
		VMap.findOne({community: community, name: bits[1] }, function(err, vmap) {
			if (err || !vmap) res.json({error: ""});
			else res.json(vmap);
		});
	}
}

module.exports = router;
