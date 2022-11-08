const policyFor = require('../app/policy');
const { subject } = require('@casl/ability');

module.exports = function(req, res, next){
	
	const policy = policyFor(req.user)
	const subjectFile = subject('File', {user_id: parseInt(req.params?.user_id)})
	
	if(!policy.can('read', subjectFile)){
		return res.json({
			error: 1,
			message: "you cannot get this file"
		})
	}
	
	next();
	
}