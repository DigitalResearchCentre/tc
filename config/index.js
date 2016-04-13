const _ = require('lodash')
  , env = process.env.NODE_ENV
;

module.exports = _.assign({
  env: env,
  logFormat: 'combined',
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
}, require('./' + env));
