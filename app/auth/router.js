const router = require('express').Router();
const multer = require('../../middlewares/upload');
const photoConfig = require('../utils/photo');
const { body, check } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const HASH_ROUND = 10;
const { querySync } = require('../../database');

const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be less than 5 or greater than 255 characters long';
const authValidator = [
	body('name').notEmpty().bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('gender').notEmpty().bail().withMessage(noEmptyMsg).isIn(['Male','Female']),
	body('email').notEmpty().bail().withMessage(noEmptyMsg).isEmail().custom(emailUnique),
	body('password')
	.notEmpty().bail().withMessage(noEmptyMsg)
	.isLength({min:3, max:255}).withMessage(lengthMsg)
	.customSanitizer(pwdSanitizer),
]

const { register, login, logout, local, me} = require('./controller');

passport.use(new LocalStrategy({usernameField: 'email'}, local));
router.post('/login',multer().none(), login);
router.post('/register',multer(photoConfig).single('photo'),authValidator, register);
router.delete('/logout', logout);
router.get('/me', me);

module.exports = router;

//custom validator
 async function emailUnique(value){
	const query = {
		text: 'SELECT * FROM users WHERE email = $1',
		values: [value]
	}
	try{
		const result = await querySync(query);
		if(result.rowCount) return Promise.reject('Email is already used');
	}catch(err){
		console.log(err.stack)
	}
}
//custiom sanitizer
 async function pwdSanitizer(value){
	 return  bcrypt.hashSync(value,HASH_ROUND);
}