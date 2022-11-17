const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
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
			
			let sql = {
				text: "SELECT class FROM matters WHERE id_matter = $1",
				values: [id_matt]
			}
			const singleMatter = await querySync(sql)
			sql = {
				text: "SELECT * FROM classes WHERE code_class = $1 AND teacher = $2",
				values: [singleMatter.rows[0]?.class, req.user?.user_id]
			}
			const { rows: classData} = await querySync(sql)
			
			const policy = policyFor(req.user);
			const subjectMattAss = subject('Matt_ass',{user_id: classData[0]?.teacher});
			
			if(!policy.can('read',subjectMattAss)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
					values: [singleMatter.rows[0]?.class, req.user?.user_id]
				}
				const { rows: studentData} = await querySync(sqlGetStudent);
				const subjectMattAss2 = subject('Matt_ass',{user_id: studentData[0]?.user});
				
				if(!policy.can('read',subjectMattAss2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this data"
					})
				}
			}
			
			sql = {
				text: "SELECT * FROM matt_ass WHERE id_matt = $1",
				values: [id_matt]
			}
			const { rows: mattAssData } = await querySync(sql)
			
			return res.json({
				data: mattAssData
			})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	async singleMattAss(req, res, next){
	
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass);
			let policy = policyFor(req.user);
			
			sql ={
				text: 'SELECT class FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE ma.id_matt_ass = $1',
				values: [id_matt_ass]
			} 
			let { rows: mattAssData } = await querySync(sql);
			
			sql ={
				text: 'SELECT teacher FROM classes WHERE code_class = $1 AND teacher = $2',
				values: [mattAssData[0]?.class, req.user?.user_id]
			} 
			let { rows: classData } = await querySync(sql);
			let subjectMattAss = subject('Matt_ass', {user_id: classData[0]?.teacher})
			
			//teacher authorize
			if(!policy.can('readsingle', subjectMattAss)){
				
				let sql_get_student = {
					text: 'SELECT "user" FROM students WHERE class = $1 AND "user" = $2' ,
					values: [mattAssData[0]?.class, req.user?.user_id]
				}
				const { rows: studentData } = await querySync(sql_get_student);
				subjectMattAss = subject('Matt_ass', {user_id: studentData[0]?.user})
				
				//student authorize
				if(!policy.can('readsingle', subjectMattAss)){
					return res.json({
						error: 1,
						message: 'You have no access to read this data'
					})
				}
			}
			
			let singleReadSql = {
				text: 'SELECT * FROM matt_ass WHERE id_matt_ass = $1',
				values: [id_matt_ass]
			}
			let { rows: singleData } = await querySync(singleReadSql);
			
			return res.json({
				data: singleData
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async addMattAss(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Matt_ass')){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				message: 'You have no access to create a assignment'
			})
		}
		
		const errInsert = validationResult(req);
		let { duration, text, id_matt, title } = req.body;
		let attachment = []
		if(req.file){
			attachment[0] = req.file.filename
			attachment[1] = req.file.originalname
		}
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		attachment = attachment.length ? JSON.stringify(attachment).replace(/\[/g,'{').replace(/\]/g,'}'): undefined;
		
		const query = {
			text: 'INSERT INTO matt_ass(duration, text, attachment, id_matt) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [ duration, text, attachment, id_matt, title ]
		}
		
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			removeFiles([req.file]);
			
			next(err)
		}
	},
	/*-----------------edit-------------------------*/
	async deleteMattAss(req, res, next){
		
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass);
			let sql ={
				text: 'SELECT teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass = $1 AND c.teacher = $2',
				values: [id_matt_ass, req.user?.user_id]
			} 
			
			let { rows: mattAssData } = await querySync(sql);
			
			let policy = policyFor(req.user);
			let subjectMattAss = subject('Matt_ass', {user_id: mattAssData[0]?.teacher})
			
			if(!policy.can('delete', subjectMattAss)){
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM matt_ass WHERE id_matt_ass = $1 RETURNING *',
				values: [id_matt_ass]
			}
			let resultDeleting = await querySync(deleteSql);
			
			if(resultDeleting.rowCount) {
				let filePath = {
					path: path.join(config.rootPath,`public/document/${resultDeleting.rows[0]?.attachment[0]}`)
				}
				
				removeFiles([filePath]);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDeleting.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
}