const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const { body, check } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../services/query');
const { uploadDoct } = require('../../config');
const appError = require('../utils/appError');

//middlewares
const fileToBody = require('../../middlewares/locateFile')

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = "mustn't be more than 3 digits ";
const floatMsg = "mustn't be less than 100";

const addValid = [
	body('id_exm').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]
const rateValid = [
	body('score').notEmpty().bail().withMessage(noEmptyMsg).isFloat({max: 100}).withMessage(floatMsg)
]

const {
	getByExam,
	getSingle,
	addAnswer,
	rate,
	getAttachment
} = require('./controller');
const { singleExmAnswerAuthor } = require('./middleware');

router.get('/exam-answers/by-exam/:id_exm', getByExam);
router.get('/exam-answers/:id_exm_ans', singleExmAnswerAuthor, getSingle);
router.get('/exam-answers/:id_exm_ans/:filename', singleExmAnswerAuthor, getAttachment);
router.put('/exam-answers', multer(uploadDoct).single('content') ,fileToBody('content'), addValid, addAnswer);
router.put('/exam-answers/:id_exm_ans/rate', multer2().none(), rateValid, rate);

module.exports = router;

async function isMine(id_exm, { req }){
		
	sql = {
		text: "SELECT code_class, schedule, duration FROM exams WHERE id_exm=$1",
		values: [id_exm]
	}
	
	const getClass = await querySync(sql);
	
	let { code_class, duration, schedule } = getClass.rows[0];
	duration = parseInt(duration);
	
	sql = {
		text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
		values: [code_class, req.user?.user_id]
	}
	
	const getStudent = await querySync(sql);
	
	if(getStudent.rowCount){
		
		if(duration){
			
			//convert the raw duration value to current time
			const deadline = (new Date(schedule)).getTime() + duration;
			// console.log(deadline)
			if(Date.now() > deadline){
				//this code is to send a error to the ctrler and thrown there. if thrown here, will be error field, i won't wan that way to happen
				req.errorFromField = {
					message: 'You an answer the exam since the time enters the deadline',
					status: 200
				}
			}
		}
		
		return true
	}
	
	return Promise.reject("Id exam isn't found");
	
}