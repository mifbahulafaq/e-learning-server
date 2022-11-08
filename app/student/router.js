const router = require('express').Router();
const multer = require('multer');
const { body } = require('express-validator');
const { querySync } = require('../../database');

const isArrayMsg = "Input isn't a Array";
const noEmptyMsg = 'This field must be filled';
const lengthMsg5 = 'Must be less than 5 characters long';
const lengthMsg6 = 'Must be less than 6 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:5}).bail().withMessage(lengthMsg5).custom(addClassValidation),
	body('user').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:6}).withMessage(lengthMsg6).custom(addStudentValidation)
]
const joinValid = body('class').
	notEmpty().bail().withMessage(noEmptyMsg).
	isInt().bail().withMessage(intMsg).
	isLength({max:5}).bail().withMessage(lengthMsg5).
	custom(joinClassValidation);


const {
	getStudents,
	addStudent,
	getByClass,
	joinClass
} = require('./controller');

router.get('/students/:code_class', getByClass);
router.get('/students', getStudents);
router.post('/students/join-class', multer().none(), joinValid, joinClass);
router.post('/students/add', multer().none(), addValid, addStudent);

module.exports = router;

async function joinClassValidation(codeClass, { req }){
	
	//check if code_class is mine
	let sql = {
		text: "SELECT teacher FROM classes WHERE code_class=$1",
		values: [codeClass]
	}
	try{
		let result = await querySync(sql);
		if(!result.rowCount || result.rows[0]?.teacher === req.user?.user_id){
			return Promise.reject("You cannot join this class! check your code again")
		}
		
		//check existing data
		sql = {
			text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
			values: [codeClass, req.user?.user_id]
		}
		result = await querySync(sql);
		
		if(result.rows.length){
			return Promise.reject("You've already joined this class")
		}
		
	}catch(err){
		console.log(err.stack)
	}
}
async function addClassValidation(codeClass, { req }){
	
	//check if code_class is mine
	let sql = {
		text: "SELECT teacher FROM classes WHERE code_class=$1 AND teacher=$2",
		values: [codeClass, req.user?.user_id]
	}
	try{
		let result = await querySync(sql);
		if(!result.rows.length){
			return Promise.reject("Code class isn't not found")
		}
		
	}catch(err){
		console.log(err.stack)
	}
}
async function addStudentValidation(userId, { req }){
	
	//check if code_class is mine
	let sql = {
		text: "SELECT user_id FROM users WHERE user_id=$1",
		values: [userId]
	}
	try{
		let result = await querySync(sql);
		console.log(result)
		if(!result.rowCount || result.rows[0]?.user_id === req.user?.user_id){
			return Promise.reject("You cannot add this student, check the id user again")
		}
		
	}catch(err){
		throw err
	}
}