const { querySync } = require('../../services/query');
const users = require('../../services/table')('users');
const path = require('path')
const config = require('../../config')
const { removeFiles } = require('../../services/file')
const appError = require('../utils/appError')

module.exports = {
	
	insertUser(data, obj = { } ){
		
		return users.insert(data)
		
	},
	
	async findUser(where){
		return users.find(where).execute()
	},
	
	async updatePass(new_password, user_id){
		
		return users.update({ password: new_password}, {user_id}).execute()
			
	},
	
	async updateUser(where, data){
		
		try{
			//get single data to delete photo
			
			let userPhoto;
			
			if(data.photo){
				
				const { rows: userData } = await this.findUser(where)
				userPhoto = userData[0]?.photo || undefined
				
			}
			
			//updating
			const sql = sqlUpdate(where, 'users', data)
				
			const resultUpdate = await querySync(sql)
			
			if(resultUpdate.rowCount){
				if(userPhoto){
					userPhoto = [{ path: path.join(config.rootPath, `public/photo/${userPhoto}`)}]
					removeFiles(userPhoto)
				}
			}
				
			return resultUpdate
			
		}catch(err){
			
			if(data.photo) removeFiles([{ path: path.join(config.rootPath, `public/photo/${data.photo}`)}]);
			
			throw err;
		}
	}
	
}