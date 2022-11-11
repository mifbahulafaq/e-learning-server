const router = require('express').Router()
const { body } = require('express-validator')
const multer = require('../../middlewares/upload')
const config = require('../config')

//messages
const notEmpty = "The field must be filled"
const isInt = "The format must be integer"


const addValidation = [
	body('duration').notEmpty().bail().withMessage(notEmpty).isInt().bail().withMessage(isInt),
	body('text').if(body('text').exists()).notEmpty({ignore_whitespace: true}),
	body('id_matt').notEmpty().bail().withMessage(notEmpty).isInt().bail().withMessage(isInt)
]

const {
	addMattAss,
	deleteMattAss,
	getMattAss
} = require('./controller');

router.get('/matter-assignments/:id_matt', getMattAss)
router.post('/matter-assignments', multer(config.uploadDoct).array('attachment'), addValidation, addMattAss)
router.delete('/matter-assignments/:id_matt_ass')

module.exports = router

function isMine({ req }){
	
}