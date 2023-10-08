const { querySync } = require('../../database')
const path = require('path')
const config = require('../../config')
const sqlUpdate = require('../utils/sqlUpdate')
const sqlGet = require('../utils/sqlGet')
const removeFiles = require('../utils/removeFiles')
const appError = require('../utils/appError')


module.exports = {
	
	async insertUser(data, obj = { } ){
		
		const keysOfData = Object.keys(data)
		
		if(!keysOfData.length) throw appError('No data sent')
		
		const sqlColumn = keysOfData.join(",")
		const sqlValues = keysOfData.map((e,i)=>`$${i+1}`)
		const valArr = keysOfData.map((e,i)=>data[e])
		
		const returning = obj?.return? 'returning *': '';
		
		 let sql_createUser = {
			 text: `INSERT INTO users(${sqlColumn}) VALUES(${sqlValues}) ${returning}`,
			 values: valArr
		 }
		 
		 try{
			
			 return await querySync(sql_createUser)

		 }catch(err){
			 throw err
		 }
	},
	
	async findUser(where){
		try{
			
			const sql = sqlGet("users", where)
			return await querySync(sql)
			
		}catch(err){
			throw err
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
			throw err
		}
	},
	
	async updateUser(where, data){
		
		try{
			//get single data to delete photo
			
			let userPhoto;
			
			if(data.photo){

				const sqlGetPhoto = {
					text: "SELECT photo FROM users WHERE user_id = $1",
					values: [where.user_id]
				}
				const {rows: userData } = await querySync(sqlGetPhoto)
				let userPhoto = userData[0]?.photo || undefined
				
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
				
			const { password, token, ...remains} = resultUpdate.rows[0]
			return remains
			
		}catch(err){
			
			if(data.photo) removeFiles([{ path: path.join(config.rootPath, `public/photo/${data.photo}`)}]);
			
			throw err;
		}
	}
	
}