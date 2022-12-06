const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');
const { uploadDoct } = require('../config');

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 or greater than 5 characters long';
const lengthMsg255 = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 255 characters long';
const arrMsg = "Must be Array"

const addValid = [
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isIntMessage),
	body('schedule').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('text').if(body('text').exists()).customSanitizer(noWhitespace),
	body('code_class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]
const editValid = [
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isIntMessage),
	body('text').if(body('text').exists()).customSanitizer(noWhitespace),
	body('schedule').if(body('schedule').exists()).custom(isDate),
	body('code_class').if(body('code_class').exists()).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine)
]

const {
	getByClass,
	getSingle,
	create,
	edit,
	remove
} = require('./controller');

router.get('/exams/by-class/:code_class', getByClass);
router.get('/exams/:id_exm', getSingle);
router.post('/exams', multer(uploadDoct).single('attachment') ,addValid, create);
router.put('/exams/:id_exm', multer(uploadDoct).single('attachment'), editValid, edit);
router.delete('/exams/:id_exm', remove);

module.exports = router;

//custom validator
function isDate(value){ 
	const isValid = moment(value, "YYYY-MM-DD HH:mm:ss", true).isValid();
	if(!isValid){
		throw new Error(`the format of ${value} isn't date`);
	}
	return true;
}
function noWhitespace(v){
	
	let input = v.replace(/(^\s*)|(\s*$)/g, "")
	
	return input.length? input: undefined

}

async function isMine(codeClass, { req }){
	
	const sql={
		text: "SELECT * FROM classes WHERE code_class=$1 AND teacher=$2",
		values: [codeClass, req.user?.user_id]
	}
	try{
		
		const classData = await querySync(sql);
		if(!classData.rowCount) return Promise.reject("Code class isn't found");
		
	}catch(err){
		throw err
	}
}
function notEmptyAttachment(v, { req }){
	if(!req.file) throw new Error(noEmptyMsg);
	return true
}