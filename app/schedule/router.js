const router = require('express').Router();
const multer = require('multer');
const { check } = require('express-validator');
const moment = require('moment');

//controllers
const { createSchedule, readSchedules } = require('./controller');

const noEmptyMessage = "This field must be filled";
const isIntMessage = "Input must be a integer";
const lengthMsg5 = "Must be less than 5 character long";


const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const createValid = [
	check('schedules.*.day').notEmpty().bail().withMessage(noEmptyMessage).isIn(days).withMessage("Input isn't a day"),
	check('schedules.*.time').notEmpty().bail().withMessage(noEmptyMessage).custom(isDate),
	check('code_class').notEmpty().bail().withMessage(noEmptyMessage).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).withMessage(lengthMsg5)
]

router.post('/schedules', multer().none(), createValid, createSchedule);
router.get('/schedules/:code_class', multer().none(), createValid, readSchedules);

module.exports = router;

function isDate(value){
	
	const isValid = moment.parseZone(value, "HH:mm:ssZ", true).isValid();
	
	if(!isValid) throw new Error(`The format of ${value} isn't time`);
	
	return true
}