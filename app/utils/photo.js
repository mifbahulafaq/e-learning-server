const multer = require('multer');
const path = require('path');
const config = require('../config');

const storage = multer.diskStorage({
	destination: function(req, file, cb){
		const pathTarget = path.join(config.rootPath,`public/photo`);
		cb(null, pathTarget);
	},
	filename: function(req, file, cb){
		
        let ext = file.originalname.split('.')
        [file.originalname.split('.').length - 1];
		
        let randName = Date.now()+ Math.round(Math.random()*1E9)+'.'+ext;
		
		cb(null, file.fieldname+'-'+randName)
	}
})

const fileFilter = function(req, file, cb){
    const ext = ['.jpg','.png','.jpeg'];
    const file2 = path.extname(file.originalname).toLocaleLowerCase();
	
    if(ext.indexOf(file2) == -1){
		
		const err = new Error(`What you uploaded is not an image`);
		err.name = "MulterError";
		err.field = "photo";
		
        return cb(err);
    }
    cb(null,true);
}

module.exports = {
	storage,
    limits: {fileSize : config.imageSize},
	fileFilter
}