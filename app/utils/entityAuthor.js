const appError = require('./appError')
const policyFor = require('../policy');

module.exports = function(user, command, entity, errMassage){
	
	const policy = policyFor(user)
	const success_statuscode = 200;
				
	if(!policy.can(command, entity)) throw appError(errMassage, success_statuscode);
	
}