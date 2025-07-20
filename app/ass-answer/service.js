const matters = require('../../services/table')('matters');
const matt_ass = require('../../services/table')('matt_ass');
const ass_answers = require('../../services/table')('ass_answers');

const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');
const isDate = require('../utils/isDate');
const validateBody = require('../utils/validateBody');
const searchFileOfArrays = require('../utils/searchFileOfArrays');

const singleAuthorization = require('../../services/singleAuthorization');

async function teacherAuthor(id_ass_ans, req, cb){
	
	let sql = {
		text: `SELECT c.teacher FROM ass_answers aa 
				INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass 
				INNER JOIN matters m ON ma.id_matt = m.id_matter 
				INNER JOIN classes c ON m.class = c.code_class 
				WHERE aa.id_ass_answer=$1`,
		values: [id_ass_ans]
	}

	const { rows: teacherData } =  await querySync(sql);
	
	return singleAuthorization('Matter', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(id_ass_answer, req, cb){
	
	let { rows: studentData } = await ass_answers.find({ id_ass_answer }).select('user_id').execute();
	
	return singleAuthorization('Matter', req.user, studentData[0] || {}, cb);
}

async function add(req){
	
	//validating insert data..
	validateBody(req, 'Insert');
	
	const { file, body} = req;
	let { id_matt_ass } = body;
	
	//getting deadline
	const { rows } = await matt_ass.find({ id_matt_ass }).select('duration, date').execute();
	let { date, duration } = rows[0];
	
	if(duration){
		// convert the raw duration value into real time
		const deadline = (new Date(date)).getTime() + duration;
		
		if(Date.now() > deadline){
			
			throw appError(
				"You can't add an answer to the assaignment since the time exceed the deadline",
				200
			);
		}
	}
	
	/*managing uploaded document..*/
	let content = [
		file.filename,
		file.originalname
	]
	
	content = toSqlArray([content])
	/*....*/
	
	//checking the user's answers
	const where = { user_id: req.user.user_id, id_matt_ass}
	const getUser = await ass_answers.find(where).execute();
	
	if(getUser.rowCount){//update
		
		let sql = {
			text: 'UPDATE ass_answers SET content = content || $1 WHERE id_ass_answer = $2 RETURNING *',
			values: [ content, getUser.rows[0].id_ass_answer ]
		}
		
		return await querySync(sql);
		
	}
	
	//inserting..
	const data = {content, id_matt_ass, user_id: req.user.user_id }
	
	return ass_answers.insert(data);
			
}

async function getByAss(req, teacher){
	
	const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
	
	sql = {
		text: `SELECT 
			aa.*, jsonb_build_object('name',u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", jsonb_build_object('id_matt_ass',ma.id_matt_ass, 'duration', ma.duration, 'text', ma.text, 'date', ma.date, 'attachment', ma.attachment, 'matter', m.*, 'title', ma.title) assignmentmatter FROM ass_answers aa 
			INNER JOIN "users" u ON aa.user_id=u.user_id
			INNER JOIN matt_ass ma ON aa.id_matt_ass=ma.id_matt_ass
			INNER JOIN matters m ON ma.id_matt=m.id_matter
			WHERE aa.id_matt_ass = $1`,
		values: [id_matt_ass]
	}
	
	if(!teacher){
		sql.text += " AND aa.user_id = $2";
		sql.values.push(req.user.user_id)
	}
	
	const result = await querySync(sql);
	const { rows: data } = result;
	
	let scheduleOfMatter = data[0]?.assignmentmatter?.matter?.schedule;
	scheduleOfMatter = isDate(scheduleOfMatter)? new Date(scheduleOfMatter): undefined;
	
	if(new Date() < scheduleOfMatter){
		return res.json({
			error: 1,
			message: "You can only get the data when the time enters the schedule of the matter " + scheduleOfMatter.toLocaleString("en-US")
		})
	}
	
	return result
}
async function getSingle(id_ass_ans, teacher){
	
	let sql = {
		text: `SELECT aa.*, jsonb_build_object('name',u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) user, to_jsonb(ma.*) assignment, m.schedule FROM ass_answers aa 
				INNER JOIN  "users" u ON aa.user_id = u.user_id
				INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass 
				INNER JOIN matters m ON ma.id_matt = m.id_matter
				WHERE aa.id_ass_answer=$1`,
				
		values: [id_ass_ans]
	}
	
	const result =  await querySync(sql);
	
	if(!teacher){
		
		const { rows: assAnswerData } = result;
		
		//student only
		const scheduleOfMatter = assAnswerData[0]?.schedule? new Date(assAnswerData[0]?.schedule): undefined;
		
		if(new Date() < scheduleOfMatter){
			return res.json({
				error: 1,
				message: "You can only get the data when the time enters the schedule of the material " + scheduleOfMatter.toLocaleString("en-US")
			})
		}
	}
	
	return result 
}

async function getSingleAttachment(req, teacher){
	
		const id_ass_ans = req.params.id_ass_ans || undefined;
	
		const { rows: data } = await this.getSingle(id_ass_ans, teacher)
		
		await searchFileOfArrays(data?.[0]?.content, req.params.filename)
		
		return `/private/document/${req.user.user_id}/${req.params.filename}`
}

module.exports = {
	teacherAuthor,
	studentAuthor,
	add,
	getByAss,
	getSingle,
	getSingleAttachment
};
