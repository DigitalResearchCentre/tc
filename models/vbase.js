var mongoose = require('mongoose')
  , ObjectId = mongoose.Types.ObjectId
  , Schema = mongoose.Schema
  , extendNodeSchema = require('./extend-node-schema')
;


//we are going to search on the 
//note: we use the index of the variant in the matrix to find the variant. variants[0]=lemma, always
//1-9 are variants[1] etc, a is variants[10]
const vBaseSchema = new Schema({
    community: String,
    name: String,
    witlist: [{type: String}],
    varsites: [{
    	vartype: String,
		entity: String, 
		from: String,
		to: String,
		matrix: String,
		variants: [{
			 type: String,
		}],
	}],
    conditionsets: [{
		name: String,
		conditionset: [{
			in: Boolean,
			spec: String,
			wits: String
		}]
	}]
 });

module.exports = mongoose.model('VBase', vBaseSchema);
