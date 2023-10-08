const { querySync } = require('../../database')
const policyFor = require('../policy')
const { subject } = require('@casl/ability')
const { validationResult } = require('express-validator')
const removeFiles = require('../utils/removeFiles')
const config = require('../../config')
const path = require('path')

const userService = require('./service')
const authService = require('../auth/service')


module.exports = {
	
	async getSingle (req, res, next){
		
		const user_id = parseInt(req.params.user_id) || undefined
		const policy = policyFor(req.user)
		const subjectUser = subject('User', { user_id })
	
		if(!policy.can('readsingle', subjectUser)){
			return res.json({
				error: 1,
				message: "You aren't allow to read this data"
			})
		}
		
		try{
			
			const userData = await userService.findUser({user_id})
			return res.json(userData.rows[0])
			
		}catch(err){
			
			next(err)
		}
		
	},
	async update (req, res, next){
		
		const user_id = parseInt(req.params.user_id) || undefined
		const errInsert = validationResult(req)
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file])
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		try{
			
			//updating
			if(req.file?.filename) req.body.photo = req.file?.filename;
			
			const { name, email, gender, photo } = req.body
			const updateData = { name, email, gender, photo}
			
			return res.json(await userService.updateUser({user_id}, updateData))
			
		}catch(err){
			
			next(err)
		}
		
	},
	
	async updatePass (req, res, next){
		
		const user_id = parseInt(req.params.user_id) || undefined
		const errInsert = validationResult(req)
		
		if(!errInsert.isEmpty()){
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		try{
			
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