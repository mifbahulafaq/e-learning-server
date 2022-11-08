const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const moment = require('moment');

const isArrayMsg = "Input isn't a Array";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be greater than 255 or less than 5 characters long';

const addValid = [
	body('class_name').customSanitizer(noWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('description').if(body('description').exists()).customSanitizer(noWhitespace).isLength({min:3, max:255}).withMessage(lengthMsg),
	/*body('schedule')
	.if(body('schedule').exists())
	.isArray().bail().withMessage(isArrayMsg)
	.custom(isDate)
	.customSanitizer(dateSanitizer)*/
]
const updateValid = [
	addValid[0],
	body('description').customSanitizer(noWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	/*body('schedule')
	.notEmpty().bail().withMessage(noEmptyMsg)
	.isArray().bail().withMessage(isArrayMsg)
	.custom(isDate)
	.customSanitizer(dateSanitizer)*/
]


const {
	getclasses,
	getSingle,
	deleteClass,
	addClass,
	editClass
} = require('./controller');

router.get('/classes', getclasses);
router.get('/classes/:code_class', getSingle);
router.delete('/classes/:code_class', deleteClass);
router.post('/classes', multer().none(), addValid, addClass);
router.put('/classes/:code_class', multer().none(), updateValid, editClass);

module.exports = router;

//custom validator
function isDate(value){ 
	value.forEach(e=>{
		const isValid = moment.parseZone(e, "YYYY-MM-DD HH:mm:ssZ", true).isValid();
		if(!isValid){
			throw new Error(`the format of ${e} isn't date`);
		}
	})
	return true;
}
//custom sanitizer
 function dateSanitizer(value){
	 return value.map(e=>moment.parseZone(e).format("YYYY-MM-DD HH:mm:ssZ"));
}
function noWhitespace(v){return v.replace(/(^\s*)|(\s*$)/g, "")}