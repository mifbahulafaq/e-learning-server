module.exports = (field)=>{
	return (req, res, next)=>{
	
		if(req.file){
			req.body[field] = req.file
		}else if(req.files){
			req.body[field] = req.files
		}
		
		next()
	}
}