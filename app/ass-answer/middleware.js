const { body } = require('express-validator');
const matt_ass = require('../../services/table')('matt_ass');

const mattAssService = require('../matt-ass/service');

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';

const addValid = [
	body('id_matt_ass').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]

module.exports = {
	addValid
}

async function isMine(id_matt_ass, { req }){
	
	return await mattAssService.studentAuthor(id_matt_ass, req, (studentData, err)=>{
		
		if(err) return Promise.reject("Id assignment isn't found");
			
	});
	
}