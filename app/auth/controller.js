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

//Cookie Options
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
					
					return done(null,{ access_token, refresh_token })
				}
			}
			
			done(null,{},{message:'Incorrect email or password'})
		}catch(err){
			done(err,{})
		}
	},
	
	async login (req,res,next){
		passport.authenticate('local',(err, token, info)=>{
			
			if(err) return next(err)
			
			const { access_token, refresh_token } = token
			
			if(!access_token) return res.json({
				error: 1,
				message: info.message
			})
			
			res.cookie('access_token', access_token, accessTokenCookieOptions)
			res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions)
			res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
			res.json({
				message:'Logged in successfully',
				token: access_token
			})
		})(req,res,next)
	},
	async refresh(req, res, next){
		
		try{
			
			const refreshToken = req.cookies.refresh_token;
			
			const accessToken = await authService.refresh(refreshToken);
			
			res.cookie('access_token', accessToken, accessTokenCookieOptions)
			res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
			res.json({
				token: access_token
			})
			
		}catch(err){
		
			next(appError("Couldn't refresh access token", 401));

		}
		
		
	},
	async google (req, res, next){
		
		try{
			
			//get code from the query string
			const code = req.query.code

			if(!code) return next(appError('Authorization code not provided!', 401))
				
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
		const token = false// = getToken(req);
		const query = {
			text:'UPDATE users SET token = ARRAY_REMOVE(token, $1) WHERE $1 = ANY(token)',
			values: [token]
		}
		
		try{	
			const result = await querySync(query);
			
			if(!result.rowCount || !token){
				return res.json({
					error: 1,
					message: 'User not found'
				})
			}
			res.json({
				 message: "logout is successful"
			})
			
		}catch(err){
			next(err)
		}
	},
	
	async me(req,res,next){
		if(!req.user) return res.json({
			error:1,
			message: "You'are not login or token expired"
		})
		res.json(req.user)
	}
}