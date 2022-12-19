const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const { body, check } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');
const { uploadDoct } = require('../config');

//middlewares
const fileToBody = require('../../middlewares/locateFile')

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = "mustn't be more than 3 digits ";

const addValid = [
	body('id_exm').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]
const rateValid = [
	body('score').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).isLength({max: 3}).withMessage(lengthMsg)
]

const {
	getByExam,
	getSingle,
	addAnswer,
	rate
} = require('./controller');

router.get('/exam-answers/by-exam/:id_exm', getByExam);
router.get('/exam-answers/:id_exm_ans', getSingle);
router.put('/exam-answers', multer(uploadDoct).single('content') ,fileToBody('content'), addValid, addAnswer);
router.put('/exam-answers/:id_exm_ans/rate', multer2().none(), rateValid, rate);

module.exports = router;

async function isMine(id_exm, { req }){
	
	let sql ={
		text: "SELECT teacher FROM exams e INNER JOIN classes c ON e.code_class=c.code_class WHERE e.id_exm=$1 AND c.teacher=$2",
		values: [id_exm, req.user?.user_id]
	}
	
	try{
		
		let getTeacher = await querySync(sql);
		if(!getTeacher.rowCount){
			
			sql = {
				text: "SELECT code_class FROM exams WHERE id_exm=$1",
				values: [id_exm]
			}
			
			getClass = await querySync(sql);
			
			sql = {
				text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
				values: [getClass.rows[0]?.code_class, req.user?.user_id]
			}
			
			getStudent = await querySync(sql);
			
			if(getStudent.rowCount) return true
		}
		
		return Promise.reject("Id exam isn't found");
		
	}catch(err){
		throw err
	}
}