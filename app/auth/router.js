const router = require('express').Router();
const multerMidd = require('../../middlewares/upload');
const multer = require('multer');
const { uploadPhoto} = require('../../config');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const HASH_ROUND = 10;
const { querySync } = require('../../database');
const decodeToken = require('../../middlewares/decodeToken')

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

const { register, login, refresh, google, logout, local, me} = require('./controller');

passport.use(new LocalStrategy({usernameField: 'email'}, local));
router.post('/login',multer().none(), login);
router.get('/refresh', refresh);
router.get('/oauth/google', google);
router.post('/register',multerMidd(uploadPhoto).single('photo'),authValidator, register);
router.delete('/logout', decodeToken, logout);
router.get('/me', decodeToken, me);

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
//custoom sanitizer
 async function pwdSanitizer(value){
	 return  bcrypt.hashSync(value,HASH_ROUND);
}