const examServices = require('./service');
const classServices = require('../class/service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			let isTeacher = true;
			
			//teacher authorizing..
			await classServices.teacherAuthor(code_class, req, async (teacherData, err)=>{
				
				try{
				
					if(err){
						//student authorizing
						await classServices.studentAuthor(code_class, req);
						isTeacher = false;
					}
					
					//get matter data by class
					const { rows: examData } = await examServices.getByClass(req, isTeacher);
					
					//response
					res.json({data: examData})
					
				}catch(err){
					
					next(err)
					
				}
				
			});
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		try{
					
			const id_exm = parseInt(req.params.id_exm) || undefined;
			let isTeacher = true;
			
			//authorizing...
			await examServices.teacherAuthor(id_exm, req, async (teacherData, err)=>{
				
				try{
				
					if(err){
						
						isTeacher = false;
						await examServices.studentAuthor(id_exm, req);
						
					}
					
					//getting single matter...
					
					const result = await examServices.getSingle(id_exm);
						
					res.json({
						data: result.rows
					})
				}catch(err){
					
					next(err)
					
				}
				
				
			});
			
		}catch(err){
			
			next(err)
			
		}
	},
	
	async getAttachment(req, res, next){
		
		try{
			
			const path = await examServices.getSingleAttachment(req)
			
			res.json({ path })
			
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async create(req, res, next){
		
		try{
			
			const result = await examServices.insert(req);
			
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async put(req, res, next){
		try{
			
			const id_exm = parseInt(req.params.id_exm) || undefined;
			
			//teacher authorizing..
			await examServices.teacherAuthor(id_exm, req);
			
			//updating..
			const resultUpdate = await examServices.update(id_exm, req)
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
			next(err)
		}
	},	
	/*-----------------remove-------------------------*/
	async remove(req, res, next){
		
		try{
			const id_exm = parseInt(req.params.id_exm)|| undefined;
			
			//teacher authorizing..
			await examServices.teacherAuthor(id_exm, req);
			
			const resultDelete = await examServices.remove(id_exm)
			
			res.json({
				message: 'The exam data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			next(err)
		}
	}
}