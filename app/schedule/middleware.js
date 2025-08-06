const { check, body } = require('express-validator');
const moment = require('moment');
const classes = require('../../services/table')('classes');
const classService = require('../class/service');

const isDate2 = require('../utils/isDate2')("HH:mm:ssZ");

const noEmptyMessage = "This field must be filled";
const isIntMessage = "Input must be a integer";
const lengthMsg5 = "Must be less than 5 character long";
const arrMsg = "Must be Array";


const days = ['0', '1', '2', '3', '4', '5', '6'];

const createValid = [
	body('schedules').notEmpty().bail().withMessage(noEmptyMessage).isArray().withMessage(arrMsg),
	body('schedules.*.day').notEmpty().bail().withMessage(noEmptyMessage).isIn(days).withMessage("Input isn't a day"),
	body('schedules.*.time').notEmpty().bail().withMessage(noEmptyMessage).custom(isDate2),
	body('code_class').notEmpty().bail().withMessage(noEmptyMessage).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]

module.exports = {
	createValid
}

//custom validation
async function isMine(code_class, { req }){
	
	return await classService.teacherAuthor(code_class, req, (teacherData, err)=>{
		
		if(err) return Promise.reject("Code class isn't found");
		
		return true;
		
	})
}