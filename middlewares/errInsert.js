const { validationResult } = require('express-validator');
const appError = require('../app/utils/appError')

module.exports = function(req, res, next){
	
	const errInsert = validationResult(req);
			
	if(!errInsert.isEmpty()){
		
		const err = appError('insert', 200);
		err.field = errInsert.mapped()
		
		throw err;
	}
	
	next()
	
}