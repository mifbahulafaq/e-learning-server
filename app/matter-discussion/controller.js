const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

const discussService = require('./service');
const mattService = require('../matter/service');


module.exports = {
	/*-----------------get-------------------------*/
	async getMattDiscuss(req, res, next){
		
		try{
			
			const id_matt = req.params.id_matt || undefined;
			let isTeacher = true;
			
			//teacher authorizing...
			await mattService.teacherAuthor(id_matt, req, async (teacherData, err)=>{
				
				try{
					
					if(err){
						
						isTeacher = false;
						await mattService.studentAuthor(id_matt, req);
						
					}
					
					const result = await discussService.get(id_matt, isTeacher);
					//the result of it is [] of data
					res.json({data: result })
					
				}catch(err){
					next(err)
				}
			})
			
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------delete-------------------------*/
	/*async deleteClass(req, res, next){
		
		const get = {
			text: 'SELECT user_id FROM classes WHERE code_class = $1',
			values: [req.params.code_class]
		}
		
		try{
			
			let result = await querySync(get);
			
			const policy = policyFor(req.user);
			const subjectClass = subject('Class', {user_id: result.rows[0]?.user_id});
			
			if(!policy.can('delete', subjectClass)){
				return res.json({
					error: 1,
					message: "You can't delete this data"
				})
			}
			
			const remove = {
				text: 'DELETE FROM classes WHERE code_class = $1 RETURNING *',
				values: [req.params.code_class]
			}
			
			result = await querySync(remove);
			return res.json({
				message: 'Data is successfully deleted',
				data: result.rows[0]
			})
			
		}catch(err){
			next(err);
		}
		
	},*/
	
	/*-----------------add-------------------------*/
	async addMattDiscuss(req, res, next){
		
		try{
			
			const result = await discussService.add(req);
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			
			next(err)
		}
	},
	
}