const _ = require('lodash')
  , env = process.env.NODE_ENV
;

module.exports = _.assign({
  env: env,
  logFormat: 'combined',
  auth: {
    'facebookAuth' : {
<<<<<<< HEAD
        'clientID'      : '483987101763451', // your App ID
        'clientSecret'  : '743b4bc850e627d2c0d1faad7df04ac0', // your App Secret
=======
        'clientID'      : '', // your App ID
        'clientSecret'  : '', // your App Secret
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
        'callbackURL'   : 'http://localhost:3000/auth/facebook/callback'
    },

    'twitterAuth' : {
<<<<<<< HEAD
        'consumerKey'       : 'hfOZiDBGCOwhvu28AWl7jqvuT',
        'consumerSecret'    : 'uT7TI5jMzLi8l2ZCrYQkRP78wPABRqE4DKPb94e67EbReSnoVT',
=======
        'consumerKey'       : '',
        'consumerSecret'    : '',
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
        'callbackURL'       : 'http://localhost:3000/auth/twitter/callback'
    },

    'googleAuth' : {
<<<<<<< HEAD
        'clientID'      : '266995390551-b7a8bbccaelvbd0k5vsadki8kum4cps8.apps.googleusercontent.com',
        'clientSecret'  : 'DrG_pWbhlMF6vaTNaQf3gary',
=======
        'clientID'      : '',
        'clientSecret'  : '',
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
        'callbackURL'   : 'http://localhost:3000/auth/google/callback'
    }
  }
}, require('./' + env));
