const router = require('express').Router()
const { body } = require('express-validator')
const multer = require('../../middlewares/upload')
const config = require('../../config')
const { querySync } = require('../../database')

//messages
const notEmpty = "The field must be filled"
const isInt = "The format must be integer"
const length255 = "Must be less than 255 character long"


const addValidation = [
	body('duration').if(body('duration').exists()).isInt().bail().withMessage(isInt),
	body('title').notEmpty({ignore_whitespace:true}).bail().withMessage(notEmpty).isLength({max:255}).bail().withMessage(length255),
	body('text').if(body('text').exists()).customSanitizer(ignoreWhitespace),
	body('id_matt').notEmpty().bail().withMessage(notEmpty).isInt().bail().withMessage(isInt).custom(isMine)
]

const {
	addMattAss,
	deleteMattAss,
	getMattAss,
	getByMatter,
	singleMattAss
} = require('./controller');

router.get('/matter-assignments/by-matter/:id_matt', getByMatter)
router.get('/matter-assignments', getMattAss)
router.get('/matter-assignments/:id_matt_ass', singleMattAss)
router.post('/matter-assignments', multer(config.uploadDoct).single('attachment'), addValidation, addMattAss)
router.delete('/matter-assignments/:id_matt_ass', deleteMattAss)

module.exports = router

//custom sanitizer
function ignoreWhitespace(val){
	const regex = /[a-zA-Z]/
	return regex.test(val)? val: undefined
}

//custom validation
async function isMine(id_matt, { req }){
	
	try{
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
			
	}catch(err){
		throw err
	}
}