const policyFor = require('../policy');
const { querySync } = require('../../services/query');
const { subject } = require('@casl/ability');

async function singleExamAuthor(req, res, next){
	
	const id_exm = parseInt(req.params.id_exm) || undefined;
	try{
		//get the main data and authorize
		const query = {
			text: 'SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_exm = $1',
			values: [id_exm]
		}
		const { rows: examData } = await querySync(query);
		
		//authorize
		
		const policy = policyFor(req.user);
		let subjectExam = subject('Exam',{user_id: examData[0]?.teacher});
		
		if(!policy.can('readsingle',subjectExam)){
			
			let sqlGetStudent = {
				text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
				values: [examData[0]?.code_class, req.user?.user_id]
			}
			const { rows: studentData} = await querySync(sqlGetStudent);
			
			subjectExam = subject('Exam',{user_id: studentData[0]?.user});
			
			if(!policy.can('readsingle', subjectExam)){
				return res.json({
					error: 1,
					message: "You're not allowed to get a single exam data"
				})
			}
		}
		
		req.data = examData;
		next();
		
	}catch(err){
		next(err);
	}
}

module.exports = {
	singleExamAuthor
}