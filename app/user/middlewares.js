const policyFor = require('../policy')
const { subject } = require('@casl/ability')
const removeFiles = require('../utils/removeFiles')

module.exports = {
	
	authorization(can){
		
		return function (req, res, next){
			
			const user_id = parseInt(req.params.user_id) || undefined
			const policy = policyFor(req.user)
			const FileDatas = req.file? [req.file]: req.files 
		
			const subjectUser = subject('User', { user_id })
			
			if(!policy.can(can, subjectUser)){
				
				removeFiles(FileDatas)
				return res.json({
					error: 1,
					message: "You aren't allow to read this data"
				})
			}
			
			next()
		}
	}
	
}