const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../services/query');
const matters = require('../../services/table')('matters');
const class_students = require('../../services/table')('class_students');

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
	
	let sql_get_teacher = {
		text: 'SELECT * FROM matters INNER JOIN classes ON class = code_class WHERE id_matter = $1 AND teacher = $2',
		values: [id_matt, req.user?.user_id]
	}
	
	const getTeacher = await querySync(sql_get_teacher);
	
	if(!getTeacher.rowCount){
		
		const getClass = await matters
		.find({ id_matter: id_matt })
		.select('class')
		.execute()
		
		const getStudent = await class_students
		.find({ 
			class: getClass.rows[0]?.class,
			user: req.user?.user_id
		})
		.execute()
		
		if(!getStudent.rowCount) return Promise.reject("Id matter isn't found");
	}
	
}