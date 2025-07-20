const service = require('./service');
const examService = require('../exam/service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByExam(req, res, next){
		
		try{
			
			const idExm = parseInt(req.params.id_exm) || undefined;
			let isTeacher = true;
			
			//start processing teacher author
			await examService.teacherAuthor(idExm, req, async (teacherData, err)=>{
				
				try{
				
					if(err){
						
						isTeacher = false;
						
						await examService.studentAuthor(idExm, req);
						
					}
					
					const { rows: data } = await service.getByExam(req, isTeacher);
					
					res.json({ data });
				}catch(err){
					
					next(err)
					
				}
				
			})
			// const { opposite } = req.query;
			
			// if(parseInt(opposite)){
				
			// }
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		try{
		
			const id_exm_ans = parseInt(req.params.id_exm_ans) || undefined;
			
			await service.teacherAuthor(id_exm_ans, req, async (teacherData, err)=>{
				
				try{
				
					if(err) await service.studentAuthor(id_exm_ans, req);
					
					const { rows : data } = await service.getSingle(id_exm_ans);
					
					res.json({ data });
				}catch(err){
					
					next(err);
					
				}
				
			})
			
		}catch(err){
			next(err)
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		try{
			
			const insertData = await service.insert(req);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async rate(req, res, next){
		
		try{
			
			const id_exm_ans = parseInt(req.params.id_exm_ans);
		
			await service.teacherAuthor(id_exm_ans, req);
			
			const { rows: data } = await service.rate(req);
			
			res.json({ data });
			
		}catch(err){
			
			next(err)
		}
	},	
	/*-----------------remove-------------------------*/
	/*async remove(req, res, next){
		
		try{
			const id_exm = parseInt(req.params.id_exm);
			let sql ={
				text: 'SELECT c.teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)){
				
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM Exams WHERE id_exm=$1 RETURNING *',
				values: [id_exm || undefined]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment}`)}];
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
	*/
	async getAttachment(req, res, next){
		
		try{
		
			const id_exm_ans = parseInt(req.params.id_exm_ans) || undefined;
			
			await service.teacherAuthor(id_exm_ans, req, async (teacherData, err)=>{
				
				try{
				
					if(err) await service.studentAuthor(id_exm_ans, req);
					
					const path = await service.getSingleAttachment(req);
					
					return res.json({ path });
				}catch(err){
					next(err);
				}
				
			})
			
		}catch(err){
			next(err)
		}
		
	}
}