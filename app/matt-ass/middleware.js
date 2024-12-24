const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const { querySync } = require('../../services/query');

async function singleAssignmentAuthor(req, res, next){
	
	try{
		
		const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
		let policy = policyFor(req.user);
		
		let sql ={
			
			text: 'SELECT m.class, m.schedule FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE ma.id_matt_ass = $1',
			values: [id_matt_ass]
		} 

		let { rows: mattAssData } = await querySync(sql);
		
		sql ={
			text: 'SELECT teacher FROM classes WHERE code_class = $1 AND teacher = $2',
			values: [mattAssData[0]?.class, req.user?.user_id]
		}
		
		let { rows: classData } = await querySync(sql);
		let subjectMattAss = subject('Matt_ass', {user_id: classData[0]?.teacher})
		
		//teacher authorize
		if(!policy.can('readsingle', subjectMattAss)){
			
			let sql_get_student = {
				text: 'SELECT "user" FROM class_students WHERE class = $1 AND "user" = $2' ,
				values: [mattAssData[0]?.class, req.user?.user_id]
			}
			const { rows: studentData } = await querySync(sql_get_student);
			subjectMattAss = subject('Matt_ass', {user_id: studentData[0]?.user})
			
			console.log('studentData', req.user?.user_id)
			//student authorize
			if(!policy.can('readsingle', subjectMattAss)){
				return res.json({
					error: 1,
					message: 'You have no access to read this data'
				})
			}
			
			const scheduleOfMatter = mattAssData[0]?.schedule? new Date(mattAssData[0]?.schedule): undefined;
			
			if(new Date() < scheduleOfMatter){
				return res.json({
					error: 1,
					message: "You can only get the data when the time enters the schedule of the matterial " + scheduleOfMatter.toLocaleString("en-US")
				})
			}
			
			req.isTeacher = false;
			
			return next();
		}
		
		req.isTeacher = true;
		
		next();

	}catch(err){
	
		next(err)
	}
	
}

module.exports = {
	singleAssignmentAuthor
}