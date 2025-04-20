const { check } = require('express-validator');
const moment = require('moment');
const classes = require('../../services/table')('classes');

const noEmptyMessage = "This field must be filled";
const isIntMessage = "Input must be a integer";
const lengthMsg5 = "Must be less than 5 character long";


const days = ['0', '1', '2', '3', '4', '5', '6'];

const createValid = [
	check('schedules.*.day').notEmpty().bail().withMessage(noEmptyMessage).isIn(days).withMessage("Input isn't a day"),
	check('schedules.*.time').notEmpty().bail().withMessage(noEmptyMessage).custom(isDate),
	check('code_class').notEmpty().bail().withMessage(noEmptyMessage).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]

module.exports = {
	createValid
}

//custom validation
async function isMine(code_class, { req }){
	
	try{
		const classData = await classes
		.find({ code_class, teacher: req.user?.user_id })
		.select('teacher')
		.execute()
		
		if(!classData.rowCount) return Promise.reject("Code class isn't found")
		
	}catch(err){
		throw err
	}
	
}
function isDate(value){
	
	const isValid = moment.parseZone(value, "HH:mm:ssZ", true).isValid();
	
	if(!isValid) throw new Error(`The format of ${value} isn't time`);
	
	return true
}