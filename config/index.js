var _ = require('lodash');

console.log(process.env.TC_ENV);
module.exports = _.assign({
  auth: {
    'facebookAuth' : {
        'clientID'      : '***REMOVED***', // your App ID
        'clientSecret'  : '***REMOVED***', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : '***REMOVED***',
        'consumerSecret'    : '***REMOVED***',
        'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '266995390551-7r1vhnrc97df8d86tlukh1tb479naict.apps.googleusercontent.com',
        'clientSecret'  : 'UzUB13NL_6P-JEXZiS3vhqFG',
        'callbackURL'   : 'http://localhost:8080/auth/google/callback'
    }
  }

}, require('./' + process.env.TC_ENV));
