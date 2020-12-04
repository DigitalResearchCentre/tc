const _ = require('lodash')
  , env = process.env.NODE_ENV
;

module.exports = _.assign({
  env: env,
  logFormat: 'combined',
  auth: {
    'facebookAuth' : {
        'clientID'      : '', // your App ID
        'clientSecret'  : '', // your App Secret
        'callbackURL'   : 'http://localhost:3000/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : '',
        'consumerSecret'    : '',
        'callbackURL'       : 'http://localhost:3000/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '',
        'clientSecret'  : '',
        'callbackURL'   : 'http://localhost:3000/auth/google/callback'
    }
  }
}, require('./' + env));
