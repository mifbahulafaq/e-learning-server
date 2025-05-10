const { body } = require('express-validator');
const moment = require('moment');

const { querySync } = require('../../services/query');
const matters = require('../../services/table')('matters');
const class_students = require('../../services/table')('class_students');
const matterService = require('../matter/service');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 5 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('date').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('text').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg),
	body('matt').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).custom(isMine)
]
module.exports = {
	addValid
}

//custom validation
function isDate(input){
	
	const isValid = moment(input, "YYY-MM-DD HH:mm:ss", true).isValid();
	
	if(!isValid){
		throw new Error(`The format of ${input} isn't date`);
	}
	
	return true;
	
}
async function isMine(id_matt, {req}){
	
	//teacher authorizing..
	
	return await matterService.teacherAuthor(id_matt, req, async (teacherData, err)=>{
		try{
			
			if(err) await matterService.studentAuthor(id_matt, req);
			
			return true
			
		}catch(err){
			
			return Promise.reject("Id matter isn't found");
			
		}
		
	})
	
}