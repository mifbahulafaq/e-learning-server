const { body } = require('express-validator');
const moment = require('moment');
const noEdgeWhitespace = require('../utils/noEdgeWhitespace');

const isArrayMsg = "Input isn't a Array";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = 'Must be greater than 255 or less than 5 characters long';

const addValid = [
	body('class_name').customSanitizer(noEdgeWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('description').if(body('description').exists()).customSanitizer(noEdgeWhitespace).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('color').isLength({max: 7}).withMessage("Cannot be greater than 7 characters")
	/*body('schedule')
	.if(body('schedule').exists())
	.isArray().bail().withMessage(isArrayMsg)
	.custom(isDate)
	.customSanitizer(dateSanitizer)*/
]
const updateValid = [
	body('class_name').if(body('class_name').exists()).customSanitizer(noEdgeWhitespace).notEmpty({ignore_whitespace:true}).bail().withMessage(noEmptyMsg).isLength({min:3, max:255}).withMessage(lengthMsg),
	body('description').if(body('description').exists()).customSanitizer(noEdgeWhitespace).isLength({min:3, max:255}).withMessage(lengthMsg),
	/*body('schedule')
	.notEmpty().bail().withMessage(noEmptyMsg)
	.isArray().bail().withMessage(isArrayMsg)
	.custom(isDate)
	.customSanitizer(dateSanitizer)*/
]

module.exports = {
	addValid,
	updateValid
}