const router = require('express').Router();
const multerMidd = require('../../middlewares/upload');
const multer = require('multer');
const { body } = require('express-validator');
const { uploadPhoto} = require('../../config');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const users = require('../../services/table')('users');
const decodeToken = require('../../middlewares/decodeToken')

const controller = require('./controller');
const middleware = require('./middleware');

passport.use(new LocalStrategy({usernameField: 'email'}, controller.local));

router.post('/login',multer().none(), controller.login);
router.get('/refresh', controller.refresh);
router.get('/oauth/google', controller.google);
router.post('/register',multerMidd(uploadPhoto).single('photo'), middleware.authValidator, controller.register);
router.get('/verify', decodeToken, controller.verifyEmail);
//reset password
router.post('/forgot-password', multer().none(), controller.forgotPassword);
router.post(
	'/reset-password', 
	decodeToken, 
	multer().none(), 
	middleware.resetPassValidator,
	controller.resetPassword
);

router.delete('/logout', decodeToken, controller.logout);
router.get('/me', decodeToken, controller.me);

module.exports = router;