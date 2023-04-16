const { querySync } = require('../../database')
const policyFor = require('../policy')
const { subject } = require('@casl/ability')
const { validationResult } = require('express-validator')
const updateData = require('../utils/updateData')
const removeFiles = require('../utils/removeFiles')
const config = require('../config')
const path = require('path')


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
			const sql_get_user = {
				text: 'SELECT user_id, name, email, gender, photo FROM users WHERE user_id = $1',
				values : [user_id]
			}
		
			const result = await querySync(sql_get_user)
			
			return res.json(result.rows[0])
		}catch(err){
			console.log(err)
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
			
			//get single data to delete photo
			const sqlGetPhoto = {
				text: "SELECT photo FROM users WHERE user_id = $1",
				values: [user_id]
			}
			const {rows: userData } = await querySync(sqlGetPhoto)
			let userPhoto = userData[0]?.photo || undefined
			
			//updating
			if(req.file?.filename) req.body.photo = req.file?.filename;
			const columns = ['name', 'email', 'gender', 'photo']
			const resultUpdate = await updateData(req, 'users', columns)
			
			if(resultUpdate.rowCount && req.file){
				if(userPhoto){
					userPhoto = [{ path: path.join(config.rootPath, `public/photo/${userPhoto}`)}]
					removeFiles(userPhoto)
				}
			}
			const { password, token, ...remains} = resultUpdate.rows[0]
			return res.json(remains)
		}catch(err){
			removeFiles([req.file])
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
			const sql_updatePwd = {
				text: "UPDATE users SET password = $1 WHERE user_id = $2",
				values: [new_password, user_id]
			}
			
			await querySync(sql_updatePwd)
			
			return res.json({
				erro: 0,
				message: 'Password changed'
			})
			
		}catch(err){
			next(err)
		}
		
	}
}