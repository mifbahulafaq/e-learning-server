const { querySync } = require('../../services/query');
const users = require('../../services/table')('users');
const path = require('path');
const config = require('../../config');
const { removeFiles } = require('../../services/file');

//utils
const validateBody = require('../utils/validateBody');
const appError = require('../utils/appError');
const filterData = require('../utils/filterData');

const userColNames = ['name', 'email', 'gender', 'photo'];

module.exports = {
	
	insertUser(data, obj = { } ){
		
		return users.insert(data)
		
	},
	
	updatePass(req){
		
		//validating...
		validateBody(req, 'update');
		
		const user_id = parseInt(req.params.user_id) || undefined;
		const { new_password } = req.body;
		
		return users.update({ password: new_password}, {user_id}).execute()
			
	},
	
	async updateUser(req){
		
		//validating...
		validateBody(req, 'update');
		
		let userPhoto;
		const user_id = parseInt(req.params.user_id) || undefined;
		const where = {user_id};
		
		if(req.file?.filename){
			
			req.body.photo = req.file?.filename; 
			
			//get single data to delete photo
			const { rows: userData } = await users.find(where).execute();
			userPhoto = userData[0]?.photo || undefined;
			
		}
		
		//updating..
		const resultUpdate = await users.update(filterData(userColNames, req.body), where).execute();
		
		if(!resultUpdate.rowCount) throw appError('Update user failed', 200);
		
		if(userPhoto){
			userPhoto = [{ path: path.join(config.rootPath, `public/photo/${userPhoto}`)}]
			removeFiles(userPhoto)
		}
		
		return resultUpdate;
			
	}
	
}