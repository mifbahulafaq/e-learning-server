const service = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async get(req, res, next){
		
		try{
			
			//getting classes
			const result = await service.get(req.user?.user_id)
			
			return res.json({
				data: result.rows,
				count: result.rowCount
			})
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			
			//authorizing..
			await service.teacherAuthor(code_class, req, async (teacherData, err)=>{
				
				try{
				
					if(err) await service.studentAuthor(code_class, req);
					
					//getting single class..
					const resultClass = await service.getSingle(code_class);
				
					return res.json({ data: resultClass.rows[0]});
					
				}catch(err){
					
					next(err)
					
				}
				
			});
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------delete-------------------------*/
	async delete(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			
			//authorizing..
			await service.teacherAuthor(code_class, req);
			
			//deleting data..
			const result = await service.deleteSingle(code_class)
				
			return res.json({
				message: 'Class data is successfully deleted',
				data: result.rows[0]
			})
			
		}catch(err){
			
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async add(req, res, next){
		
		try{
			
			//adding class..
			const result = await service.add(req);
			
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
			
			const code_class = req.params.code_class || undefined;
			
			//authorizing..
			await service.teacherAuthor(code_class, req);
			
			//updating data...
			const result = await service.editSingle(req, code_class);
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err)
		}
		
	}
}