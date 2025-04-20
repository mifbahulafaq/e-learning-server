const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const { querySync } = require('../../services/query');
const { body } = require('express-validator')

async function singleAssignmentAuthor(req, res, next){
	
	try{
		
		const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
		let policy = policyFor(req.user);
		
		let sql ={
			
			text: 'SELECT m.class, m.schedule FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE ma.id_matt_ass = $1',
			values: [id_matt_ass]
		} 

		let { rows: mattAssData } = await querySync(sql);
		
		sql ={
			text: 'SELECT teacher FROM classes WHERE code_class = $1 AND teacher = $2',
			values: [mattAssData[0]?.class, req.user?.user_id]
		}
		
		let { rows: classData } = await querySync(sql);
		let subjectMattAss = subject('Matt_ass', {user_id: classData[0]?.teacher})
		
		//teacher authorize
		if(!policy.can('readsingle', subjectMattAss)){
			
			let sql_get_student = {
				text: 'SELECT "user" FROM class_students WHERE class = $1 AND "user" = $2' ,
				values: [mattAssData[0]?.class, req.user?.user_id]
			}
			const { rows: studentData } = await querySync(sql_get_student);
			subjectMattAss = subject('Matt_ass', {user_id: studentData[0]?.user})
			
			console.log('studentData', req.user?.user_id)
			//student authorize
			if(!policy.can('readsingle', subjectMattAss)){
				return res.json({
					error: 1,
					message: 'You have no access to read this data'
				})
			}
			
			const scheduleOfMatter = mattAssData[0]?.schedule? new Date(mattAssData[0]?.schedule): undefined;
			
			if(new Date() < scheduleOfMatter){
				return res.json({
					error: 1,
					message: "You can only get the data when the time enters the schedule of the matterial " + scheduleOfMatter.toLocaleString("en-US")
				})
			}
			
			req.isTeacher = false;
			
			return next();
		}
		
		req.isTeacher = true;
		
		next();

	}catch(err){
	
		next(err)
	}
	
}

//messages
const notEmpty = "The field must be filled"
const isInt = "The format must be integer and the minmax is 1 - 17280. is it in the correct format already?"
const length255 = "Must be less than 255 character long"

const addValidation = [
	body('duration').if(body('duration').exists()).isInt({ min: 1, max: 17280 }).bail().withMessage(isInt),
	body('title').notEmpty({ignore_whitespace:true}).bail().withMessage(notEmpty).isLength({max:255}).bail().withMessage(length255),
	body('text').if(body('text').exists()).customSanitizer(ignoreWhitespace),
	body('id_matt').notEmpty().bail().withMessage(notEmpty).isInt().bail().withMessage(isInt).custom(isMine)
]

module.exports = {
	singleAssignmentAuthor,
	addValidation
}


//custom sanitizer
function ignoreWhitespace(val){
	const regex = /[a-zA-Z]/
	return regex.test(val)? val: undefined
}

//custom validation
async function isMine(id_matt, { req }){
	
	let sql = {
		text: "SELECT class FROM matters WHERE id_matter = $1",
		values: [id_matt]
	}
	const singleMatter = await querySync(sql)
	sql = {
		text: "SELECT * FROM classes WHERE code_class = $1 AND teacher = $2",
		values: [singleMatter.rows[0]?.class, req.user?.user_id]
	}
	const singleClass = await querySync(sql)
	
	if(!singleClass.rowCount) return Promise.reject("Id Matter isn't found")
}