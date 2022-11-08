const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const moment = require('moment');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 5 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('date').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('text').customSanitizer(noWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:1,max:255}).withMessage(lengthMsg),
	body('code_class').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:5}).withMessage(lengthMsg5)
]


const {
	getClassDiscuss,
	addClassDiscuss
} = require('./controller');

router.get('/class-discussions/:code_class', getClassDiscuss);
router.post('/class-discussions', multer().none(), addValid, addClassDiscuss);

module.exports = router;

//custom validation
function isDate(input){
	
	const isValid = moment.parseZone(input, "YYY-MM-DD HH:mm:ssZ", true).isValid();
	
	if(!isValid){
		throw new Error(`The format of ${input} isn't date`);
	}
	
	return true;
	
}

//custom sanitizer
function noWhitespace(v){return v.replace(/(^\s*)|(\s*$)/g, "")}