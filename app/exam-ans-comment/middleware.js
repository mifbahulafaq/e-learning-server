const { body } = require('express-validator');
const { querySync } = require('../../services/query');
const ansService = require('../exam-answer/service');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('text').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:1,max:255}).withMessage(lengthMsg),
	body('id_exm_ans').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).custom(isMine)
]

module.exports = {
	addValid
}

//custom validation
async function isMine(id_exm_ans, {req}){
	
	return await ansService.teacherAuthor(id_exm_ans, req, async (teacherData, err)=>{
		
		try{
			
			if(err) await ansService.studentAuthor(id_exm_ans, req);
			
			// return true;
			
		}catch(err){
			
			return Promise.reject("id_exm_ans isn't found");
			
		}
		
	})
	
}