const { querySync } = require('../../database');
const policyFor = require('../policy')
const { subject } = require('@casl/ability')

module.exports = {
	
	async getSingle (req, res, next){
		
		const user_id = parseInt(req.params.user_id)
		const policy = policyFor(req.user)
		const subjectUser = subject('User', { user_id })
	
		if(!policy.can('readsingle', subjectUser)){
			return res.json({
				error: 1,
				message: "You aren't allow to read this data"
			})
		}
		
		try{
			const sql_get_user = {
				text: 'SELECT user_id, name, email, gender, photo FROM users WHERE user_id = $1',
				values : [user_id]
			}
		
			const result = await querySync(sql_get_user)
			
			return res.json(result.rows[0])
		}catch(err){
			console.log(err)
			next(err)
		}
		
	}
}