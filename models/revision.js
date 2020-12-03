var mongoose = require('mongoose')
  , _ = require('lodash')
  , Schema = mongoose.Schema
  , extendNodeSchema = require('./extend-node-schema')

  var RevisionSchema = new Schema({
    doc: {type: Schema.Types.ObjectId, ref: 'Doc', index: true},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    created: {type: Date, default: Date.now},
    committed: {type: Date},
    community: String,
    status: String, // submitted committed previsous_db
    text: String,
<<<<<<< HEAD
    parent: String,
    name: String,
=======
>>>>>>> c840b2bf3d69979410cfc4d1c229efba35d386d2
    spentTime: Number,
  });
  _.assign(RevisionSchema.statics, {
    status: {
      IN_PROGRESS: 'IN_PROGRESS',
      SUBMITTED: 'SUBMITTED',
      COMMITTED: 'COMMITTED', // not necessary, could check committed time
    },
  })

  var Revision = mongoose.model('Revision', RevisionSchema);

  module.exports = Revision;
