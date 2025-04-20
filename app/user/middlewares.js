const policyFor = require('../policy')
const { subject } = require('@casl/ability');
const appError = require('../utils/appError');
const { body } = require('express-validator')
const bcrypt = require('bcrypt')
const HASH_ROUND = 10;
const users = require('../../services/table')('users');

function authorization(can){
		
	return function (req, res, next){
		
		const user_id = parseInt(req.params.user_id) || undefined
		const policy = policyFor(req.user)
		const FileDatas = req.file? [req.file]: req.files 
	
		const subjectUser = subject('User', { user_id })
		
		if(!policy.can(can, subjectUser)) throw appError("You aren't allow to read this data", 200)
		
		next()
	}
}

const lengthMsg = "Must be greater than 3 and less than 255 character"
const emailMsg = "Invalid Email"
const notEmptyMsg = "This field must be filled"

const updateValidator = [
	body('name').if(body('name').exists()).isLength({ min: 3, max: 255}).bail().withMessage(lengthMsg),
	body('gender').if(body('gender').exists()).isIn(['Male', 'Female']).bail(),
	body('email').if(body('email').exists()).isEmail().bail().withMessage(emailMsg).custom(emailUnique).bail()
]
const passValidator = [
	body('old_password')
	.notEmpty().bail().withMessage(notEmptyMsg)
	.isLength({min: 3, max: 255}).bail().withMessage(lengthMsg)
	.custom(oldPass),
	body('new_password')
	.notEmpty().bail().withMessage(notEmptyMsg)
	.isLength({min: 3, max: 255}).bail().withMessage(lengthMsg)
	.customSanitizer(sanitizePwd)
]

module.exports = {
	authorization,
	passValidator,
	updateValidator
}

//custom validator
 async function emailUnique(value){
	 
	const result = await users
	.find({ email: value })
	.execute()
	
	if(result.rowCount) return Promise.reject('Email is already used');
}
async function oldPass(value, { req }){
	
	const user_id = parseInt(req.params.user_id) || undefined
	
	const result_getPass = await users
	.find({ user_id: user_id })
	.select('password')
	.execute()
	
	const old_password = result_getPass.rows[0].password
	const comparePwd = bcrypt.compareSync(value, old_password)
	
	if(!comparePwd) return Promise.reject('Password not match');
}
//sanitizer
async function sanitizePwd(value){
	return bcrypt.hashSync(value, HASH_ROUND)
}