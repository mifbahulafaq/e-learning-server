// validate formData from body

const { validationResult } = require('express-validator');
const appError = require('./appError');

module.exports = function(req, msg){
	
	const errInsert = validationResult(req);
	
	//input validation
	if(!errInsert.isEmpty()){
		
		const err = appError(msg, 200);
		err.field = errInsert.mapped();

		throw err;
	}
}