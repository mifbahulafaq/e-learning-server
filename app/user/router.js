const router = require('express').Router()
const multerMidd = require('../../middlewares/upload')
const multer = require('multer')
const { uploadPhoto } = require('../../config');

//controllers
const userControllers = require('./controller');
//middlewares
const middlewares = require('./middlewares')

router.get('/users/:user_id', userControllers.getSingle);
router.put(
	'/users/:user_id', 
	multerMidd(uploadPhoto).single('photo'), 
	middlewares.authorization('update'),
	middlewares.updateValidator, 
	userControllers.update
);
router.put(
	'/users/:user_id/password', 
	multer().none(), 
	middlewares.authorization('update'),
	middlewares.passValidator, 
	userControllers.updatePass
);

module.exports = router;

