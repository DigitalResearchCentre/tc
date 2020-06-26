var mongoose = require('mongoose')
  , ObjectId = mongoose.Types.ObjectId
  , Schema = mongoose.Schema
  , extendNodeSchema = require('./extend-node-schema')
;

//id: as assigned by CE; model: regularization/collation; status: for collation: regularized, set, approved, xml. ce: holds body written by CE
const collationSchema = new Schema({
    id: String,
    scope: String,
    entity: String,
    community: String,
    from: String,
    to: String,
    ce: String,
    model: String,
    adjusted: Boolean,
    status: String
});

module.exports = mongoose.model('Collation', collationSchema);
