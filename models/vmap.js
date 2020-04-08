var mongoose = require('mongoose')
  , ObjectId = mongoose.Types.ObjectId
  , Schema = mongoose.Schema
  , extendNodeSchema = require('./extend-node-schema')
;

//id: as assigned by CE; model: regularization/collation; status: for collation: regularized, set, approved, xml. ce: holds body written by CE
const vmapSchema = new Schema({
    id: String,
    name: String,
    community: String,
    pheight: Number,
    pwidth: Number,
    pdflabelled: {name:String, src: String},
    pdfunlabelled: {name:String, src: String},
   wits: [{
    	name: String,
    	y: Number,
    	x: Number
    }],
});

module.exports = mongoose.model('VMap', vmapSchema);
