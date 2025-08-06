const { body } = require('express-validator');

//utils
const isDate = require('../utils/isDate2')("YYYY-MM-DD HH:mm:ss");
//class services
const classService = require('../class/service');

const isIntMessage = "Input must be a integer";
const isNullMessage = "Input must be null"
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 or greater than 5 characters long';
const lengthMsg255 = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 255 characters long';
const arrMsg = "Must be Array"

//custom validator
function isNull(val){
	
	if(val !== null){
		
		throw new Error('Data must be null')
	}
	 
	return true;
}

async function isMine(codeClass, { req }){
	
	return await classService.teacherAuthor(codeClass, req, (teacherData, err)=>{
		
		if(err) return Promise.reject("Code class isn't found");
		
		return true;
	})
}

//custoom sanitizer
 function nullSanitizer(value){
	 return  value === 'null'? JSON.parse(value): value;
}

const addValid = [
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isIntMessage),
	body('schedule').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('code_class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]
const editValid = [
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isIntMessage),
	// body('attachment').if(body('attachment').exists()).if(body('attachment').not().isObject()).custom(isNull)
	// .withMessage(isObjectOrNnull),
	body('attachment').if(body('attachment').exists()).customSanitizer(nullSanitizer).custom(isNull).withMessage(isNullMessage),
	body('schedule').if(body('schedule').exists()).custom(isDate),
	// body('code_class').if(body('code_class').exists()).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]

module.exports = {
	addValid,
	editValid
}