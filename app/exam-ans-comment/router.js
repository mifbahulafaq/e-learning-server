const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const { querySync } = require('../../database');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('text').notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:1,max:255}).withMessage(lengthMsg),
	body('id_exm_ans').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).custom(isMine)
]

const {
	getByAns,
	add
} = require('./controller');

router.get('/exm-ans-comments/by-exm-ans/:id_exm_ans', getByAns);
router.post('/exm-ans-comments', multer().none(), addValid, add);

module.exports = router;

//custom validation
async function isMine(id_exm_ans, {req}){
	
	let sql_get_teacher = {
		text: `SELECT * FROM exam_answers ea
			   INNER JOIN exams e ON ea.id_exm = e.id_exm
			   INNER JOIN classes c ON e.code_class = c.code_class 
			   WHERE id_exm_ans = $1 AND c.teacher = $2`,
		values: [id_exm_ans, req.user?.user_id]
	}
	
	try{
		const getTeacher = await querySync(sql_get_teacher);
		
		if(!getTeacher.rowCount){
			let sql_get_student = {
				text: 'SELECT * FROM exam_answers WHERE id_exm_ans = $1 AND user_id=$2',
				values: [id_exm_ans, req.user?.user_id]
			}
			
			const getStudent = await querySync(sql_get_student);
			
			if(!getStudent.rowCount) return Promise.reject("id_exm_ans isn't found");
		}
		
	}catch(err){
		console.log(err)
		throw err;
	}
	
}