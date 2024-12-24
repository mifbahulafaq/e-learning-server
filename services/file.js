const { querySync } = require('./query');
const table = require('./table');
const path = require('path');
const config = require('../config');
const fs = require('fs');
const appError = require('../app/utils/appError');

module.exports = {
	removeFiles(files){
	
		//files format example;
		// [
		  // {
			// path: 'F:\\Tugas\\Mifbahul Afaq\\Tugas\\WEB DEVELOP\\MY APP\\APP\\E-Learning\\SINAUBARENG-SERVER\\public\\document\\new_attachment-1717527209887.pdf'
		  // }
		// ]
		
		let allPaths = [];
		
		
		if(Array.isArray(files)){
			
			for(let i = 0; i < files.length; i++){
				
				const path = files[i].path;
				
				if( path && fs.existsSync(path)){
					
					fs.unlinkSync(path);
					allPaths.push(path);
					
				}else{
					break;
				}
			}
		}
		
		return allPaths;
	},
	
	async notExistAndRemove(tableName, where = {}, files = []){
		/*
		description/documentation: 
			find attachments based on tableName and where, then if exist, search for the each name of attachments in files.
			if the name doesn't exist, remove the file of the name
			
			parameter type examples:
			tableName = 'tableName name'
			where = {column_name of tableName: value} //{id_matter: 10}
			files = [filename, filename]
		
		*/
		
		//get single data for deleting the attachment
		
		const tb = table(tableName);
		
		let { rows } = await tb.find(where).execute();
		rows = rows[0];
		
		// remove if the files don't exist
		if(rows){
			
			let removedFiles = [];
			let existingFiles = [];
			
			rows.attachment = rows.attachment || [];
			
			for(let i = 0; i < rows.attachment.length; i++){
				
				const item = rows.attachment[i];
				
				if(Array.isArray(item)){
					if(files.includes(item[0])){
						existingFiles.push({path: path.join(config.rootPath,`public/document/${item[0]}`)});
					}else{
						removedFiles.push({path: path.join(config.rootPath,`public/document/${item[0]}`)});
					}
				}else{
					console.log('removing single attachment')
					if(!files.includes(item)) removedFiles.push({path: path.join(config.rootPath,`public/document/${item}`)})
					break;
				}
					
			}
			
			if(existingFiles.length !== files.length) throw appError('No data match those files');
			
			if(removedFiles.length){
				
				try{
					this.removeFiles(removedFiles);
				}catch(err){
					if(err.message == "Path not found") return removedFiles;
				}
				
				return removedFiles;
			}
		}

		return [];
		
	},
	
}