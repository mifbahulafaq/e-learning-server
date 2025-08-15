const { querySync } = require('../../services/query');
const users = require('../../services/table')('users');
const policyFor = require('../policy')
const { subject } = require('@casl/ability')
const { validationResult } = require('express-validator');
const config = require('../../config')
const path = require('path')
const appError = require('../utils/appError')

const singleAuthorization = require('../../services/singleAuthorization');
const { removeFiles } = require('../../services/file');
const userService = require('./service')
const authService = require('../auth/service')


module.exports = {
	
	async getSingle (req, res, next){
		
		try{
			
			const user_id = parseInt(req.params.user_id) || undefined;
			
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			const userData = await users.find({user_id}).execute();
			const { token, password, ...dataRemains } = userData.rows[0];
			
			res.json(dataRemains)
			
		}catch(err){
			
			next(err)
		}
		
	},
	async update (req, res, next){
		
		const user_id = parseInt(req.params.user_id) || undefined;
		
		try{
			
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			//updating
			const result = await userService.updateUser(req);
			
			const { password, token, ...remains} = result.rows[0]
			return res.json(remains)
			
		}catch(err){
			
			if(req.file?.filename) removeFiles([{ path: path.join(config.rootPath, `public/photo/${req.file.filename}`)}]);
			
			next(err)
		}
		
	},
	
	async updatePass (req, res, next){
		
		try{
			
			const user_id = parseInt(req.params.user_id) || undefined;
	
			//authorizing..
			singleAuthorization('User', req.user, { user_id });
			
			await userService.updatePass(req)
			
			return res.json({
				error: 0,
				message: 'Password changed'
			})
			
		}catch(err){
			next(err)
		}
		
	}
}