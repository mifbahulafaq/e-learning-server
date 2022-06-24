const multer = require('multer');


function mdd(upload){
	return function(req, res, next){
		upload(req,res,(err)=>{
			
			if(err instanceof multer.MulterError || err && err.name === 'MulterError'){
				return res.json({
					error: 1,
					field:{
						[err.field]:{
							message: err.message
						}
					}						
				})	
			}
			if(err) return next(err);
			next()
		})
	}
}

function obj(multer){
	return {
		none: ()=>multer.none(),
		single : (field)=>mdd(multer.single(field))
	}
}

module.exports = function(config){
	
	return obj(multer(config));
} 