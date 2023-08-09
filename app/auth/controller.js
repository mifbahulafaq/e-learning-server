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
const { getGoogleOauthToken, getGooleUser } = require('./service') 
const { findUser } = require('../user/service') 
//utils
const getToken = require('../utils/get-token');
const appError = require('../utils/appError');

module.exports = {
	
	async local(email, password, done){
		const get ={
			text:'SELECT * FROM users WHERE email = $1',
			values:[email]
		}
		
		try{
			let result = await querySync(get);
			
			if(result.rowCount){
				if(bcrypt.compareSync(password,result.rows[0].password)){
					
					let {user_id, ...remains } = result.rows[0]
					token = jwt.sign({user_id}, config.secretKey);
					
					const update ={
						text:"UPDATE users SET token = token || ARRAY[$1] WHERE user_id = $2",
						values:[token, user_id]
					}
					await querySync(update);
					
					return done(null,token)
				}
			}
			
			done(null,false,{message:'Incorrect email or password'})
		}catch(err){
			done(err,null)
		}
	},
	
	async login (req,res,next){
		passport.authenticate('local',(err, token, info)=>{
			
			if(err) return next(err)
			if(!token) return res.json({
				error: 1,
				message: info.message
			})
			res.json({
				message:'Logged in successfully',
				token
			})
		})(req,res,next)
	},
	async google (req,res,next){
		
		try{
			
			//get code from the query string
			const code = req.query.code
			
			if(!code) return next(appError('Authorization code not provided!', 401))
			
			//use the code to get the id and access tokens
			let resultSQL = await getGoogleOauthToken({ code })
			const { id_token, access_token } = resultSQL.data
			
			//use the tokens to get the user info
			resultSQL = await getGooleUser({ id_token, access_token})
			const { name, verified_email, email, picture } = resultSQL.data
			
			if(!verified_email) return next(appError('Authorization code not provided!', 401))
			
			//update user if user alredy exists or create new user
			
			const userResult = await findUser({ email })
			
			if(resultSQL.rowCount){
				
				const { user_id } = resultSQL.rows[0]
				const token = jwt.sign({user_id}, config.secretKey)
				
				const sql_updateToken = {
					text: 'UPDATE users SET token = token || ARRAY[$1] WHERE user_id = $2',
					values: [token, user_id]
				}
				resultSQL = await querySync(sql_updateToken)
				
				//const token = await signToken()
				res.redirect(config.client_url)
				
			}else{
				
				const sql_createId = {
					text: "SELECT nextval('userid')"
				}
				resultSQL = await querySync(sql_createId)
				
				const user_id = parseInt(resultSQL.rows[0].nextval)
				
				const token = jwt.sign({user_id}, config.secretKey)
				
				const sql_createUser = {
					text: 'INSERT INTO users(user_id, name, email, token, photo) VALUES($1, $2, $3, ARRAY[$4], $5) ',
					values: [user_id, name, email, token, picture]
				}
				resultSQL = await querySync(sql_createUser)
				
				// res.cookie('access_token', )
				// res.cookie()
				// res.cookie()
				res.redirect(config.client_url)
			}
			
		}catch(err){
			
			next(err)
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
		const token = getToken(req);
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