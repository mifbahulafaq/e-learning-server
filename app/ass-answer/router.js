const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const path = require('path');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../services/query');
const { uploadDoct } = require('../../config');

//middlewares
const fileToBody = require('../../middlewares/locateFile')

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';

const addValid = [
	body('id_matt_ass').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]

const {
	getByAss,
	getSingle,
	addAnswer,
	getAttachment
} = require('./controller');

const { singleAssAnswerAuthor } = require('./middleware');

router.get('/assignment-answers/by-matt-ass/:id_matt_ass', getByAss);
router.get('/assignment-answers/:id_ass_ans', singleAssAnswerAuthor, getSingle);
router.get('/assignment-answers/:id_ass_ans/:filename', singleAssAnswerAuthor, getAttachment);
router.put('/assignment-answers', multer(uploadDoct).single('content') ,fileToBody('content'), addValid, addAnswer);

module.exports = router;

async function isMine(id_matt_ass, { req }){
	
	let sql ={
		text: "SELECT m.class, ma.date, ma.duration FROM matt_ass ma INNER JOIN matters m ON ma.id_matt=m.id_matter WHERE ma.id_matt_ass=$1",
		values: [id_matt_ass]
	}
	let getClass = await querySync(sql);
	
	if(getClass.rowCount){
		
		let { class: codeCLass, date, duration } = getClass.rows[0]
		duration = parseInt(duration);
		
		sql = {
			text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
			values: [ codeCLass, req.user?.user_id]
		}
		
		getStudent = await querySync(sql);
		
		if(getStudent.rowCount){
			
			if(duration){
				
				//convert the raw duration value to current time
				const deadline = (new Date(date)).getTime() + duration;
				
				if(Date.now() > deadline){
					//this code is to send a error to the ctrler and thrown there. if thrown here, will be error field, i won't wan that way to happen
						req.errorFromField = {
							message: 'You add an answer the exam since the time enters the deadline',
							status: 200
						}
				}
				
			}
			
			
			
			return true
		
		}
	}
	
	return Promise.reject("Id assignment isn't found");
}