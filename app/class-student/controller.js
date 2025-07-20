const { querySync } = require('../../services/query');

const service = require('./service');
const classService = require('../class/service');

module.exports = {
	/*-----------------get-------------------------*/
	async getStudents(req, res, next){
		
		try{
			
			const result = await service.get(req.user?.user_id);
			
			res.json({data: result.rows})
			
		}catch(err){
			
			next(err);
		}
	},
	/*-----------------getByClass-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			let isTeacher = true;
			
			//checking teacher authorization..
			const teacherData = await classService.teacherAuthor(code_class, req);
			
			if(!teacherData.teacher){
				
				//checking student authorization..
				await classService.studentAuthor(code_class, req)
				isTeacher = false;
				
			}
			
			let result = await service.getByClass(req, isTeacher);
			
			res.json({data: result.rows})
			
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
	async add(req, res, next){
		
		try{
			
			// return res.send('joining test')
			
			const result = await service.add(req)
			
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------join class-------------------------*/
	async unenroll(req, res, next){
			
		try{
			
			const id_class_student = parseInt(req.params.id_class_student) || undefined
			
			//checking teacher authorization..
			const teacherData = await service.teacherAuthor(id_class_student, req);
			
			if(!teacherData.teacher){
				
				//checking student authorization..
				await service.studentAuthor(id_class_student, req)
				
			}
			
			await service.unenroll(id_class_student);
			
			res.json({
				message: "Unenrolling successfully"
			})
			
		}catch(err){
			next(err);
		}
	},
	
}