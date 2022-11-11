const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const config = require('../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getMattAss(req, res, next){
		
		const id_matt = parseInt(req.params.id_matt);
		try{
			//get the main data and authorize
			const query = {
				text: 'SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM matters m INNER JOIN classes c ON m.class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_matter = $1',
				values: [id_matt || undefined]
			}
			const { rows: matterData } = await querySync(query);
			//authorize
			
			const policy = policyFor(req.user);
			const subjectMatter = subject('Matter',{user_id: matterData[0]?.teacher});
			
			if(!policy.can('readsingle',subjectMatter)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
					values: [matterData[0]?.class, req.user?.user_id]
				}
				const { rows: studentData} = await querySync(sqlGetStudent);
				
				const subjectMatter2 = subject('Matter',{user_id: studentData[0]?.user});
				
				if(!policy.can('readsingle',subjectMatter2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this data"
					})
				}
			}
			
			const filePath = path.join(config.rootPath, `public/document/${req.params.filename}`);
			
			if(!fs.existsSync(filePath)){
				return res.json({
					error: 1,
					message: "File's not found"
				})
			}
			
			return res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addMattAss(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Matt_ass')){
			
			removeFiles(req.files);
			
			return res.json({
				error: 1,
				message: 'You have no access to create a assignment'
			})
		}
		
		const errInsert = validationResult(req);
		let { schedule, name, duration, description, code_class, status } = req.body;
		let attachment = req.files.map(e=>[e.filename, e.originalname]);
		
		if(!errInsert.isEmpty()){
			
			removeFiles(req.files);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		console.log(req.body)
		console.log(req.files)
		return res.end()
		
		attachment = attachment.length ? JSON.stringify(attachment).replace(/\[/g,'{').replace(/\]/g,'}'): undefined;
		
		const query = {
			text: 'INSERT INTO matters(schedule, name, duration, description, attachment, class, status) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
			values: [ schedule, name, duration, description, attachment, code_class, status ]
		}
		
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			console.log('masuk err', err)
			removeFiles(req.files);
			
			next(err)
		}
	},
	/*-----------------edit-------------------------*/
	async deleteMattAss(req, res, next){
		
		try{
			const id_matt = parseInt(req.params.id_matt);
			let sql ={
				text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class = c.code_class  WHERE id_matter=$1',
				values: [id_matt || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Matter', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)){
				
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM matters WHERE id_matter=$1 RETURNING *',
				values: [id_matt || undefined]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = resultDelete.rows[0]?.attachment.map(e=>({path: path.join(config.rootPath,`public/document/${e}`)}));
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The data is successfult deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
}