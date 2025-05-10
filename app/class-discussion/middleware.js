const { body } = require('express-validator');
const moment = require('moment');
const noEdgeWhitespace = require('../utils/noEdgeWhitespace');

const classService = require('../class/service')

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 5 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	// body('date').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('text').customSanitizer(noEdgeWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:1,max:255}).withMessage(lengthMsg),
	body('class').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:5}).bail().withMessage(lengthMsg5).custom(isMine)
]

module.exports = {
	addValid,
}


//custom validation
// function isDate(input){
	
	// const isValid = moment.parseZone(input, "YYY-MM-DD HH:mm:ss Z", true).isValid();
	
	// if(!isValid){
		// throw new Error(`The format of ${input} isn't date`);
	// }
	
	// return true;
	
// }
async function isMine(code_class, {req}){
	
	return await classService.teacherAuthor(code_class, req, async (teacherData, err)=>{
		try{
			
			if(err) await classService.studentAuthor(code_class, req);
			
			return true
			
		}catch(err){
			
			return Promise.reject("Code_class isn't found");
		}
	})
	
}