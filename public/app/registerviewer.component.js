var CommunityService = require('./services/community')
  , UIService = require('./services/ui')
  , RESTService = require('./services/rest')
  , config = require('./config')
;

var RegisterViewerComponent = ng.core.Component({
  selector: 'tc-managemodal-registerviewer',
  templateUrl: '/app/registerviewer.html',
  inputs : ['community'],
  directives: [
    require('./directives/modaldraggable')
  ],
}).Class({
  constructor: [CommunityService, function(communityService) {
//    var Doc = TCService.Doc, doc = new Doc()
    this._communityService = communityService;
    this.message=this.success=this.header;""
    this.email="";
    this.name="";
    this.interest="";
    this.password="";
    this.reload=false;
    this.confirmpassword="";
    }],
  closeModalRV: function() {
    this.message=this.success="";
    $('#MMADdiv').css("margin-top", "30px");
    $('#MMADbutton').css("margin-top", "20px");
    $('#manageModal').modal('hide');
    if (this.reload) document.location.reload();
  },
  ngOnInit: function() {
    var self=this;
    this.header="Register as a viewer in community "+this.community.attrs.name;
    $.get(config.BACKEND_URL+'getCommunityLeader/?community='+this.community._id, function(res) {
      self.leaderEmail=res[0];
    })
  },
  ngOnChanges: function() {
//    this.communi
    this.message="";
    this.success="";
    this.reload=false;
    $('#manageModal').width("500px");
    $('#manageModal').height("480px");
  },
  submit: function(){
      var self=this;
      var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (this.name=="") {
        this.message="A name is required";
        return;
      }
      if (this.email=="") {
        this.message="An email address is required";
        return;
      }
    if (!re.test(String(this.email).toLowerCase())) {
        this.message=this.email+" is not a valid email address";
        return;
      }
        if (this.name=="") {
        this.message="A name is required";
        return;
      }
      if (this.password=="") {
        this.message="A password is required";
        return;
      }
      if (this.password.length<8) {
        this.message="The password must have at least 8 characters";
        return;
      }
      if (this.password!=this.confirmpassword) {
        this.message="Password and confirm password do not match";
        return;
      }
      this.message="";
      //ok.. let's register this person
      var letter="Dear "+this.name+"<br/><br/> You have now been registered as a viewer of Textual Community \""+self.community.attrs.name+"\'."
      letter+="You can log in by clicking on <img height='20' src='https://textualcommunities.org/images/login.png'> at the top of the screen. "
      letter+="You can log in as: <ul style='list-style:none'><li>User name: "+self.email+"</li><li>Password: "+self.password+"</li></ul>";
      letter+="<br/>Once you are logged in, you can go to 'Login Profile' to log in by social media.<br/><br/>Happy viewing!"
      $.ajax({
        url: config.BACKEND_URL+'registerViewer?'+'community='+self.community.attrs._id,
        type: 'POST',
        data:  JSON.stringify({name:self.name, password:self.password, email:self.email, interest: self.interest, communityName: self.community.attrs.name, leaderEmail: self.leaderEmail, letter:letter}),
        accepts: 'application/json',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
      })
       .done(function( data ) {
         self.reload=data.login
         self.success=data.result;
        })
       .fail(function( jqXHR, textStatus, errorThrown) {
        alert( "error" + errorThrown );
      });

  }
});



module.exports = RegisterViewerComponent;
