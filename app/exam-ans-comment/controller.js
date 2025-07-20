const service = require('./service');
const ansService = require('../exam-answer/service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByAns(req, res, next){
		
		try{
			
			//teacher authorization
			const id_exm_ans = parseInt(req.params.id_exm_ans) || undefined;
			
			await ansService.teacherAuthor(id_exm_ans, req, async (teacherData, err)=>{
				
				try{
					//student authorization
					if(err) await ansService.studentAuthor(id_exm_ans, req);
					
					const result = await service.getByAns(id_exm_ans)
					
					res.json({data: result.rows});
					
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
			
			const result = await service.add(req);
			
			res.json({
				data: result.rows
			})
		}catch(err){
			console.log(err)
			next(err)
		}
	},
	
}