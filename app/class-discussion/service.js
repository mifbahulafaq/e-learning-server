const { validationResult } = require('express-validator');
const { querySync } = require('../../services/query');
const class_discussions = require('../../services/table')('class_discussions');
//utils
const filterData = require('../utils/filterData');
const appError = require('../utils/appError');
const validateBody = require('../utils/validateBody');

const discussionColNames = ['text', 'class', 'user_id'];

function findByClass(code_class){
		
	query = {
		text: 'SELECT cd.*, c.*, u.name , u.email, u.gender, u.photo  FROM class_discussions cd INNER JOIN users u ON cd.user_id = u.user_id INNER JOIN classes c ON cd.class = c.code_class WHERE cd.class = $1 ORDER BY date',
		values: [code_class]
	}

	return querySync(query);
}

async function create(req){
	
	//validatin..
	validateBody(req, 'Insert');
	
	req.body.user_id = req.user.user_id;
	
	const data = filterData(discussionColNames, req.body);
	
	return await class_discussions.insert(data)
	
}


module.exports = {
	findByClass,
	create,
}