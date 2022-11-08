const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 5 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('date').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('text').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:1,max:255}).withMessage(lengthMsg),
	body('matt').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).custom(isMine)
]


const {
	getMattDiscuss,
	addMattDiscuss
} = require('./controller');

router.get('/matter-discussions/:id_matt', getMattDiscuss);
router.post('/matter-discussions', multer().none(), addValid, addMattDiscuss);

module.exports = router;

//custom validation
function isDate(input){
	
	const isValid = moment(input, "YYY-MM-DD HH:mm:ss", true).isValid();
	
	if(!isValid){
		throw new Error(`The format of ${input} isn't date`);
	}
	
	return true;
	
}
async function isMine(id_matt, {req}){
	
	let sql_get_teacher = {
		text: 'SELECT * FROM matters INNER JOIN classes ON class = code_class WHERE id_matter = $1 AND teacher = $2',
		values: [id_matt, req.user?.user_id]
	}
	
	try{
		const getTeacher = await querySync(sql_get_teacher);
		
		if(!getTeacher.rowCount){
			
			let sql_get_class = {
				text: 'SELECT class FROM matters WHERE id_matter = $1',
				values: [id_matt]
			}
			const getClass = await querySync(sql_get_class);
			
			let sql_get_student = {
				text: 'SELECT * FROM students WHERE class = $1 AND "user" = $2',
				values: [getClass.rows[0]?.class, req.user?.user_id]
			}
			const getStudent = await querySync(sql_get_student);
			
			if(!getStudent.rowCount) return Promise.reject("Id matter isn't found");
		}
		
	}catch(err){
		throw err;
	}
	
}