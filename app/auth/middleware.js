const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const HASH_ROUND = 10;

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be greater than 255 or less than 5 characters long';
const emailMsg = "Invalid Email"

const authValidator = [
	body('name').notEmpty().bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('gender').notEmpty().bail().withMessage(noEmptyMsg).isIn(['Male','Female']),
	body('email').notEmpty().bail().withMessage(noEmptyMsg).isEmail().withMessage(emailMsg).custom(emailUnique),
	body('password')
	.notEmpty().bail().withMessage(noEmptyMsg)
	.isLength({min:3, max:255}).withMessage(lengthMsg)
	.customSanitizer(pwdSanitizer),
]
const resetPassValidator = body('new_password').notEmpty().bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg).customSanitizer(pwdSanitizer)

module.exports = {
	resetPassValidator,
	authValidator,
}

//custom validator
 async function emailUnique(value){
	 
	const result = await users.find({email: value}).execute();
	
	if(result.rowCount) return Promise.reject('Email is already used');
}
//custoom sanitizer
 async function pwdSanitizer(value){
	 return  bcrypt.hashSync(value,HASH_ROUND);
}