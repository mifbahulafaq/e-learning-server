const router = require('express').Router();
const { querySync } = require('../../database')
const multer = require('multer');
const { check } = require('express-validator');
const moment = require('moment');

//controllers
const { createSchedule, readSchedules } = require('./controller');

const noEmptyMessage = "This field must be filled";
const isIntMessage = "Input must be a integer";
const lengthMsg5 = "Must be less than 5 character long";


const days = ['0', '1', '2', '3', '4', '5', '6'];

const createValid = [
	check('schedules.*.day').notEmpty().bail().withMessage(noEmptyMessage).isIn(days).withMessage("Input isn't a day"),
	check('schedules.*.time').notEmpty().bail().withMessage(noEmptyMessage).custom(isDate),
	check('code_class').notEmpty().bail().withMessage(noEmptyMessage).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]

router.post('/schedules', multer().none(), createValid, createSchedule);
router.get('/schedules/by-class/:code_class',  readSchedules);

module.exports = router;

//custom validation
async function isMine(code_class, { req }){
	
	try{

		let sql = {
			text: "SELECT teacher FROM classes WHERE code_class=$1 AND teacher = $2",
			values: [code_class, req.user?.user_id]
		}
		let classData = await querySync(sql);
		
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