const matters = require('../../services/table')('matters');
const matt_ass = require('../../services/table')('matt_ass');
const ass_answers = require('../../services/table')('ass_answers');

const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');

async function add(req){
	
	const errInsert = validationResult(req);
	
	//input validation
	if(!errInsert.isEmpty()){
		
		const err = appError('Insert', 200);
		err.field = errInsert.mapped();

		throw err;
	}
	
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
	
	let content = [
		file.filename,
		file.originalname
	]
	
	content = toSqlArray([content])
	
	//checking the user's answers
	const where = { student: req.studentData.id_class_student, id_matt_ass}
	const getUser = await ass_answers.find(where).execute();
	
	if(getUser.rowCount){//update
		
		let sql = {
			text: 'UPDATE ass_answers SET content = content || $1 WHERE id_ass_answer = $2 RETURNING *',
			values: [ content, getUser.rows[0].id_ass_answer ]
		}
		
		return await querySync(sql);
		
	}
	
	//inserting..
	const data = {content, id_matt_ass, student: req.studentData.id_class_student }
	
	return ass_answers.insert(data);
			
}

async function getByAss(req, teacher){
	
	const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
	
	sql = {
		text: `SELECT 
			aa.*, jsonb_build_object('name',u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", jsonb_build_object('id_matt_ass',ma.id_matt_ass, 'duration', ma.duration, 'text', ma.text, 'date', ma.date, 'attachment', ma.attachment, 'matter', m.*, 'title', ma.title) assignmentmatter FROM ass_answers aa 
			INNER JOIN "users" u ON aa.student=u.user_id
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
	
	console.log(data)
	// const scheduleOfMatter = data[0]?.matter_schedule? new Date(data[0]?.matter_schedule): undefined;
		
	// if(new Date() < scheduleOfMatter){
		// return res.json({
			// error: 1,
			// message: "You can only get the data when the time enters the schedule of the matter " + scheduleOfMatter.toLocaleString("en-US")
		// })
	// }
	
	return result
}

module.exports = {
	add,
	getByAss
};
