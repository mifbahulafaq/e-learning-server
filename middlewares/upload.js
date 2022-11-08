const multer = require('multer');
const path = require('path');


function mdd(upload){
	return function(req, res, next){
		upload(req,res,(err)=>{
			console.log(err)
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
		single : (field)=>mdd(multer.single(field)),
		array :(field)=>mdd(multer.array(field))
	}
}

module.exports = function(config){
	
	const storage = multer.diskStorage({
		destination: function(req, file, cb){
			cb(null, config.dest);
		},
		filename: function(req, file, cb){
			
			let ext = file.originalname.split('.')
			[file.originalname.split('.').length - 1];
			
			let randName = Date.now()+ Math.round(Math.random()*1E9)+'.'+ext;
			
			cb(null, file.fieldname+'-'+randName)
		}
	})

	const fileFilter = function(req, file, cb){
		const file2 = path.extname(file.originalname).toLocaleLowerCase();
		
		if(config.ext.indexOf(file2) == -1){
			
			const err = new Error(`The format isn't support`);
			err.name = "MulterError";
			err.field = file.fieldname;
			
			return cb(err);
		}
		cb(null,true);
	}
	
	return obj(multer({
		storage,
		limits: {fileSize : config.size},
		fileFilter
	}));
} 