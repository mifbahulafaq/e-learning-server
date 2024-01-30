const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const sqlUpdate = require('../utils/sqlUpdate');
const config = require('../../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		const code_class = parseInt(req.params.code_class);
		const policy = policyFor(req.user)
		
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
			
			//filter
			let qs = req.query;
			let filterString = "";
			let filterArray = [];
			const isDate = date=>isNaN((new Date(date)).getDate())
			
			if(parseInt(qs.cs)) delete qs.latest //cs (coming soon)
			if(!isDate(qs.schedule)){
				
				qs = { schedule: qs.schedule }
				filterString = 'AND m.schedule = $2'
				filterArray.push(qs.schedule)
				
			}
			if(!isDate(qs.date) && isDate(qs.schedule)){
				
				const date = new Date(qs.date)
				const locale = "en-CA"
				const opt = {dateStyle:"short"};
				
				//make the date to be a day
				filterString = "AND m.schedule >= $2 AND m.schedule < $3"
				filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
				date.setDate(date.getDate() + 1)
				filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
				
			}
			
			const csSql = 'AND schedule > NOW() ORDER BY schedule ASC LIMIT 1'
			const latestSql = `
				ORDER BY
				CASE WHEN schedule < NOW() THEN CAST(CEIL(EXTRACT(EPOCH FROM NOW())) || '0' AS NUMERIC) - CEIL(EXTRACT(EPOCH FROM schedule))
					
					 ELSE CEIL(EXTRACT(EPOCH FROM schedule))
				END
				ASC`
			const query = {
				text: `SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM matter_discussions md WHERE md.matt = m.id_matter) total_comments
				FROM matters m 
				INNER JOIN classes c ON m.class=c.code_class 
				INNER JOIN users t ON c.teacher = t.user_id 
				WHERE m.class = $1 ${filterString} ${parseInt(qs.cs)? csSql: ''} ${parseInt(qs.latest)?latestSql:''}`,
				values: [code_class || undefined, ...filterArray]
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
		
		const { body, params, files } = req;
		
		try{
			const id_matt = parseInt(params.id_matt);
			
			let sql ={
				text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class = c.code_class  WHERE id_matter=$1',
				values: [id_matt || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Matter', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('update', subjectMatter)){
				
				removeFiles(files);
				
				return res.json({
					error: 1,
					message: 'You have no access to edit this data'
				})
			}
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				removeFiles(files);
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			//get single data for deleting the attachment
			let getSql = {
				text: 'SELECT attachment FROM matters WHERE id_matter=$1',
				values: [ id_matt ]
			}
			let { rows: singleMatter } = await querySync(getSql);
			singleMatter = singleMatter[0];
			
			let { attachment, ...data } = body;
			
			body.attachment = body.attachment || [];
			
			data.attachment = [...body.attachment, ...files].map(e=>[e.filename, e.originalname]);
			data.attachment = data.attachment.length ? JSON.stringify(data.attachment).replace(/\[/g,'{').replace(/\]/g,'}'): null;
			
			//updating data..
			const updatingSql = sqlUpdate({id_matter: id_matt}, 'matters', data);
			let resultUpdate = await querySync(updatingSql);
			
			//finding what to remove..
			body.attachment = body.attachment.map(e=>e.filename);
			singleMatter.attachment = singleMatter?.attachment?.filter(e=>!body.attachment.includes(e[0]));
			
			if(resultUpdate.rowCount && singleMatter.attachment){

				let removedFiles = singleMatter?.attachment.map(e=>({path: path.join(config.rootPath,`public/document/${e[0]}`)}));
				removeFiles(removedFiles)
				
			}
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
			removeFiles(files);
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
	},
	async tester(req, res, next){
		
		return res.end()
	}
}