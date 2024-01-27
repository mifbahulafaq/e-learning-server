const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');
const { uploadDoct } = require('../../config');

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 or greater than 5 characters long';
const lengthMsg255 = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 255 characters long';
const arrMsg = "Must be Array"

const addValid = [
	body('code_class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine),
	body('status').notEmpty().bail().withMessage(noEmptyMsg).isIn(["active","inactive"]),
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isIntMessage),
	body('description').if(body('description').exists()).isLength({max:255}).withMessage(lengthMsg),
	body('schedule').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('name').notEmpty().bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
]
const [codeClassVal, statusVal, ...editValid] = addValid;

const {
	getByClass,
	getSingle,
	create,
	edit,
	remove,
	getAttachment
} = require('./controller');

router.get('/matters/by-class/:code_class', getByClass);
router.get('/matters/:id_matt', getSingle);
router.get('/matters/:id_matt/:filename', getAttachment);
router.post('/matters', multer(uploadDoct).array('attachment') ,addValid, create);
router.put('/matters/:id_matt', multer(uploadDoct).array('new_attachment'), editValid, edit);
router.delete('/matters/:id_matt', remove);

module.exports = router;

//custom validator
function isDate(value){ 
	const isValid = moment(value, "YYYY-MM-DD HH:mm:ss", true).isValid();
	if(!isValid){
		throw new Error(`the format of ${value} isn't date`);
	}
	return true;
}
function noWhitespace(v){return v.replace(/(^\s*)|(\s*$)/g, "")}

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
	if(!req.files.length) throw new Error(noEmptyMsg);
	return true
}