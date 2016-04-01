module.exports = {
  database: {
    uri: 'mongodb://localhost/tc',
  },
  auth: {
    'facebookAuth' : {
        'clientID'      : '***REMOVED***', // your App ID
        'clientSecret'  : '***REMOVED***', // your App Secret
        'callbackURL'   : 'http://206.12.59.55:3000/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : '***REMOVED***',
        'consumerSecret'    : '***REMOVED***',
        'callbackURL'       : 'http://206.12.59.55:3000/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '***REMOVED***',
        'clientSecret'  : '***REMOVED***',
        'callbackURL'   : 'http://206.12.59.55:3000/auth/google/callback'
    }
  },
  port: 80,
  BACKEND_URL: 'http://206.12.59.55/:3000/api/',  
};
