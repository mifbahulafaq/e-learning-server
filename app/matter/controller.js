const classService = require('../class/service');
const matterService = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			const author = classService.singleAuthor(code_class, req.user);
			
			//authorizing..
			author.teacher(async (data, err)=>{
				
				if(err){
					try{
						
						await author.student();
						
					}catch(err){
						return next(err)
					}
				}
				
				//get matter data by class
				const { rows: matterData } = await matterService.findByClass(req.query, code_class);
				
				//response
				res.json({data: matterData})
				
			});
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		try{
		
			const id_matt = parseInt(req.params.id_matt) || undefined;
			const author = matterService.singleAuthor(id_matt, req.user);
			
			//authorizing...
			author.teacher(async (data, err)=>{
				
				if(err){
					
					try{
						
						await author.student();
						
					}catch(err){
					
						return next(err);
					}
					
				}
				
				//getting single matter...
				const result = await matterService.getSingle(id_matt);
					
				res.json({
					data: result.rows
				})
				
				
			});
			
		}catch(err){
			next(err)
		}
		
		
	},
	
	/*-----------------get attachment-------------------------*/
	async getAttachment(req, res, next){
		
		try{
			
			const id_matt = parseInt(req.params.id_matt) || undefined;
			const author = matterService.singleAuthor(id_matt, req.user);
			
			//authorizing...
			author.teacher(async (data, err)=>{
				
				if(err){
				
					try{
						await author.student();
					}catch(err){
						return next(err)
					}
				
				}
				
				
				//getting the path of single attachment...
				const path = await matterService.getSingleAttachment(req.user.user_id, id_matt, req.params.filename)
				
				res.json({ path })
				
			});
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async add(req, res, next){
		
		try{
			
			//authorizing...
			matterService.additionAuthor(req.user);
	
			const { body, files } = req;
			
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
			
			const { user, params, body, files } = req;
			
			const id_matter = parseInt(params.id_matt) || undefined;
			const author = matterService.singleAuthor(id_matter, user);
			const alldatas = { body, files }
			
			//authorizing...
			await author.teacher();
			
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
			const author = matterService.singleAuthor(id_matt, req.user);
			
			//authorizing...
			 await author.teacher();
			
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