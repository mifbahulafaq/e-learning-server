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

//SET COOKIE OPT 
//note: you must also set the cookie expire on serverside storage (use jwt expire/dbms/redis), just in case if  client sets expire from browser  

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
	
	async local(email, password, done){
		
		try{
			let result = await userService.findUser({ email })
			
			if(result.rowCount){
				if(bcrypt.compareSync(password,result.rows[0].password)){
					
					let {user_id, ...remains } = result.rows[0]
					
					const { access_token, refresh_token } = await authService.signToken(user_id)
					
					return done(null,{ access_token, refresh_token }, {message:'Logged in successfully'})
				}
			}
			
			done(null, {}, { message: "Incorect email or password"})
			
		}catch(err){
			done(err)
		}
	},
	
	async login (req,res,next){
		passport.authenticate('local',(err, token, info)=>{
			
			if(err) return next(err);
			
			const { access_token, refresh_token } = token;
			
			if(!access_token){
				return res.json({
					error: 1,
					message: info.message
				})
			}
			
			res.cookie('access_token', access_token, accessTokenCookieOptions)
			res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions)
			res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
			res.json({
				message: info.message,
				token: access_token
			})
		})(req,res,next)
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
		let {name, gender, email, password} = req.body;
		const photo = req.file? req.file.filename : null;
		
		const query = {
			text: 'INSERT INTO users(name, gender, email, password, photo) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [name, gender, email, password, photo]
		}
		
		if(!errInsert.isEmpty()){
			if(req.file) removeFiles(req.file);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		queryAsync(query,(err,result)=>{
			if(err){
				if(req.file) removeFiles(req.file);
				return next(err);
			}
			
			({password, token, ...rest} = result.rows[0]);
			
			res.json({
				message: 'Register is successful',
				data: rest
			})
		})
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