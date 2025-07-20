const config = require('../../config');
const fs = require('fs');
const path = require('path');
const appError = require('../utils/appError');

module.exports = function(arrFiles, fileName){
	
	/*
		arrFile format example:
		[
			[decodedName.docx,"originalname.docx"]
		]
		if not error will be thrown
	*/
	
	return new Promise((resolve, reject)=>{
		
		const err = appError('File not found', 200);
		
		if(!arrFiles?.length) {
			reject(err)
			return;
		}
		
		let tempFileName;
		
		arrFiles.forEach(function(file){
			if(file[0] === fileName) tempFileName = fileName;
		})
		
		const filePath = path.join(config.rootPath, `public/document/${tempFileName}`);
			
		if(fs.existsSync(filePath)){
			resolve(tempFileName);
		}else{
			reject(err);
		}
	})
	
	
}