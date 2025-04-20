const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const config = require('../../config');
const { querySync } = require('../../services/query');
const matters = require('../../services/table')('matters');
const fileService = require('../../services/file');
//utils
const toSqlArray = require('../utils/toSqlArray');
const filterData = require('../utils/filterData');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const isFunc = require('../utils/isFunc');
const appError = require('../utils/appError')
const entityAuthor = require('../utils/entityAuthor')

const matterColNames = ['schedule', 'name', 'description', 'attachment', 'class', 'status'];

function singleAuthor(id_matt, user){
	
	const obj = {};
	
	obj.user_id = user.user_id;
	obj.policy = policyFor(user);
	obj.id_matt = id_matt;
	obj.defined_err_msg = 'You have no access to the matter';
	obj.success_statuscode = 200;
	
	//methods
	obj.validate = function(subjectMatter, cb, data){
		
		let err = null
		
		if(!this.policy.can('readsingle', subjectMatter)) err = appError(this.defined_err_msg, this.success_statuscode);
		
		if(isFunc(cb)){
			cb(data, err);
			return;
		}
		
		if(err) throw err;
		
		return data;
	}
	
	obj.teacher = async function(cb){
		
		const query = {
			text: 'SELECT c.teacher FROM matters m INNER JOIN classes c ON m.class=c.code_class WHERE id_matter = $1',
			values: [this.id_matt]
		}
		const { rows: teacherData } = await querySync(query);
		
		let subjectMatter = subject('Matter',{user_id: teacherData[0]?.teacher});
		
		this.validate(subjectMatter, cb, teacherData);
	}
	
	obj.student = async function(cb){
		
		let sqlGetStudent = {
			text: 'SELECT cs.* FROM matters m INNER JOIN classes c ON m.class = c.code_class INNER JOIN class_students cs ON c.code_class = cs.class WHERE m.id_matter=$1 AND cs.user_id=$2',
			values: [this.id_matt, this.user_id]
		}
		const { rows: studentData} = await querySync(sqlGetStudent);
		
		subjectMatter = subject('Matter',{user_id: studentData[0]?.user_id});
		
		return this.validate(subjectMatter, cb, studentData);
	}
	
	return obj;
	
}

function additionAuthor(user){
	
	entityAuthor(
		user,
		'create',
		'Matter',
		'You have no access to create a matter'
	)
}

async function findByClass(qs, code_class){
		
	let filterString = "";
	let filterArray = [];
	const isDate = date=>isNaN((new Date(date)).getDate())
	
	if(parseInt(qs.cs)) delete qs.latest //cs (coming soon)
	if(!isDate(qs.schedule)){
		
		qs = { schedule: qs.schedule }
		filterString = 'AND m.schedule = $2'
		filterArray.push(qs.schedule)
		
	}
	if(!isDate(qs.date) && isDate(qs.schedule)){
		
		const date = new Date(qs.date)
		const locale = "en-CA"
		const opt = {dateStyle:"short"};
		
		//make the date to be a day
		filterString = "AND m.schedule >= $2 AND m.schedule < $3"
		filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
		date.setDate(date.getDate() + 1)
		filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
		
	}
	
	const csSql = 'AND schedule > NOW() ORDER BY schedule ASC LIMIT 1'
	const latestSql = `
		ORDER BY
		CASE WHEN schedule < NOW() THEN CAST(CEIL(EXTRACT(EPOCH FROM NOW())) || '0' AS NUMERIC) - CEIL(EXTRACT(EPOCH FROM schedule))
			
			 ELSE CEIL(EXTRACT(EPOCH FROM schedule))
		END
		ASC`
	const sql = {
		text: `SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM matter_discussions md WHERE md.matt = m.id_matter) total_comments
		FROM matters m 
		INNER JOIN classes c ON m.class=c.code_class 
		INNER JOIN users t ON c.teacher = t.user_id 
		WHERE m.class = $1 ${filterString} ${parseInt(qs.cs)? csSql: ''} ${parseInt(qs.latest)?latestSql:''}`,
		values: [code_class || undefined, ...filterArray]
	}
	
	return await querySync(sql);
}

async function getSingle(id_matt){
	
	const query = {
		text: 'SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM matters m INNER JOIN classes c ON m.class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_matter = $1',
		values: [id_matt]
	}
		
	return await querySync(query);
	
}

async function create(req, allData){
	
	let { body, files } = allData;
	const errInsert = validationResult(req);
			
	if(!errInsert.isEmpty()){
		
		const err = appError('insert', 200);
		err.field = errInsert.mapped()
		
		throw err;
	}

	if(files){
		body.attachment = toSqlArray(files.map(e=>[e.filename, e.originalname]))
	}
	
	const data = filterData(matterColNames, body);
	
	return await matters.insert(data)
	
}

async function update(req, id_matter, alldatas){
	
	let { body, files } = alldatas;
	
	//validating...
	const errUpdate = validationResult(req);
	
	if(!errUpdate.isEmpty()){
		
		const err = appError('update', 200);
		err.field = errUpdate.mapped()
		
		throw err;
		
	}
	
	if(body.attachment !== undefined){
		
		await fileService.notExistAndRemove(
			'matters',
			{id_matter}, 
			( body.attachment || []).map(e=>e.filename)
		);
	}
	
	/*start setting input data attachment*/
	//body.attachment backup
	let bodyAttachmentBU = body.attachment && (body.attachment || []).map(e=>[e.filename, e.originalname]);
	files = files || [];
	
	body.attachment = body.attachment || [];
	// grouping bodyAttachmenth and files
	const allAttachments = [...body.attachment, ...files].map(e=>[e.filename, e.originalname]);
	/*end setting input data attachment*/
	
	//the beginning of setting matter update
	delete body.attachment;
	const matterUpdate = matters.update(filterData(matterColNames, body), { id_matter });
	
	if(bodyAttachmentBU === undefined){
		matterUpdate.setData(`attachment = attachment || $${matterUpdate.values.length+1}`, toSqlArray(allAttachments));
	}else{
		
		if(files.length){
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(allAttachments))
		}else{
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(bodyAttachmentBU))
		}
	}
	
	// updating data..
	let resultUpdate = await matterUpdate.execute();
	
	return resultUpdate;
}

async function getSingleAttachment(user_id, id_matt, filename){
	
	const { rows: singleMatter } = await this.getSingleMatter(id_matt);
	
	await searchFileOfArrays(singleMatter?.[0]?.attachment, filename);
	
	return `/private/document/${user_id}/${filename}`;
	
}

async function deleteSingle(id_matter){
	
	//deleting..
	let resultDelete = await matters.delete({ id_matter });
	
	//removing doc of deleted matter..
	if(resultDelete.rowCount) {
		let removedFiles = resultDelete.rows[0]?.attachment.map(e=>({path: path.join(config.rootPath,`public/document/${e[0]}`)}));
		// removeFiles(removedFiles);
		fileService.removeFiles(removedFiles);
	}
	
	return resultDelete;
	
}
module.exports = {
	singleAuthor,
	additionAuthor,
	findByClass,
	getSingle,
	create,
	update,
	getSingleAttachment
}