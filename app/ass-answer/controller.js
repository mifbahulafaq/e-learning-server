const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');
const config = require('../../config');
const fs = require('fs');

const { querySync } = require('../../services/query');
const matt_ass = require('../../services/table')('matt_ass');

const assService = require('../matt-ass/service');
const assAnsService = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByAss(req, res, next){
		
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			let teacher = true;
			
			await assService.teacherAuthor(id_matt_ass, req, async (teacherData, err)=>{
				
				try{
					
					if(err) await assService.studentAuthor(id_matt_ass, req);
					
					teacher = false;
					
				}catch(err){
					next(err)
				}
				
			})
		
			const { rows } = await assAnsService.getByAss(req, teacher)
			res.json({data: rows})
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		res.json({data: req.data});
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		try{
			
			const insertData = await assAnsService.add(req);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
			next(err)
		}
	},
	/*-----------------remove-------------------------*/
	/*async remove(req, res, next){
		
		try{
			const id_exm = parseInt(req.params.id_exm);
			let sql ={
				text: 'SELECT c.teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)){
				
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM Exams WHERE id_exm=$1 RETURNING *',
				values: [id_exm || undefined]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
	*/
	async getAttachment(req, res, next){
		
		try{
			
			await searchFileOfArrays(req.data?.[0]?.content, req.params.filename)
			
			res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
			
		}catch(err){
			next(err)
		}
		
	}
}