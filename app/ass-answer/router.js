const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');
const { uploadDoct } = require('../config');

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

router.get('/assignment-answers/by-matt-ass/:id_matt_ass', getByAss);
router.get('/assignment-answers/:id_ass_ans', getSingle);
router.get('/assignment-answers/:id_ass_ans/:filename', getAttachment);
router.put('/assignment-answers', multer(uploadDoct).single('content') ,fileToBody('content'), addValid, addAnswer);

module.exports = router;

async function isMine(id_matt_ass, { req }){
	
	let sql ={
		text: "SELECT m.class FROM matt_ass ma INNER JOIN matters m ON ma.id_matt=m.id_matter WHERE ma.id_matt_ass=$1",
		values: [id_matt_ass]
	}
	
	try{
		
		let getClass = await querySync(sql);
		
		if(getClass.rowCount){
			
			sql = {
				text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
				values: [getClass.rows[0]?.class, req.user?.user_id]
			}
			
			getStudent = await querySync(sql);
			
			if(getStudent.rowCount) return true
		}
		
		return Promise.reject("Id assignment isn't found");
		
	}catch(err){
		throw err
	}
}