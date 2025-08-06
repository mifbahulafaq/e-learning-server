const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

//utils
const validateBody = require('../utils/validateBody');
const isDate = require('../utils/isDate');

async function teacherAuthor(id_exm, req, cb){
	
	const sql = {
		text: 'SELECT teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class WHERE e.id_exm = $1',
		values: [id_exm]
	}
	
	let { rows: teacherData } = await querySync(sql);
	
	return singleAuthorization('Exam', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(id_exm, req, cb){
	
	const user_id = req.user.user_id
	
	const sql = {
		text: 'SELECT cs.* FROM exams e INNER JOIN class_students cs ON e.code_class = cs.class WHERE e.id_exm = $1 AND cs.user_id = $2',
		values: [id_exm, user_id]
	}
	
	const { rows: studentData } = await querySync(sql);
	
	return singleAuthorization('Exam', req.user, studentData[0] || {}, cb);
}

function add(req){
	
	const { schedules, code_class} = req.body;
		
	//validating..
	validateBody(req, 'Insert');
	
	//set multiple insert
	let length = 3;
	let strVal = '($1, $2, $3)';
	schedules.forEach((e,iP)=>{
		if(iP>0){
			strVal += `, ($${length+1}, $${length+2}, $${length+3})`;
			length += 3;
		}
	})
	
	let sql = {
		text : `INSERT INTO schedules(day, time, code_class) VALUES${strVal} ON CONFLICT ON CONSTRAINT unique_schedules DO NOTHING RETURNING *`,
		values : []
	}
	schedules.forEach(e=>sql.values = [...sql.values, e.day, e.time, code_class]);
	
	return querySync(sql);
}

function get(req){
	
	const code_class = parseInt(req.params.code_class) || undefined;
	
	//set SQL values and filter using query string paramenter
	/*
	
	latest		: 1 | 0			//sort data by day and time (by day first, then time)
	order_type	: asc | desc	//list data in ascending or descanding order by day and time (by day first, then time)
	note: if latest not set, then order_type wont work
	
	limit		: number		//how much data will be displayed
	timeStart	:
	timeLimit	:
	*/
	
	const currentDate = new Date();
	let { 
		order_type = '', 
		latest= 0,
		day: df, 
		time: tf,
		limit: lim= 100,
		timeStart,
		timeLimit
	} = req.query
	df = parseInt(df)? df: currentDate.getDay();
	
	const tempDate = (new Date()).toDateString() 
	const tempDateTime = new Date(tempDate +' '+tf)
	tf = isDate(tempDateTime)? currentDate.toLocaleString('en-GB', {timeStyle: 'medium'}): tf;
	timeStart = isDate(timeStart)? timeStart: '';
	timeLimit = isDate(timeLimit)? timeLimit: '';
	
	let value_of_obj = {code_class, lim}
	//if(latest) value_of_obj = {...value_of_obj, df, tf}
	
	//function to get index of obj
	const indexOfObj = key=>Object.keys(value_of_obj).indexOf(key) + 1
	
	
	//set SQL filter
	order_type = order_type.toUpperCase()
	let orderType = order_type === 'DESC' || order_type === 'ASC'? order_type: ''
	
	/*const orderByDay = `
		CASE WHEN CONCAT(day, '')::INTEGER < $${indexOfObj('df')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
			 WHEN CONCAT(day, '')::INTEGER > $${indexOfObj('df')} THEN CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
			 WHEN time < $${indexOfObj('tf')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
			 ELSE CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
		END`
	 const orderByTime = `
		 CASE WHEN CONCAT(day, '')::INTEGER != $${indexOfObj('df')} THEN CURRENT_DATE + time
			  WHEN time < $${indexOfObj('tf')} THEN (CURRENT_DATE + time) + '24 H'
			  ELSE CURRENT_DATE + time
		 END
	 `
	 */
	latest = parseInt(latest) || undefined;
	latest = latest ? `ORDER BY day, time ${orderType}`: '';
	
	const singleScheduleData = "(CURRENT_DATE + (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) > CONCAT(day, '')::INTEGER THEN (CONCAT(day, '')::INTEGER + 7) - EXTRACT(DOW FROM CURRENT_DATE) ELSE CONCAT(day, '')::INTEGER - EXTRACT(DOW FROM CURRENT_DATE) END)::INT) + time";
	
	const filterDate = {
		timeStart: '',
		timeLimit: ''
	}
	
	if(timeStart){
		value_of_obj = {...value_of_obj, timeStart}
		filterDate.timeStart = `AND ${singleScheduleData} >= $${indexOfObj('timeStart')}`;
	}
	if(timeLimit && timeLimit){
		value_of_obj = {...value_of_obj, timeLimit}
		filterDate.timeLimit = `AND ${singleScheduleData} <= $${indexOfObj('timeLimit')}`;
	}
	
	const sql = {};
	sql.text = `SELECT * FROM schedules WHERE code_class=$${indexOfObj('code_class')} ${filterDate.timeStart} ${filterDate.timeLimit} ${latest} LIMIT $${indexOfObj('lim')}`;
	sql.values = Object.values(value_of_obj);
	
	return querySync(sql);
	
}

module.exports = {
	teacherAuthor,
	studentAuthor,
	add,
	get,
}