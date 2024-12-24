const path = require('path');
const config = require('../../config');

const fileService = require('../../services/file');
const exams = require('../../services/table')('exams');

const filterData = require('../utils/filterData');
const toSqlArray = require('../utils/toSqlArray');

const examColNames = ['code_class', 'text', 'duration', 'schedule', 'attachment'];

async function update(id_exm, alldatas){
	
	let { file, body } = alldatas;
	
	if(file){
		
		body.attachment = toSqlArray([
			file.filename,
			file.originalname
		]);
		
	}else if(body.attachment !== null){
		delete body.attachment;
	}
	
	if(body.attachment !== undefined){
		const removedFiles = await fileService.notExistAndRemove(
			'exams', 
			{id_exm}
		); 
	}
	
	const updatedCols = [...examColNames];
	updatedCols.shift()//sift method, to remove first index. in this case, code_class
	
	const updatedDatas = filterData(updatedCols, body);
	//updating data
	let resultUpdate = await exams.update(updatedDatas, { id_exm }).execute();
	
	return resultUpdate;
}

async function insert(allData){
	
	const { file, body } = allData;
	
	if(file){
		body.attachment = toSqlArray([
			file.filename,
			file.originalname
		])
	}
	
	const inputData = filterData(examColNames, body);
	
	const result = await exams.insert(inputData);
	
	return result;
}

module.exports = {
	update,
	insert
}