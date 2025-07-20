const classService = require('../class/service');
const service = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async get(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			const code_class = parseInt(req.params.code_class) || undefined;
			
			//teacher authorizing...
			await classService.teacherAuthor(code_class, req,  async (teacherData, err)=>{
				
				try{
					
					//student authorizing..
					if(err) await classService.studentAuthor(code_class, req);
					
					const result = await service.findByClass(code_class);
					
					res.json({data: result.rows})
					
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
	async add(req, res, next){
		
		try{
			
			const result = await service.create(req);
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
}