const { querySync } = require('../../database')
const path = require('path')
const config = require('../../config')
const sqlUpdate = require('../utils/sqlUpdate')
const removeFiles = require('../utils/removeFiles')


module.exports = {
	
	async getUserById(id){
		
		try{
			const sql_get_user = {
				text: 'SELECT user_id, name, email, gender, photo FROM users WHERE user_id = $1',
				values : [id]
			}
		
			const result = await querySync(sql_get_user)
			return result.rows[0]
			
		}catch(err){

			throw new Error(err)
			
		}
	},
	
	async updatePass(new_password, user_id){
		const sql_updatePwd = {
				text: "UPDATE users SET password = $1 WHERE user_id = $2",
				values: [new_password, user_id]
			}
		
		try{
			return await querySync(sql_updatePwd)
		}catch(err){
			throw new Error(err)
		}
	},
	
	async updateUser(where, data){
		
		try{
			//get single data to delete photo
			
			const sqlGetPhoto = {
				text: "SELECT photo FROM users WHERE user_id = $1",
				values: [where.user_id]
			}
			const {rows: userData } = await querySync(sqlGetPhoto)
			let userPhoto = userData[0]?.photo || undefined
			
			//updating
			const sql = sqlUpdate(where, 'users', data)
			
			try{
				
				const resultUpdate = await querySync(sql)
				
				if(resultUpdate.rowCount && data.photo){
					if(userPhoto){
						userPhoto = [{ path: path.join(config.rootPath, `public/photo/${userPhoto}`)}]
						removeFiles(userPhoto)
					}
				}
				
				const { password, token, ...remains} = resultUpdate.rows[0]
				return remains
				
			}catch(err){
				
				removeFiles([{ path: path.join(config.rootPath, `public/photo/${data.photo}`)}])
				throw new Error(err)
			}
			
		}catch(err){
			throw new Error(err)
		}
	}
	
}