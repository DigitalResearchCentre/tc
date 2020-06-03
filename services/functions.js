var $ = require('jquery')
    , URI = require('urijs')
    , async = require('async')
    , defer = require("promise-defer")
    , config = require('../config')
    , models = require('../models')
    , TEI = models.TEI
    , DOMParser = require('xmldom').DOMParser
    , DualFunctionService = require('../public/app/services/dualfunctions')
;
;

var FunctionService = {
  loadTEIContent: function(version, content) {
    var deferred = defer();
//    console.log("in loadteicontent"); console.log(version.children)
//now, if there is a next attribute on this version.. we need to do somethng about it... create a series of children for eacah
    if (version.children.length) {
      async.map(version.children, procTEIs, function (err, results) {
          var newContent="";
          for (var i=0; i<results.length; i++) {
            //if break==no: trim space before/after
           if (results[i].indexOf('break="no"')!=-1)  {
              for (var j=newContent.length-1; newContent.charCodeAt(j) <=32 &&  j>0 ; j--) {
                    newContent=newContent.slice(0, -1);
              }  //remove space from start next element.. if there is one
              if (i<results.length-1) {
                for (var j=0; j<results[i+1].length && results[i+1].charCodeAt(j)<=32; j++)  {
                  results[i+1] = results[i+1].substring(1);
                }
              }
            }
            //ok... If speace before and after empty element: add to preceding/next word
            if (results[i].slice(-2)=="/>") {  //start of string...
              if (i==0 && results.length>1 && results[1].charCodeAt(0)<=32) {
                for (var j=0; j<results[1].length && results[1].charCodeAt(j)<=32; j++)  {
                  results[1] = results[1].substring(1);
                }
              } else if (newContent!="" && i<results.length-2) {  //in middle of results. check before and after do not ennd/be
                if (newContent.charCodeAt(-1)<=32 && results[i+1].charCodeAt(0)<=32) {
                  for (var j=0; j<results[i+1].length && results[i+1].charCodeAt(j)<=32; j++)  {
                    results[i+1] = results[i+1].substring(1);
                  }
                }
              } else {
                if (i==results.length-1 && newContent.charCodeAt(newContent.length-1)<=32) { // after last word
                  while (newContent.charCodeAt(newContent.length-1)<=32) {newContent = newContent.slice(0, -1);}
                }
              }
            }
            newContent+=results[i];
            //at this point: we have to intervene if our element is a lb pb cb with break=no to remove
          }
          content.content=newContent;
          deferred.resolve();
      })
    } else { //only one! add this to the tei
        if (version.name=="#text") {
     //     console.log(version.text);
          content.content+=version.text;
        } else {
          //no content, but an element -- pb or lb or similar, ignore
          //but .. don't ignore other elements! write them in...
          //problem! if it is reading, we need this
          //if it is a lb: add a space, unless break
          if (version.name=="rdg") {
            var attrs="";
            if (version.attrs) {
              for (var key in version.attrs) {
                attrs+=" "+key+"=\""+version.attrs[key]+"\"";
              }
            }
            content.content="<rdg"+attrs+"></rdg>";
          } else  {
            var attrs="";
            if (version.attrs) {
              for (var key in version.attrs) {
                attrs+=" "+key+"=\""+version.attrs[key]+"\"";
              }
            }
            content.content="<"+version.name+attrs+"/>"
          }
        }
        deferred.resolve();
    }
    return deferred.promise;
  }
}

function standardChar(source) {
  var target=new Array(source.length)
//  console.log("x"+source+"x");
  for (var i=0; i<source.length; i++) {
    if (source.charCodeAt(i)>127) {
      target[i]="x";
    } else target[i]=source[i];
  }
  return(target.join(""));
}

function procTEIs (teiID, callback) {
    TEI.findOne({_id:teiID}, function (err, version) {
      var tei={"content":""};
      FunctionService.loadTEIContent(version, tei).then(function (){
        //might here have to wrap element content in xml stuff?
        //test: is this an element...if it is, bookend with xml
        //when preparing for collation .. drop note elements here
        if (version.children.length && version.name!="#text") {
          var attrs="";
          if (version.attrs) {
            for (var key in version.attrs) {
              attrs+=" "+key+"=\""+version.attrs[key]+"\"";
            }
          }
          tei.content="<"+version.name+attrs+">"+tei.content+"</"+version.name+">";
        }
//        console.log("adding the tei "+tei.content)
        callback(err, tei.content);
      });
    });
}
//used when we need to parse the query string

module.exports = FunctionService;
