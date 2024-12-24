const policyFor = require('../policy')
const { subject } = require('@casl/ability');
const appError = require('../utils/appError')

module.exports = {
	
	authorization(can){
		
		return function (req, res, next){
			
			const user_id = parseInt(req.params.user_id) || undefined
			const policy = policyFor(req.user)
			const FileDatas = req.file? [req.file]: req.files 
		
			const subjectUser = subject('User', { user_id })
			
			if(!policy.can(can, subjectUser)) throw appError("You aren't allow to read this data", 200)
			
			next()
		}
	}
	
}