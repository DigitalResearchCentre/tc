var $ = require('jquery')
;

var punctuation=".,:-/&@¶§;·⸫▽?!'"+'"';


function isCEPunctuation(myChar) {
  for (var i=0; i<punctuation.length; i++) {
    if (punctuation.charAt(i)==myChar) return true;
  }
  return false;
}


//this is for functions accessible on both client and server sides
var DualFunctionService = {
 makeJsonList: function (content, witness) {
//    console.log("in "+witness+" for "+content);
    var thistext="";
    //remove line breaks,tabs, etc
  //  thistext+=content.replace(/(\r\n|\n|\r)/gm,"");
  //  console.log("before "+content)
    content=content.replace(/(\r\n|\n|\r)/gm,"");
    content=content.replace(/<note(.*?)<\/note>/gm,"");
    content=content.replace(/(\t)/gm," ");
    content=content.replace(/  +/g, ' ');
    content=content.replace(/"/g, "\'\'");   //this is a hack. Can't figure out how to handle " in strings
    content=content.replace(/'/g, "\'");
  //  console.log("after "+content)
    content=content.trim();
  //  console.log("let's start here "+content);
    var myWitRdgs=[];
    //is there an app here..
    if (content.indexOf("<app>")!=-1) {
      //ok we got app elements
  //    console.log("got some apps");
       var myRdgTypes=DualFunctionService.getRdgTypes(content);
       //myRdgTypes);
       var myWitRdgs=DualFunctionService.createRdgContent(content, myRdgTypes, witness);
  //     console.log("back in api "); console.log(myWitRdgs);
       //now, manufacture a string for each app
    }
    if (myWitRdgs.length==0)
       myWitRdgs.push({witness: witness, content: content})
    else {
      for (var j=0; j<myWitRdgs.length; j++) {
        myWitRdgs[j].witness=witness+"-"+myWitRdgs[j].type;
      }
    }
  //  console.log(myWitRdgs);
    //ok, process into an array with word and  elements
      for (var j=0; j<myWitRdgs.length; j++) {
      thistext+='{"id":"'+myWitRdgs[j].witness+'","tokens":[';
  //    console.log("about to call CE array :"+thistext);
      var myWords=DualFunctionService.makeCeArray(myWitRdgs[j].content);
  //    console.log(thistext);
 //       console.log(myWords);
  //this is a backstop....
  		for (var i = 0; i < myWords.length; i++) {
  			if (myWords[i].word[0]=="<") {  //rewrite, removing xml
  				var newWord="";
  				myWords[i].xmlword=myWords[i].word;
  				for (var k=0; k<myWords[i].word.length; k++) {
  					if (myWords[i].word[k]=="<") {
  						while (myWords[i].word[k]!=">" && j<myWords[i].word.length) {
  							k++;
  						}
  					} else {
  						newWord+=myWords[i].word[k];
  					}
  				}
  				myWords[i].word=newWord;
 // 				console.log("after clean");
 // 				console.log(myWords);
  			} 
  		}
    //  var myWords=content.split(" ");
      for (var i = 0; i < myWords.length; i++) {
        var index=(i+1)*2;
        //also put uncap version of word in rule match too
        var rule_match_cap="";
        if (myWords[i].word!=(myWords[i].word.toLowerCase()))
          rule_match_cap=',"'+myWords[i].word.toLowerCase()+'"';
        var rule_match='"rule_match":["'+myWords[i].word+'"'+rule_match_cap+']';
        var token = '"t":"'+myWords[i].word+'"';
        if (myWords[i].origword=="") var original='"original":"'+myWords[i].word+'"';
        else var original='"original":"'+myWords[i].origword+'"';
        if (myWords[i].expanword=="") var expanded="";
        else var expanded=',"expanded":"'+myWords[i].expanword+'"';
        if (myWords[i].xmlword=="") var xmlWordStr="";
        else var xmlWordStr=',"fullxml":"'+myWords[i].xmlword.replace(" ","&nbsp;")+'"';
        if (myWords[i].punctbefore=="") var punctbeforeStr="";
        else var punctbeforeStr=',"pc_before":"'+myWords[i].punctbefore.replace(" ","&nbsp;")+'"';
        if (myWords[i].punctafter=="") var punctafterStr="";
        else var punctafterStr=',"pc_after":"'+myWords[i].punctafter.replace(" ","&nbsp;")+'"';
        //test: are there expansions for this word? does this word contain <am>/<ex>? look for xml forms too

        if (myWords[i].expanword!="" && myWords[i].xmlword!="") {
          var rmExword="";
          var rmExmlword="";
          var expanword=myWords[i].expanword;
          var xmlword=myWords[i].xmlword;
          if (expanword!=expanword.toLowerCase()) rmExword=',"'+expanword.toLowerCase()+'"';
          if (xmlword!=xmlword.toLowerCase()) rmExmlword=',"'+xmlword.toLowerCase()+'"';
          token='"t":"'+myWords[i].origword+'"';
          rule_match='"rule_match":["'+expanword+'","'+myWords[i].origword+'","'+xmlword+'"'+rmExword+rmExmlword+']';
        }
        else if (myWords[i].xmlword!="") {
          var rmExmlword="";
          if (myWords[i].word!=myWords[i].word.toLowerCase()) rmExmlword=',"'+myWords[i].word.toLowerCase()+'"';
          token='"t":"'+myWords[i].word+'"';
          rule_match='"rule_match":["'+myWords[i].word+'","'+myWords[i].xmlword+'"'+rmExmlword+']';
        }
        else if (myWords[i].expanword!="") {
          var rmExword="";
          var expanword=myWords[i].expanword;
          if (expanword!=expanword.toLowerCase()) rmExword=',"'+expanword.toLowerCase()+'"';
          token='"t":"'+myWords[i].origword+'"';
          rule_match='"rule_match":["'+myWords[i].expanword+'","'+myWords[i].word+'","'+myWords[i].origword+'"'+rmExword+']';
        }
        thistext+='{"index":"'+index+'",'+token+","+rule_match+',"reading":"'+myWitRdgs[j].witness+'",'+original+expanded+xmlWordStr+punctbeforeStr+punctafterStr+'}';
        if (i<myWords.length-1) thistext+=',';
      }
      thistext+=']}'
      if (j<myWitRdgs.length-1) thistext+=',';
    }
  //  console.log(thistext);
    return(thistext);
  },
   makeCeArray: function (content) {
//    console.log("in CE Array")
//    console.log("content:'"+content+"'");
    var words=[];
    var tags=[];
    var word="";
    var expanword="";
    var origword="";
    var xmlword="";
    var xmlpresent=false;
    var expanpresent=false;
    var prefix="";
    var suffix="";
    var isNewWord=false;
    var punctstr="", punctafter="", punctbefore="";
    //ok, coz we have unicode this is NOT reliable...
    //so rebuild the string
    var myContent=[];
//    console.log("here we are  "+content)
    for (let myChar of content) {
      myContent.push(myChar);
    }
    //add a space..
    myContent.push(" ");
    for (var i=0; i<myContent.length; i++) {
      var endtag=false;
      if (isCEPunctuation(myContent[i])) {
        punctstr+=myContent[i];
          //problem here.. we might have forms "bill, $peter". We need to split this: stop at space, allocate to
          //punctafter and call routine to deal with the world; rest goes to punctbefore
          //but!!! before first word "¶§ //Peter" everything has to go in punctbefore...
        if (words.length==0 && word=="" && punctbefore=="") {
          for (++i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
            punctstr+=myContent[i];
          }
          punctbefore=punctstr;
  //        console.log("punct before word "+punctbefore)
          punctstr="";
          i--;
        } else {
         //if not before first word: then everything before first space is punct after...
          //are we dealing with punctbefore or after...? if word is empty, it is before. else, it is after
          if (word=="") {
            //could include spaces again, which we skip over until we get to first real leetter
            //situations! in case such as:
            //1 "as /bragot": attach to FOLLOWING word. In this case: next character is not a space
            //2 "as / bragot": we want to attach this to PRECEDING word. In this case: followed by space and check if preceding word punctafter is set
            //3 "as / ,, bragot": attach / to PRECEDING word ,, to following word: precedng word punctafter is set. Everything up next word is punct before
            //4 "bragot ,,, .." where bragot is the last word in the line
            //could be char before is a space..only significant where
            for (++i; i<myContent.length && (isCEPunctuation(myContent[i])); i++) {
              punctstr+=myContent[i];
            }
            if (myContent[i]!=" ") {
              punctbefore=punctstr;  //case 1
            } else {
              //space following punctuation. if punctafter on prev word not yet set. If it is, another game
                    //could also be case 4. after last word with punctafter NOT set on prev words
              if (words[words.length-1].punctafter=="") { //2 "as / bragot"
                //if this is last word...ok, see if rolling through tokens takes us end of content
                //if this is preceded by space then prefix the space
                var origi=i-punctstr.length-1;
                for (i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
                  punctstr+=myContent[i];
                }
  //              console.log("at i "+i+content.charAt(i)+" at i-1 "+(i-1)+content.charAt(i-1)+" at origi "+origi+content.charAt(origi)+" punct "+punctstr);
                if (myContent[origi]==" ") punctstr=" "+punctstr;
  //              console.log("in last word? "+words[words.length-1].word+" punctstr "+punctstr)
                if (i==myContent.length) words[words.length-1].punctafter+=punctstr; //case 4
                else {
                  words[words.length-1].punctafter=punctstr;  //probs have to json this
              //    i=origi;
                }
              }
              else { //case 3. "as / ,, bragot"
                for (i; i<myContent.length && (isCEPunctuation(myContent[i]) || myContent[i]==" "); i++) {
                  punctstr+=myContent[i];
                }
                //now, if this is the last word, we are at end of string.. add this to punct after on last word
                if (i==myContent.length) {
                  words[words.length-1].punctafter+=punctstr;  //probs have to jsonify this
                } else punctbefore=punctstr;
              }
            }
            punctstr="";
          }
          else {
            //in this case -- we stop at EITHER space or new word. In either case.. trigger word separation
            for (++i; i<myContent.length && (isCEPunctuation(myContent[i])); i++) {
              punctstr+=myContent[i];
            }
            punctafter=punctstr;
            isNewWord=true;  //trigger new word, coz maybe
            punctstr="";
            //if next character is NOT space..back off one character
//            console.log("word is "+word+" character is '"+content.charAt(i)+"' punct is '"+punctafter+"'");
          }
          //note that if last char in punctstr is a space .. roll back so we get the word.
          //in this case: the punctstr is punct after preceding word
          //except if this is the first word, then we roll on to deal with the next word and this punct is punct before
          //if there is NO space between punct token and the following word (ie last char in puncstr is NOT a space)
             // AND the word token is empty: then this is punct before next word
             //but if word token is not empty, and no space before: then we separate the word token into two and add this punctuation to first half of word as punct_after

          i--;
       }
     }
      else if (myContent[i]=="<") {
        var tag="<";
        var tagname="";
        var isEmpty=false;
        xmlpresent=true;
        if (myContent[i+1]=="/") {
          tag+="/";
          endtag=true;
          i++;
        }
        i++;
        while (myContent[i]!=" " && !(myContent[i]=="/" && myContent[i+1]==">") && myContent[i]!=">" ) {
          tag+=myContent[i];
          tagname+=myContent[i++];
        }
        if (myContent[i]==" ") {
          while (!(myContent[i]=="/" && myContent[i+1]==">") && myContent[i]!=">") {
            tag+=myContent[i++];
          }
        }
      if (myContent[i]=="/" && myContent[i+1]==">") {
          isEmpty=true;
          tag+="/>";
          i+=2;
        }
        if (myContent[i]==">") {
          tag+=">";
        }
        //ok, we have the xml tag, we know it is an end tag, or empty
        // do NOT deal here with <am> and <ex> tags. We are going to presume am and ex NEVER span a word
        // interesting case.. should origform in ex cases preserve whole am/ex sequence? I think not?
        var success=1;
        if (!isEmpty) {
          if (!endtag)
            tags.push({tag: tag, tagname: tagname})
          else tags.pop();
          //note that we add am and ex tags to expanword too? -- take those out elsewhere? I think so...
          //we may want to introduce a distinction between forms with/without XML, and expanced/abbrev forms
          if (tagname=="am"||tagname=="ex") {
  //          console.log("we have an expansion")
            expanword+=tag;
            expanpresent=true;
          }
          word+=tag;  //now word and expanword will differ. Note that empty tags are just ignored
                      //hence: " <pb/> " will NOT appear in our array
                      //this is an error -- we want <gap> tags to appear.. and pb lb cb..
        } else {//if the tag is pb lb cb we want to hide it! but otherwise write it out
//          console.log("got an empty tag "+tag)
          word+=tag;
          i--; //rewind 1 space
        }
      } else if (myContent[i]==" " || isNewWord) {
        //right, we have a word..
        if (isNewWord) { //newWord invoked.. might have to go back one char?
  //        console.log("word is "+word+" character is '"+myContent.charAt(i)+"' punct is '"+punctafter+"'");
        }
        isNewWord=false;
        if (word!="" && word!=" ") {
          word=prefix+=word;
          prefix=suffix="";
          if (tags.length!=0) {
            for (var j = 0; j < tags.length; j++) {
              suffix+="</"+tags[j].tagname+">";
            }
          } else suffix="";
          word+=suffix;
          //hmm.. if expanword contains <am>, push it. Note that we might also treat other 'mirror elements' similarly
          //ok, deal with am ex here
          if (expanword.indexOf("<am")!=-1) {
            origword = expanword;
 //           console.log("before "+origword)
            var re_am2 = /<am rend=''([^'].*)''.*<\/am>/g;;
            var re_ex = /<ex>(.*?)<\/ex>/g;
            var re_ex2= /<ex(.*?)<\/ex>/g;
            var re_am = /<am>(.*?)<\/am>/g;
            expanword=expanword.replace(re_am2, "").replace(re_ex, "$1");
            expanword=expanword.replace(re_am, "");
            origword=origword.replace(re_ex2, "").replace(re_am2, "$1");
            origword=origword.replace(re_am, "$1");
//            console.log("after "+origword)
          }
//          if (punctbefore!=""||punctafter!="") console.log("word "+word+" punctbefore "+punctbefore+" punctafter "+punctafter+" character is '"+content.charAt(i)+"'");
          if (myContent[i]!=" ") i--;
          if (expanpresent && xmlpresent) words.push({word:xmlword, expanword:expanword, origword:origword, xmlword:word, punctbefore:punctbefore, punctafter: punctafter});
          else if (expanpresent) {words.push({word:word, expanword:expanword, origword: origword, xmlword:"", punctbefore:punctbefore, punctafter: punctafter})}
          else if (xmlpresent) {words.push({word:xmlword, xmlword:word, expanword:"", origword:"", punctbefore:punctbefore, punctafter: punctafter})}
          else words.push({word:word, expanword:"", xmlword:"", origword:"", punctbefore:punctbefore, punctafter: punctafter});
          xmlpresent=expanpresent=false;
          punctbefore=punctafter="";
          word=expanword=xmlword=origword="";
          if (tags.length!=0) {
            for (var j = 0; j < tags.length; j++) {
              prefix+=tags[j].tag;
            }
          } else prefix="";  //set before we start out with next word
        }
      } else {
        word+=myContent[i];
        expanword+=myContent[i];
        xmlword+=myContent[i];
      }
    }
    //we could have punctuation and xml words..
  /*  if (word!="" && word!=" ") {
      if (word!=expanword) words.push({word:word, expanword:expanword});
      else words.push({word:word, expanword:""});
      word=expanword="";
    } */
  if (word!="") {
    if (expanpresent && xmlpresent) words.push({word:xmlword, expanword:expanword, origword:origword, xmlword:word, punctbefore: punctbefore, punctafter:punctafter});
    else if (expanpresent) {words.push({word:word, expanword:expanword, origword:origword, xmlword:"",punctbefore: punctbefore, punctafter:punctafter})}
    else if (xmlpresent) {
      words.push({word:xmlword, xmlword:word, expanword:"", origword:"", punctbefore: punctbefore, punctafter:punctafter})
    }
    else words.push({word:word, expanword:"", xmlword:"", origword:"", punctbefore: punctbefore, punctafter:punctafter});
  }
//  console.log("my words");
//  console.log(words);
  //fix here for problems in treatment of abbreviations
  for (var i=0; i<words.length; i++) {  //this could give errors in cases where origword has already been written
  	//errors in earlier treatment of abbrev and expan when we have complex xml ..fixed earlier. Not needed here
    if (words[i].xmlword!="" && words[i].xmlword.indexOf("<am")!=-1) {
   /*   var re_am2 = /<am[^>]*>(.*?)<\/am>/g;
      var re_ex = /<ex>(.*?)<\/ex>/g;
      var re_ex2= /<ex(.*?)<\/ex>/g;
      var re_am = /<am>(.*?)<\/am>/g;
      words[i].origword=words[i].xmlword.replace(re_ex2, "").replace(re_am, "$1");
      words[i].expanword=words[i].expanword.replace(re_am2, "").replace(re_ex, "$1"); */
    } else if (words[i].word=="" && words[i].xmlword!=""){
      //we can end up with fqke entry, like xml encoding around a space... this takes it out
      words.splice(i, 1);
      i--;
    }
  }
  return(words);
},
 getRdgTypes: function(content, witness) {
    //cruise through the apps manufacturing content strings for each distinct app type.. orig, c2, c2 etc
    //we use domParser methods for this. This has a lot of overhead and is likely much slower than a roll-my-own solution
    // but I needed something fast for florence!
    // can't use domParser. Async function.. yeeks
    //ok do it the hard way
    var offset=0;
    var appRdgs=[];
    while (content.indexOf("<app>", offset)>-1) {
      var endApp=content.indexOf("</app>", content.indexOf("<app>", offset+1));
      var startRdg=content.indexOf("<rdg", offset+1);
      while (startRdg>-1 && startRdg<endApp) {
        //got a rdg here
        var isAlready=false;
        offset=startRdg+1;
        var thisRdgType="";
        //get its type
        var startType=content.indexOf("type", offset);
        for (var j=startType+7; content.charAt(j)!='"' && content.charAt(j)!="'" &&j<endApp &&  content.charAt(j)!='\\'; j++) {
          thisRdgType+=content.charAt(j);
        }
//        console.log("got a reading type "+thisRdgType);
        for (var k = 0; k < appRdgs.length; k++) {
          if (appRdgs[k]==thisRdgType) isAlready=true;
        }
        if (!isAlready) { //lets get the reading text while we are at it
            if (thisRdgType!="lit") appRdgs.push(thisRdgType);
        }
        startRdg=content.indexOf("<rdg", offset+1);
      }
    }
//    console.log(appRdgs);
    return(appRdgs);
  },
  createRdgContent: function(content, myRdgTypes, witness) {
//    console.log("in create our app content for witness "+witness+" text: "+content)
//    console.log(myRdgTypes);
    var rdgsContent=[];
    for (var i = 0; i < myRdgTypes.length; i++) {
      //create a new content string for each kind of rdg
//      console.log("looking for "+myRdgTypes[i])
      var rdgContent="";
      var offsetStart=0;
      var offsetEnd=0;
      var appStart=content.indexOf("<app>", offsetStart);
      while (appStart!=-1) {
//        console.log("checking for "+myRdgTypes[i]);
//        console.log("rdg content before adding slice "+rdgContent+" at position "+offsetStart)
        rdgContent+=content.slice(offsetStart, appStart);
//        console.log("rdg content for "+myRd                                                                                                                                                                                                                                                                                                                                                                       gTypes[i]+":"+rdgContent)
        var gotReading=false;
        var thisRdg="";
        var startRdg=content.indexOf("<rdg", appStart+1);
        var origRdg="";
        var endApp=content.indexOf("</app>", appStart+1);
        offsetStart=endApp+6;
        while (startRdg!=-1 && startRdg<endApp) {
          //get the rdg t
//          console.log("looking for rdg at "+startRdg+" end app "+endApp);
          var thisRdgType="";
          var rdgContentStart=startRdg;
          var rdgContentEnd=startRdg;
          var startType=content.indexOf("type", startRdg+1);
          for (var j=startType+7; content.charAt(j)!='"' && content.charAt(j)!="'" &&j<endApp &&  content.charAt(j)!='\\'; j++) {
            thisRdgType+=content.charAt(j);
          }
//          console.log("we have a reading type "+thisRdgType);
          //ok.. if the reading is orig, then we need it for the case where the reading type is not instanced here
          if (thisRdgType=="orig") { //get what is between > and </rdg>. Special case! could be />
      //      console.log("looking for orig now ")
            rdgContentStart=content.indexOf(">",startRdg+1 );
      //      console.log("start of reading at "+rdgContentStart)
            if (content.charAt(rdgContentStart-1)=="/" || content.charAt(rdgContentStart-2)=="/") origRdg="";
            else {
              rdgContentEnd=content.indexOf("</rdg>",rdgContentStart);
      //        console.log("end of reading at "+rdgContentEnd);
              origRdg=content.slice(rdgContentStart+1,rdgContentEnd);
    //          console.log("reading is "+origRdg)
            }
            startRdg=content.indexOf("<rdg", rdgContentEnd);
          } else if (thisRdgType==myRdgTypes[i]) {
            gotReading=true;
    //        console.log("looking for "+thisRdgType+" now ")
            var rdgContentStart=content.indexOf(">",startRdg );
  //          console.log("start of reading at "+rdgContentStart)
            if (content.charAt(rdgContentStart-1)=="/" || content.charAt(rdgContentStart-2)=="/") thisRdg="";
            else {
              var rdgContentEnd=content.indexOf("</rdg>",rdgContentStart);
//              console.log("end of reading at "+rdgContentEnd);
              thisRdg=content.slice(rdgContentStart+1,rdgContentEnd);
//              console.log("reading is "+thisRdg);
            }
            startRdg=content.indexOf("<rdg", startRdg+1);
          } else { //reading type not wanted.. go on to next
            startRdg=content.indexOf("<rdg", startRdg+1);
          }
        }
        if (gotReading) {
          //add this reading to the content
          rdgContent+=thisRdg;
//          console.log("got rdg now "+myRdgTypes[i]+":"+thisRdg+" added to:"+rdgContent+" at app starting "+appStart)
        } else {
          rdgContent+=origRdg;
//          console.log("got rdg now "+myRdgTypes[i]+":"+origRdg+" added to:"+rdgContent+" at app starting "+appStart)
        }
          //get the next reading within this app
        appStart=content.indexOf("<app>", appStart+1);
//        console.log("appstart now "+appStart);
        if (appStart==-1) {
          //add rest of line to rdgContent
          rdgContent+=content.slice(endApp+6);
//          console.log("content after adding end of string:"+rdgContent);
          rdgsContent.push({type:myRdgTypes[i], content:rdgContent})
        }
      }
    }
    return(rdgsContent);
  },
  makeNEXUS: function(source) {
    var converted="#NEXUS<br/>BEGIN DATA;<br/>";
    source=source.replace(/&lt;/gi, "<").replace(/&nbsp;/gi," ");
    var myXMLDOM = new DOMParser().parseFromString(source, "text/xml");
    var apps=myXMLDOM.getElementsByTagName("app");
    var wits=myXMLDOM.getElementsByTagName("witness");
    var taxlabels="TAXLABELS<br/>";
    var matrix="MATRIX<br/>";
    var witsMap= new Map();
    var varnums=[0,1,2,3,4,5,6,7,8,9,"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
    for (var i=0; i<wits.length; i++) {
      taxlabels+="&nbsp;&nbsp;&nbsp;&nbsp;["+i+"] "+wits[i].childNodes[0].nodeValue+"<br/>";
      witsMap.set(wits[i].childNodes[0].nodeValue, i);
    }
    converted+="<br/>DIMENSIONS<br/>&nbsp;&nbsp;&nbsp;&nbsp;NTAX="+wits.length+"<br/>&nbsp;&nbsp;&nbsp;&nbsp;NCHAR="+apps.length+"<br/>;<br/>"
    converted+='FORMAT<br/>&nbsp;&nbsp;&nbsp;&nbsp;respectcase SYMBOLS="0~9 a~z A~Z"<br/>&nbsp;&nbsp;&nbsp;&nbsp;MISSING=?<br/>&nbsp;&nbsp;&nbsp;&nbsp;GAP=-<br/>&nbsp;&nbsp;&nbsp;&nbsp;TRANSPOSE<br/>;<br/><br/>'
    converted+="STATELABELS<br/>";
    //do all the variants..
    for (var i=0; i<apps.length; i++) {
      var label=apps[i].getAttribute("n");
      var vartype=apps[i].getAttribute("type");
      var from=apps[i].getAttribute("from");
      var to=apps[i].getAttribute("to");
      if (vartype=="main") label+="_"+from+"_"+to; else label+="_whole";
      label=label.replace(/ /gi, "_").replace(/:/gi, "_").replace(/=/gi, "_").replace(/-/gi, "_");;
      converted+="&nbsp;&nbsp;&nbsp;&nbsp;"+(i+1)+" "+label;
//build the matrix now too
//first deal with wits which have or do not have this verse
      if (vartype=="main") {
        var matrixrow = new Array(wits.length)
        matrixrow.fill("?");
      }
      else {
        var matrixrow = new Array(wits.length)
        matrixrow.fill("0");
      }
  //    console.log(matrixrow);
      var rdgs=apps[i].getElementsByTagName("rdg");
      if (vartype=="lac") { //there are no witnesses missing this entity
        converted+=" whole"
        if (!rdgs[0])
          matrix+="&nbsp;&nbsp;&nbsp;&nbsp;["+(i+1)+"] "+label+" "+matrixrow.join("")+"<br/>";
        else {
          converted+=" lacuna"
          var lacwits=rdgs[0].getElementsByTagName("idno");
          for (var j=0; j<lacwits.length; j++) {
            var thisWit=lacwits[j].childNodes[0].nodeValue;
            var indexWit=witsMap.get(thisWit);
            matrixrow[indexWit]=1;
          }
          matrix+="&nbsp;&nbsp;&nbsp;&nbsp;["+(i+1)+"] "+label+" "+matrixrow.join("")+"<br/>";
        }
      } else { //not dealing with whole block variants...
          //no variants -- ie only one reading --
          if (rdgs.length==1) {
            var rdgwits=rdgs[0].getElementsByTagName("idno");
            converted+=" "+standardChar(rdgs[0].childNodes[0].nodeValue.replace(/ /gi,"_"));
            for (j=0; j<rdgwits.length; j++) {
              var thisWit=rdgwits[j].childNodes[0].nodeValue;
              var indexWit=witsMap.get(thisWit);
              matrixrow[indexWit]=0;
            }
            matrix+="&nbsp;&nbsp;&nbsp;&nbsp;["+(i+1)+"] "+label+" "+matrixrow.join("")+"<br/>";
          } else {//deal with multiple readings here. We get the indexValue the variant from varSeq. convert to NEXUS value
            for (var j=0; j<rdgs.length; j++) {
              var rdgwits=rdgs[j].getElementsByTagName("idno");
              var rdgindex=varnums[rdgs[j].getAttribute("varSeq")-1];  //looks after subreadings too
              //flatten subreadings...
              converted+=" "+standardChar(rdgs[j].childNodes[0].nodeValue.replace(/ /gi,"_"));
              for (var k=0; k<rdgwits.length; k++) {
                var thisWit=rdgwits[k].childNodes[0].nodeValue;
                var indexWit=witsMap.get(thisWit);
                matrixrow[indexWit]=rdgindex;
              }
            }
            matrix+="&nbsp;&nbsp;&nbsp;&nbsp;["+(i+1)+"] "+label+" "+matrixrow.join("")+"<br/>";
          }
      }
      converted+="<br/>"
    }
    converted+=";<br/><br/>"
    converted+=taxlabels+";<br/><br/>";
    converted+=matrix+";<br/>";
    converted+="endblock;<br/><br/>BEGIN ASSUMPTIONS;<br/>&nbsp;&nbsp;&nbsp;&nbsp;ancstates archetype=0: all;<br/>;<br/>endblock;"
    return(converted);
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


module.exports = DualFunctionService;
