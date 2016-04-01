var _ = require('lodash');

module.exports = _.assign({
  auth: {
    'facebookAuth' : {
        'clientID'      : '***REMOVED***', // your App ID
        'clientSecret'  : '***REMOVED***', // your App Secret
        'callbackURL'   : 'http://localhost:3000/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : '***REMOVED***',
        'consumerSecret'    : '***REMOVED***',
        'callbackURL'       : 'http://localhost:3000/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '***REMOVED***',
        'clientSecret'  : '***REMOVED***',
        'callbackURL'   : 'http://localhost:3000/auth/google/callback'
    }
  }
}, require('./' + process.env.NODE_ENV));
