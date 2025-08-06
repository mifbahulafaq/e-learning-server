const classService = require('../class/service');
const service = require('./service');
const validateBody = require('../utils/validateBody');

module.exports = {
	
	async createSchedule(req, res, next){
		
		try{
			
			const result = await service.add(req);
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err);
		}
	},
	
	async readSchedules(req, res, next){
		
		try{
			
			const code_class = parseInt(req.params.code_class) || undefined;
			
			//authorizing..
			await classService.teacherAuthor(code_class, req);
			
			const result = await service.get(req);
			
			res.json({data: result.rows});
			
		}catch(err){
			next(err)
		}
	}
	
}