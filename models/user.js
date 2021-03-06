var mongoose = require('mongoose')
  , bcrypt = require('bcrypt')
  , Schema = mongoose.Schema
  , ObjectId = Schema.Types.ObjectId
;

// define the schema for our user model.
// Add hash and datestamp for password resets
var userSchema = Schema({
  local            : {
    email        : String,
    password     : String,
    name	 : String,
    hash         : String,
    timestamp	 : String,
    authenticated : String,
    created: {type: Date}
  },
  facebook         : {
    id           : String,
    token        : String,
    email        : String,
    name         : String
  },
  twitter          : {
    id           : String,
    token        : String,
    displayName  : String,
    username     : String
  },
  google           : {
    id           : String,
    token        : String,
    email        : String,
    name         : String
  },
  memberships: [{
    community: {type: ObjectId, ref: 'Community'},
    role: String,
    _id: ObjectId,
    approvername: String,
    approverid: String,
    approvermail: String,
    created: {type: Date, default: Date.now},
    interest: String,
    accesses: [{type: Date, default: Date.now}],
    pages:{}
  }],
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

userSchema.statics.CREATOR = 'CREATOR';
userSchema.statics.LEADER = 'LEADER';
userSchema.statics.TRANSCRIBER = 'TRANSCRIBER';
userSchema.statics.MEMBER = 'MEMBER';

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
