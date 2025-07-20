const { querySync } = require('../../services/query');
const { body } = require('express-validator');
const users = require('../../services/table')('users');
const class_students = require('../../services/table')('class_students');

const classService = require('../class/service');

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

module.exports = {
	addValid,
	joinValid
}


async function joinClassValidation(codeClass, { req }){
	
	return await classService.teacherAuthor(codeClass, req, async (teacherData, err)=>{
		
		//check if code_class is not mine
		if(!teacherData.teacher || !err) return Promise.reject("You cannot join this class! check your code again");
		
		return await classService.teacherAuthor(codeClass, req, async (teacherData, err)=>{
			
			if(!err) return Promise.reject("You've already joined this class")
			
			return true
		
		})
		
	})
	
}
async function addClassValidation(codeClass, { req }){
	
	//check if code_class is mine
	await classService.teacherAuthor(code_class, req, (teacherData, err)=>{
		
		if(err) return Promise.reject("Code class isn't not found")
		
		return true;
		
	});
}
async function addStudentValidation(userId, { req }){
	
	//check that userid isn't the theacher
	if(userId !== req.user.user_id){
		
		//check that userid exists
		let { rows: userRows } = await users.find({ user_id: userId }).execute();
		
		if(userRows.rowCount){
			
			//check existing data
			let { rows: csRows } = await class_students.find({ class: req.body.class, user_id: userId }).execute();
			
			if(csRows.rowCount){
				return Promise.reject("The user have already joined this class")
			}
			
			return true
			
		} 
		
	} 
	
	return Promise.reject("You cannot add this student. check the id user again")
	
}