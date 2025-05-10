const classService = require('../class/service');
const matterService = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			
			//authorizing..
			await classService.teacherAuthor(req, async (code_class, teacherData, err)=>{
				
				try{
				
					if(err) await classService.studentAuthor(code_class, req);
					
					//get matter data by class
					const { rows: matterData } = await matterService.findByClass(req.query, code_class);
					
					//response
					res.json({data: matterData})
					
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
					
			const id_matt = parseInt(req.params.id_matt) || undefined;
			
			//authorizing...
			await matterService.teacherAuthor(id_matt, req, async (teacherData, err)=>{
				
				try{
				
					if(err) await matterService.studentAuthor(id_matt, req);
					
					//getting single matter...
					
					const result = await matterService.getSingle(id_matt);
						
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
	
	/*-----------------get attachment-------------------------*/
	async getAttachment(req, res, next){
		
		try{
			
			const id_matt = parseInt(req.params.id_matt) || undefined;
			
			//authorizing...
			await matterService.teacherAuthor(req, async (id_matt, teacherData, err)=>{
				
				try{
					
					if(err) await matterService.studentAuthor(id_matt, req);
					
					//getting the path of single attachment...
					const path = await matterService.getSingleAttachment(req.user.user_id, id_matt, req.params.filename)
					
					res.json({ path })
					
				}catch(err){
					
					next(err)
					
				}
				
			});
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async add(req, res, next){
		
		try{
			
			//adding new data...
			const result = await matterService.create(req, {body, files});
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async edit(req, res, next){
		
		try{
			
			const { params, body, files } = req;
			
			const id_matter = parseInt(params.id_matt) || undefined;
			const alldatas = { body, files }
			
			//authorizing...
			await matterService.teacherAuthor(id_matter, req);
			
			//updating....
			const resultUpdate = await matterService.update(req, id_matter, alldatas);
			
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
			const id_matt = parseInt(req.params.id_matt) || undefined;
			
			//authorizing...
			 await matterService.teacherAuthor(id_matt, req);
			
			//deleting..
			const resultDelete = await matterService.deleteSingle(id_matt);
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			next(err)
		}
	}
}