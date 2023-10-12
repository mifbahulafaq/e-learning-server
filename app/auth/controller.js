const { queryAsync, querySync } = require('../../database');
const path = require('path');
const { validationResult } = require('express-validator');
const removeFiles = require('../utils/removeFiles');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const qs = require('qs')

//services
const authService = require('./service')
const userService = require('../user/service') 
//utils
const appError = require('../utils/appError');

const accessTokenCookieOptions = {
	expires: new Date(Date.now() + config.accessTokenExpireIn * 60 * 1000),
	maxAge: config.accessTokenExpireIn * 60 * 1000,
	httpOnly: true,
	sameSite: 'lax'
}
const refreshTokenCookieOptions = {
	expires: new Date(Date.now() + config.refreshTokenExpireIn * 60 * 1000),
	maxAge: config.refreshTokenExpireIn * 60 * 1000,
	httpOnly: true,
	sameSite: 'lax'
}

module.exports = {
	
	async local(body_email, body_pass, done){
		
		try{
			let result = await userService.findUser({ email: body_email })
			
			if(result.rowCount){
				
				const { user_id, email, password, verified } = result.rows[0];
				
				if(bcrypt.compareSync(body_pass, password)){
					
					if(!verified){
						
						await authService.sendEmailVerification({user_id, email})
						
						return done(null, {}, { message: "Email isn't verified yet. an email verification has been sent to your email"})
					}
					
					const { access_token, refresh_token } = await authService.signToken(user_id)
					
					return done(null,{ access_token, refresh_token }, {message:'Logged in successfully'})
				}
			}
			
			done(appError("Incorect email or password", 200), {})
			
		}catch(err){
			done(err)
		}
	},
	
	async login (req,res,next){
		passport.authenticate('local',(err, data, info)=>{
			
			if(err) return next(err);
			
			const { access_token, refresh_token } = data;
			
			if(access_token){
				
				const {expires, maxAge, ...remainsOpt} = refreshTokenCookieOptions
				
				res.cookie(
					'refresh_token', 
					refresh_token, 
					req.body.keep? {...refreshTokenCookieOptions}: {...remainsOpt}
				)
				res.cookie('access_token', access_token, accessTokenCookieOptions)
				res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
				
				res.json({
					message: info.message,
					token: access_token
				})
			}else{
				
				res.json({
					message: info.message
				})
			}
		})(req,res,next)
	},
	
	async forgotPassword(req, res, next){
		
		try{
			const { email } = req.body;
			
			const user = await  authService.forgotPassword(email);
			
			res.json({
				data: user,
				message: 'an email has been sent'
			})
			
		}catch(err){
			next(err)
		}
	},
	async resetPassword(req, res, next){
		
		try{
			const errInsert = validationResult(req);
		
			if(!errInsert.isEmpty()){
				
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			const { new_password } = req.body;
			
			const userData = await authService.resetPassword(req.user.user_id, new_password)
			
			res.json({
				data: userData,
				message: 'Password has benn changed'
			})
			
		}catch(err){
			next(err)
		}
	},
	
	async refresh(req, res, next){
		
		try{
			
			const refreshToken = req.cookies.refresh_token;
			
			const access_token = await authService.refreshToken(refreshToken);
			
			res.cookie('access_token', access_token, accessTokenCookieOptions)
			res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
			res.json({
				token: access_token
			})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
		
	},
	async google (req, res, next){
		
		try{
			
			//get code from the query string
			const code = req.query.code

			if(!code) return next(appError('Authorization code not provided!'))
				
			const { refresh_token, access_token } = await authService.googleOauth(code)
			
			res.cookie('access_token', access_token, accessTokenCookieOptions)
			res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions)
			res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
			res.redirect(config.client_url)
			
		}catch(err){
			console.log('Failed to authorize Google user', err)
			res.redirect(`${config.client_url}/oauth/error`)
		}
		
	},
	
	async register(req,res, next){
		
		const errInsert = validationResult(req);
		
		if(!errInsert.isEmpty()){
			if(req.file) removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		try{
			
			let {name, gender, email, password} = req.body;
			const photo = req.file? req.file.filename : null;
			
			await authService.register({name, gender, email: email.toLowerCase(), password, photo})
			
			res.json({
				message: "An email has been sent. Please check your email address."
			})
			
		}catch(err){
			
			next(err)
		}
		
		
	},
	
	async verifyEmail(req, res, next){
		
		try{
			console.log(req.user)
			const userData = await authService.verifyEmail(req.user);
		
			return res.json({
				message: 'Verifying email is succeed',
				data: userData
			})
		}catch(err){
			
			next(err)
		}
		
	},
	
	async logout (req,res, next){
		
		res.cookie('access_token', '', { maxAge: 1 });
		res.cookie('refresh_token', '', { maxAge: 1 });
		res.cookie('logged_in', '', { maxAge: 1 });
		
		res.json({
			 message: "logout is successful"
		})
	},
	
	async me(req,res,next){
		if(!req.user) return res.json({
			error:1,
			message: "You'are not login or token expired"
		})
		res.json(req.user)
	}
}