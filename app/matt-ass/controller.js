const mattAssService = require('./service');
const mattService = require('../matter/service');

module.exports = {
	/*-----------------get-------------------------*/
	async get(req, res, next){
		
		try{
			
			//getting data..
			const result = await mattAssService.get(req.query, req.user.user_id);
			
			//response
			res.json(result)
			
		}catch(err){
			next(err);
		}
		
	},
	/*-----------------get by matter-------------------------*/
	async getByMatter(req, res, next){
		
		try{
			
			let authorName = 'teacher';
			const id_matt = req.params.id_matt || undefined;
			
			//teacher authorizing...
			await mattService.teacherAuthor(id_matt, req, async (teacherData, err)=>{
				
				try{
					
					let id_class_student;
					
					if(err){
						
						authorName = 'student'
							
						const studentData = await mattService.studentAuthor(id_matt, req);
						
						id_class_student = studentData[0]?.id_class_student;
					}
					
					//getting data
					const { rows: mattAssData } = await mattAssService.findByMatter(req, authorName == 'teacher', id_class_student);
					
					res.json({
						data: mattAssData
					})
					
				}catch(err){
					next(err)
				}
				
			});
			
		}catch(err){
			
			next(err);
		}
		
	},
	
	
	
	async getAttachment(req, res, next){
		
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			
			//authorizing..
			await mattAssService.teacherAuthor(id_matt_ass, req, async (teacherData, err)=>{
				
				try{
					
					if(err) await mattAssService.studentAuthor(id_matt_ass, req);
					
					//getting data
					const path = await mattAssService.getSingleAttachment(req)
					
					res.json({ path })
					
				}catch(err){
					
					next(err)
					
				}
					
			})
		}catch(err){
			next(err)
		}
		
	},
	async getSingle(req, res, next){
	
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			let isTeacher = true;
			
			//authorizing..
			await mattAssService.teacherAuthor(id_matt_ass, req, async (teacherData, err)=>{
				
				try{
					
					isTeacher = false;
					
					if(err) await mattAssService.studentAuthor(id_matt_ass, req);
					
					//getting data
					let data = await mattAssService.getSingle(req, isTeacher);
						
					res.json({
						data
					})
					
				}catch(err){
					next(err)
				}
			})
			
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async add(req, res, next){
		
		try{
			
			// let policy = policyFor(req.user);
		
			// if(!policy.can('create', 'Matt_ass')) throw appError('You have no access to create a assignment', 200);
			
			const result = await service.create(req);
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err)
		}
	},
	/*-----------------edit-------------------------*/
	async delete(req, res, next){
		
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass);
			
			//authorizing..
			await mattAssService.teacherAuthor(id_matt_ass, req);
			
			//deleting...
			let resultDeleting = await mattAssService.delete(id_matt_ass)
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDeleting.rows
			})
			
		}catch(err){
			next(err)
		}
	}
}