const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const { querySync } = require('../../services/query');
const { body } = require('express-validator')
const matterService = require('../matter/service');

//messages
const notEmpty = "The field must be filled"
const isInt = "The format must be integer and the minmax is 1 - 17280. is it in the correct format already?"
const length255 = "Must be less than 255 character long"

const addValidation = [
	body('duration').if(body('duration').exists()).isInt({ min: 1, max: 17280 }).bail().withMessage(isInt),
	body('title').notEmpty({ignore_whitespace:true}).bail().withMessage(notEmpty).isLength({max:255}).bail().withMessage(length255),
	body('text').if(body('text').exists()).customSanitizer(ignoreWhitespace),
	body('id_matt').notEmpty().bail().withMessage(notEmpty).isInt().bail().withMessage(isInt).custom(isMine)
]

module.exports = {
	addValidation
}


//custom sanitizer
function ignoreWhitespace(val){
	const regex = /[a-zA-Z]/
	return regex.test(val)? val: undefined
}

//custom validation
async function isMine(id_matt, { req }){
	
	try{
		
		await matterService.teacherAuthor(id_matt, req);
		
		return true;
		
	}catch(err){
		return Promise.reject("Id Matter isn't found")
	}
	
}