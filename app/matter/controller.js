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
	async getByClass(req, res, next){
		const code_class = parseInt(req.params.code_class);
		const policy = policyFor(req.user)
		
		//filter
		let { latest, date } = req.query;
		let filterDateString = "";
		let filterDateArray = [];
		
		if(!isNaN((new Date(date)).getDate())){
			
			date = new Date(date)
			const locale = "en-CA"
			const opt = {dateStyle:"short"};
			
			filterDateString = "AND m.schedule >= $2 AND m.schedule < $3"
			filterDateArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
			date.setDate(date.getDate() + 1)
			filterDateArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
			
		}
		
		try{
			
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
			
			const query = {
				text: `SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM matter_discussions md WHERE md.matt = m.id_matter) total_comments
				FROM matters m 
				INNER JOIN classes c ON m.class=c.code_class 
				INNER JOIN users t ON c.teacher = t.user_id 
				WHERE m.class = $1 ${filterDateString} ${parseInt(latest)?'ORDER BY id_matter DESC':''}`,
				values: [code_class || undefined, ...filterDateArray]
			}
			
			const { rows: matterData } = await querySync(query);
			res.json({data: matterData})
			
		}catch(err){
			console.log(err)
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const id_matt = parseInt(req.params.id_matt);
		try{
			//get the main data and authorize
			const query = {
				text: 'SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM matters m INNER JOIN classes c ON m.class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_matter = $1',
				values: [id_matt || undefined]
			}
			const { rows: matterData } = await querySync(query);
			//authorize
			let sqlGetStudent = {
				text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
				values: [matterData[0]?.class, req.user?.user_id]
			}
			const { rows: studentData} = await querySync(sqlGetStudent);
			
			const policy = policyFor(req.user);
			const subjectMatter = subject('Matter',{user_id: matterData[0]?.teacher});
			const subjectMatter2 = subject('Matter',{user_id: studentData[0]?.user});
			
			if(!policy.can('readsingle',subjectMatter)){
				if(!policy.can('readsingle',subjectMatter2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this data"
					})
				}
			}
			res.json({data: matterData})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------get attachment-------------------------*/
	async getAttachment(req, res, next){
		
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
					text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
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
	async create(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Matter')){
			
			removeFiles(req.files);
			
			return res.json({
				error: 1,
				message: 'You have no access to create a matter'
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
	async edit(req, res, next){
		
		try{
			const id_matt = parseInt(req.params.id_matt);
			let sql ={
				text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class = c.code_class  WHERE id_matter=$1',
				values: [id_matt || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Matter', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('update', subjectMatter)){
				
				removeFiles(req.files);
				
				return res.json({
					error: 1,
					message: 'You have no access to edit this data'
				})
			}
			
			const errInsert = validationResult(req);
			let { schedule, name, duration, description, code_class, status } = req.body;
			let attachment = req.files.map(e=>e.filename);
			
			if(!errInsert.isEmpty()){
				removeFiles(req.files);
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			attachment = attachment.length ? JSON.stringify(attachment).replace('[','{').replace(']','}'): undefined;
			
			//get single data for deleting the attachment
			let getSql = {
				text: 'SELECT attachment FROM matters WHERE id_matter=$1',
				values: [ id_matt ]
			}
			let { rows : getSingle } = await querySync(getSql);
			let removedAttachments = getSingle[0].attachment;
			
			//updating the data
			let updateSql = {
				text: 'UPDATE matters SET schedule = $1, name = $2, duration = $3, description = $4, attachment = $5, class = $6, status = $7 WHERE id_matter=$8 RETURNING *',
				values: [ schedule, name, duration, description, attachment, code_class, status, id_matt]
			}
			let resultUpdate = await querySync(updateSql);
			
			if(resultUpdate.rowCount && removedAttachments){
				let removedFiles = removedAttachments.map(e=>({path: path.join(config.rootPath,`public/document/${e[0]}`)}));
				removeFiles(removedFiles)
			}
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
			removeFiles(req.files);
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
				let removedFiles = resultDelete.rows[0]?.attachment.map(e=>({path: path.join(config.rootPath,`public/document/${e[0]}`)}));
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