const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const { body } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../services/query');
const matters = require('../../services/table')('matters');

async function singleMatterAuthor(req, res, next){
	
	const id_matt = parseInt(req.params.id_matt) || undefined;
	
	try{
		//get the main data and authorize
		const query = {
			text: 'SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM matters m INNER JOIN classes c ON m.class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_matter = $1',
			values: [id_matt]
		}
		const { rows: matterData } = await querySync(query);
		//authorize
		
		let subjectMatter = subject('Matter',{user_id: matterData[0]?.teacher});
		const policy = policyFor(req.user);
		
		if(!policy.can('readsingle',subjectMatter)){
			
			let sqlGetStudent = {
				text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
				values: [matterData[0]?.class, req.user?.user_id]
			}
			const { rows: studentData} = await querySync(sqlGetStudent);
			
			subjectMatter = subject('Matter',{user_id: studentData[0]?.user});
			
			if(!policy.can('readsingle',subjectMatter)){
				return res.json({
					error: 1,
					message: "You're not allowed to read this data"
				})
			}
		}
		
		req.data = matterData;
		next();

	}catch(err){

		next(err);
		
	}
}

const isIntMessage = "Input must be a integer";
const isArrayMessage = "Input must be a array";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 255 or greater than 5 characters long';
const lengthMsg255 = 'Must be less than 255 characters long';
const lengthMsg5 = 'Must be less than 255 characters long';
const arrMsg = "Must be Array";
const isArrOrNnullMsg = "Input must be array or null";

const addingValid = [
	body('class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine),
	body('status').notEmpty().bail().withMessage(noEmptyMsg).isIn(["active","inactive"]),
	body('description').if(body('description').exists()).isLength({max:255}).withMessage(lengthMsg),
	body('schedule').notEmpty().bail().withMessage(noEmptyMsg).custom(isDate),
	body('name').notEmpty().bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
]

const editingValid = [
	// body('class').if(body('class').exists()).isInt().bail().withMessage(isIntMessage).isLength({max: 5}).bail().withMessage(lengthMsg5).custom(isMine),
	// body('attachment').if(body('attachment').exists()).isArray().bail().withMessage(isArrayMessage),
	body('attachment').if(body('attachment').exists()).customSanitizer(nullSanitizer).if(body('attachment').not().custom(isNull)).isArray()
	.withMessage(isArrOrNnullMsg).bail().custom(checkExistingData),
	body('status').if(body('status').exists()).isIn(["active","inactive"]),
	body('description').if(body('description').exists()).isLength({max:255}).withMessage(lengthMsg),
	body('schedule').if(body('schedule').exists()).custom(isDate),
	body('name').if(body('name').exists()).isLength({min:3, max:255}).withMessage(lengthMsg),
]


module.exports = {
	singleMatterAuthor,
	addingValid,
	editingValid
}

//custom validator
async function checkExistingData(val, { req }){
	
	if(!val.length) return Promise.reject('filename  or originalname property undefined');
	
	for(let i = 0; i < val.length; i++){
		if(!val[i]?.filename || !val[i]?.originalname) return Promise.reject('filename  or originalname property undefined');
	}
	
	val = val.map(({filename, originalname})=>({filename, originalname}));
	
	const id_matter = parseInt(req.params.id_matt) || undefined;
	const selection = "UNNEST(attachment[1:][1:1]) filename, UNNEST(attachment[1:][2:]) originalname"	
	
	const result = await matters
	.find({ id_matter })
	.select(selection)
	.execute()
	
	const attachment = result.rows.map(e=>{
		return JSON.stringify(e);
	})
	
	for(let i = 0; i < val.length; i++){
		if(!attachment.includes(JSON.stringify(val[i]))) return Promise.reject('Files not found');
	}
	
	return true
	
}

function isNull(val){
	/*
	in frontend side, because formData represents form of html so it can only send a string or Blob (including subclasses such as File). to overcome this case, the server side must ask the frontend side to send a null of string, and then the server convert it into pure null using JSON.parse on sanitizer
	*/
	
	if(val === null) return true;
		
	throw new Error('Data must be null');
	
}
function isDate(value){ 
	const isValid = moment(value, "YYYY-MM-DD HH:mm:ss", true).isValid();
	if(!isValid){
		throw new Error(`the format of ${value} isn't date`);
	}
	return true;
}
function noWhitespace(v){return v.replace(/(^\s*)|(\s*$)/g, "")}

async function isMine(codeClass, { req }){
	
	const sql={
		text: "SELECT * FROM classes WHERE code_class=$1 AND teacher=$2",
		values: [codeClass, req.user?.user_id]
	}
	
	const classData = await querySync(sql);
	if(!classData.rowCount) return Promise.reject("Code class isn't found");
}

//custoom sanitizer
 function nullSanitizer(value){
	 return  value === 'null'? JSON.parse(value): value;
}