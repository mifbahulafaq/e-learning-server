const { queryAsync, querySync } = require('../../database');
const path = require('path');
const { validationResult } = require('express-validator');
const fs = require('fs')
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const getToken = require('../utils/get-token');

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
					
					let {token, password, ...remains } = result.rows[0]
					token = jwt.sign(remains, config.secretKey);
					
					const update ={
						text:"UPDATE users SET token = token || ARRAY[$1] WHERE user_id = $2",
						values:[token, remains.user_id]
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
				data: token
			})
		})(req,res,next)
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
			if(req.file) fs.unlinkSync(req.file.path);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		queryAsync(query,(err,result)=>{
			if(err){
				if(req.file) fs.unlinkSync(req.file.path);
				return next(err);
			}
			
			({password, token, ...remains} = result.rows[0]);
			
			res.json({
				message: 'Register is successful',
				data: remains
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
		res.json({
			data: req.user
		})
	}
}