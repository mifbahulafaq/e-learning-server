const { validationResult } = require('express-validator');
const { querySync } = require('../../services/query');

const mattService = require('../matter/service');
const matter_discussions = require('../../services/table')('matter_discussions');
// utils
const filterData = require('../utils/filterData');
const appError = require('../utils/appError')
const validateBody = require('../utils/validateBody')

const discussColNames = ['text', 'matt', 'user_id'];

async function get(id_matt, isTeacher){
		
	let sql_get_mattdiscuss = {
		text: `SELECT ma.*, u.name , email, gender, photo, m.schedule matt_schedule FROM matter_discussions ma
				INNER JOIN users u ON ma.user_id = u.user_id 
				RIGHT JOIN matters m ON matt = id_matter
				WHERE id_matter = $1 ORDER BY date`,
		values: [id_matt]
	}
	
	const resultData = await querySync(sql_get_mattdiscuss)
	const { rows: discussData } = resultData;
	
	if(discussData[0]?.matt_schedule) mattService.scheduleMatter(isTeacher, discussData[0]?.matt_schedule);
	
	return discussData[0]?.id_matt_discuss? discussData: [];
}

function add(req){
	
	//validating..
	validateBody(req, 'Insert');
	
	req.body.user_id = req.user.user_id;
	
	const payload = filterData(discussColNames, req.body);
	
	return matter_discussions.insert(payload)
}

module.exports = {
	get,
	add
}