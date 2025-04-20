const mattAssService = require('./service');
const mattService = require('../matter/service');

module.exports = {
	/*-----------------get-------------------------*/
	async get(req, res, next){
		
		try{
			
			//authorizing...
			mattAssService.getAuhtor(req.user);
			
			//getting data..
			const result = await service.get(req.query, req.user.user_id);
			
			//response
			res.json(result)
			
		}catch(err){
			next(err);
		}
		
	},
	/*-----------------get by matter-------------------------*/
	async getByMatter(req, res, next){
		
		try{
			
			const id_matt = parseInt(req.params.id_matt) || undefined;
			const author = mattService.singleAuthor(id_matt, req.user);
			let authorName = 'teacher';
			
			//teacher authorizing...
			author[authorName](async (teacherData, err)=>{
				
				let id_class_student;
				
				if(err){
					
					try{
						
						authorName = 'student'
						
						const studentData = await author[authorName]();
						
						id_class_student = studentData[0]?.id_class_student;
						
					}catch(err){
						
						return next(err)
						
					}
				}
				
				//getting data
				const { rows: mattAssData } = await mattAssService.findByMatter(req, authorName == 'teacher', id_class_student);
				
				return res.json({
					data: mattAssData
				})
				
			});
			
		}catch(err){
			
			next(err);
		}
		
	},
	
	
	
	async getAttachment(req, res, next){
		
		try{
			
			let sql = {
				text: 'SELECT * FROM matt_ass WHERE id_matt_ass = $1 AND $2 = ANY(attachment)',
				values: [id_matt_ass, req.params.filename]
			}
			let fileData = await querySync(sql);
			
			if(fileData.rowCount){
				
				const filePath = path.join(config.rootPath, `public/document/${req.params.filename}`);
				
				if(fs.existsSync(filePath)){
					return res.json({
						path: `/private/document/${req.user.user_id}/${req.params.filename}`
					})
				}
			}
			
			return res.json({
				error: 1,
				message: "File's not found"
			})
			
			
		}catch(err){
			next(err);
		}
		
	},
	async getSingle(req, res, next){
	
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			let additionalSql = {
				text: "",
				values: [id_matt_ass]
			}
			
			if(!req.isTeacher){
				additionalSql.text = "AND user_id = $2" 
				additionalSql.values = [id_matt_ass, req.user?.user_id]
			}
			
			let singleReadSql = {
				text: `SELECT ma.*, json_build_object('user_id', u.user_id, 'email', u.email, 'gender', u.gender, 'name', u.name, 'photo', u.photo) teacher,
				(SELECT count(*) FROM ass_answers WHERE id_matt_ass = $1 ${additionalSql.text}) total_answers
				FROM matt_ass ma 
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   INNER JOIN users u ON c.teacher = u.user_id 
					   WHERE id_matt_ass = $1`,
				values: additionalSql.values
			}
			let { rows: singleData } = await querySync(singleReadSql);
			
			return res.json({
				data: singleData
			})
			
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async add(req, res, next){
		
		try{
			
			let policy = policyFor(req.user);
		
			if(!policy.can('create', 'Matt_ass')) throw appError('You have no access to create a assignment', 200);
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('Insert', 200);
				err.field = errInsert.mapped();
				
				throw err;
			}
			
			const { body, file } = req;
			
			const result = await service.create({ body, file });
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err)
		}
	},
	/*-----------------edit-------------------------*/
	async delete(req, res, next){
		
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass);
			let sql ={
				text: 'SELECT teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass = $1 AND c.teacher = $2',
				values: [id_matt_ass, req.user?.user_id]
			} 
			
			let { rows: mattAssData } = await querySync(sql);
			
			let policy = policyFor(req.user);
			let subjectMattAss = subject('Matt_ass', {user_id: mattAssData[0]?.teacher})
			
			if(!policy.can('delete', subjectMattAss)){
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM matt_ass WHERE id_matt_ass = $1 RETURNING *',
				values: [id_matt_ass]
			}
			let resultDeleting = await querySync(deleteSql);
			
			if(resultDeleting.rowCount) {
				let filePath = {
					path: path.join(config.rootPath,`public/document/${resultDeleting.rows[0]?.attachment[0]}`)
				}
				
				removeFiles([filePath]);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDeleting.rows
			})
			
		}catch(err){
			next(err)
		}
	}
}