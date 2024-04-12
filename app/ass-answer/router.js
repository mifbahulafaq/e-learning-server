const router = require('express').Router();
const multer = require('../../middlewares/upload');
const multer2 = require('multer');
const path = require('path');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../database');
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

router.get('/assignment-answers/by-matt-ass/:id_matt_ass', getByAss);
router.get('/assignment-answers/:id_ass_ans', getSingle);
router.get('/assignment-answers/:id_ass_ans/:filename', getAttachment);
router.put('/assignment-answers', multer(uploadDoct).single('content') ,fileToBody('content'), addValid, addAnswer);


	// const storage = multer.diskStorage({
		// destination: function(req, file, cb){
			// cb(null, path.resolve(__dirname));
		// },
		// filename: function(req, file, cb){
			
			// let ext = file.originalname.split('.')
			// [file.originalname.split('.').length - 1];
			
			// let randName = Date.now()+ Math.round(Math.random()*1E9)+'.'+ext;
			
			// cb(null, file.fieldname+'-'+randName)
		// }
	// })

	// const fileFilter = function(req, file, cb){
		// const file2 = path.extname(file.originalname).toLocaleLowerCase();
		
		// if(config.ext.indexOf(file2) == -1){
			
			// const err = new Error(`The format isn't support`);
			// err.name = "MulterError";
			// err.field = file.fieldname;
			
			// return cb(err);
		// }
		// cb(null,true);
	// }

// router.put(
	// '/assignment-answers/test', 
	// multer2({
		// storage,
		// limits: {fileSize : config.size},
		// fileFilter
	// }).single('content') ,
	// fileToBody('content'),
	// (req, res)=>{
		
		// console.log(req.body)
		
		// res.send('testing successfully')
	// }
// );

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
				text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
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