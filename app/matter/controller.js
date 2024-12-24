const { validationResult } = require('express-validator');
const moment = require('moment');
const { querySync } = require('../../services/query');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const toSqlArray = require('../utils/toSqlArray');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const config = require('../../config');
const matterService = require('./service');
// const fileService = require('../../service/file');
const appError = require('../utils/appError')

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		try{
			const code_class = parseInt(req.params.code_class);
			const policy = policyFor(req.user)
			//validations
			let sqlGetClass = {
				text: 'SELECT teacher FROM classes WHERE code_class=$1',
				values: [code_class || undefined]
			}
			const { rows: classData } = await querySync(sqlGetClass);
			const subjectMatter = subject('Matter',{user_id: classData[0]?.teacher})
			
			if(!policy.can('read', subjectMatter)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
					values: [code_class || undefined, req.user?.user_id]
				}
				
				const { rows: studentData } = await querySync(sqlGetStudent);
				const subjectMatter2 = subject('Matter',{user_id: studentData[0]?.user});
				
				if(!policy.can('read', subjectMatter2)){
					return res.json({
						error: 1,
						message: "You're not allowed to perform this action"
					})
					
				}
			}
			
			//get matter data by class
			const { rows: matterData } = await matterService.findByClass(req.query, code_class);
			
			res.json({data: matterData})
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		res.json({data: req.data});
	},
	
	/*-----------------get attachment-------------------------*/
	async getAttachment(req, res, next){
		
		try{
			
			await searchFileOfArrays(req.data?.[0]?.attachment, req.params.filename);
			
			return res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async postMatter(req, res, next){
		
		try{
			let policy = policyFor(req.user);
			
			if(!policy.can('create', 'Matter')) throw appError('You have no access to create a matter', 200);
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('insert', 200);
				err.field = errInsert.mapped()
				
				throw err;
			}
	
			const { body, files } = req;
			
			const result = await matterService.create({body, files});
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async putMatter(req, res, next){
		
		try{
			
			const { user, params, body, files } = req;
			const id_matter = parseInt(params.id_matt) || undefined;
			
			let sql ={
				text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class = c.code_class  WHERE id_matter=$1',
				values: [id_matter]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Matter', {user_id: rows[0]?.teacher})
			let policy = policyFor(user);
			
			// authorization
			if(!policy.can('update', subjectMatter)) throw appError('You have no access to edit this data', 200);
			
			//validating...
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('insert', 200);
				err.field = errInsert.mapped()
				
				throw err;
				
			}
			
			//updating....
			const alldatas = { body, files }
			
			const resultUpdate = await matterService.update(id_matter, alldatas);
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
			next(err)
		}
	},	
	/*-----------------edit-------------------------*/
	async remove(req, res, next){
		
		try{
			const id_matt = parseInt(req.params.id_matt);
			let sql ={
				text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class = c.code_class  WHERE id_matter=$1',
				values: [id_matt || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Matter', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)) throw appError('You have no access to delete this data', 200);
			
			let deleteSql = {
				text: 'DELETE FROM matters WHERE id_matter=$1 RETURNING *',
				values: [id_matt || undefined]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = resultDelete.rows[0]?.attachment.map(e=>({path: path.join(config.rootPath,`public/document/${e[0]}`)}));
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The data is successfult deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			next(err)
		}
	},
	async tester(req, res, next){
		
		return res.end()
	}
}