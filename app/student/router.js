const router = require('express').Router();
const multer = require('../../middlewares/upload');
const { body } = require('express-validator');

const isArrayMsg = "Input isn't a Array";
const noEmptyMsg = 'This field must be filled';
const lengthMsg5 = 'Must be less than 5 characters long';
const lengthMsg6 = 'Must be less than 6 characters long';
const intMsg = 'Input must be integer';

const addValid = [
	body('class').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:5}).withMessage(lengthMsg5),
	body('user').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(intMsg).isLength({max:6}).withMessage(lengthMsg6)
]


const {
	getStudents,
	addStudent,
	getByClass
} = require('./controller');

router.get('/students/:code_class', getByClass);
router.get('/students', getStudents);
router.post('/students', multer().none(), addValid, addStudent);

module.exports = router;