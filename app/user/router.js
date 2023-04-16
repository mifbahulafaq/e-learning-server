const router = require('express').Router()
const multerMidd = require('../../middlewares/upload')
const multer = require('multer')
const { uploadPhoto } = require('../config')
const { body } = require('express-validator')
const bcrypt = require('bcrypt')
const HASH_ROUND = 10
const { querySync } = require('../../database')

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

//controllers
const userControllers = require('./controller');
//middlewares
const middlewares = require('./middlewares')

router.get('/users/:user_id', userControllers.getSingle);
router.put(
	'/users/:user_id', 
	multerMidd(uploadPhoto).single('photo'), 
	middlewares.authorization('update'),
	updateValidator, userControllers.update);
router.put(
	'/users/:user_id/password', 
	multer().none(), 
	middlewares.authorization('update'),
	passValidator, 
	userControllers.updatePass
);

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
async function oldPass(value, { req }){
	
	const user_id = parseInt(req.params.user_id) || undefined
	const sql_getPass = {
		text: "SELECT password FROM users WHERE user_id=$1",
		values: [user_id]
	}
	
	try{
		
		const result_getPass = await querySync(sql_getPass)
		const old_password = result_getPass.rows[0].password
		const comparePwd = bcrypt.compareSync(value, old_password)
		
		if(!comparePwd) return Promise.reject('Password not match')
		
	}catch(err){
		console.log(err)
	}
}
//sanitizer
async function sanitizePwd(value){
	return bcrypt.hashSync(value, HASH_ROUND)
}