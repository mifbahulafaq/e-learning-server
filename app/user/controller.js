const { querySync } = require('../../services/query');
const policyFor = require('../policy')
const { subject } = require('@casl/ability')
const { validationResult } = require('express-validator');
const config = require('../../config')
const path = require('path')
const appError = require('../utils/appError')

const singleAuthorization = require('../../services/singleAuthorization');
const userService = require('./service')
const authService = require('../auth/service')


module.exports = {
	
	async getSingle (req, res, next){
		
		try{
			
			const user_id = parseInt(req.params.user_id) || undefined;
			
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			const userData = await userService.findUser({user_id})
			const { token, password, ...dataRemains } = userData.rows[0];
			
			return res.json(dataRemains)
			
		}catch(err){
			
			next(err)
		}
		
	},
	async update (req, res, next){
		
		try{
			
			const user_id = parseInt(req.params.user_id) || undefined;
			
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			const errInsert = validationResult(req)
			
			if(!errInsert.isEmpty()){
				
				const err = appError('Insert', 200);
				err.field = errInsert.mapped();
				
				throw err;
			}
			
			//updating
			if(req.file?.filename) req.body.photo = req.file?.filename;
			
			const { name, email, gender, photo } = req.body
			const updateData = { name, email, gender, photo}
			
			const result = await userService.updateUser({user_id}, updateData)
			
			if(!result.rowCount) throw appError('Update user failed', 200)
			
			const { password, token, ...remains} = result.rows[0]
			return res.json(remains)
			
		}catch(err){
			
			next(err)
		}
		
	},
	
	async updatePass (req, res, next){
		
		try{
			
			const user_id = parseInt(req.params.user_id) || undefined;
	
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			const errInsert = validationResult(req)
			
			if(!errInsert.isEmpty()){
				
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			const { new_password } = req.body

			const result = await userService.updatePass(new_password, user_id)
			
			return res.json({
				error: 0,
				message: 'Password changed'
			})
			
		}catch(err){
			next(err)
		}
		
	}
}