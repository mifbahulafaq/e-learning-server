const assService = require('../matt-ass/service');
const assAnsService = require('./service');

module.exports = {
	/*-----------------get-------------------------*/
	async getByAss(req, res, next){
		
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			let teacher = true;
			
			await assService.teacherAuthor(id_matt_ass, req, async (teacherData, err)=>{
				
				try{
					
					if(err){
						teacher = false;
						await assService.studentAuthor(id_matt_ass, req);
					}
					
					const { rows } = await assAnsService.getByAss(req, teacher)
					res.json({data: rows})
				
				}catch(err){
					next(err)
				}
				
			})
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		try{
			
			const id_ass_ans = req.params.id_ass_ans || undefined;
			let teacher = true;
			
			await assAnsService.teacherAuthor(id_ass_ans, req, async (teacherData, err)=>{
				
				try{
					
					if(err){
						
						teacher = false;
						await assAnsService.studentAuthor(id_ass_ans, req);
					}
					
					const { rows: data } = await assAnsService.getSingle(id_ass_ans, teacher)
					
					res.json({ data: data[0] });
					
				}catch(err){
					next(err)
				}
				
			})
			
		}catch(err){
			next(err)
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		try{
			
			const insertData = await assAnsService.add(req);
			
			res.json({
				data: insertData.rows
			})
			
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
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
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
			
			const id_ass_ans = req.params.id_ass_ans || undefined;
			let teacher = true;
			
			await assAnsService.teacherAuthor(id_ass_ans, req, async (teacherData, err)=>{
				
				try{
					
					if(err){
						
						teacher = false;
						await assAnsService.studentAuthor(id_ass_ans, req);
					}
					
					const path = await assAnsService.getSingleAttachment(req, teacher);
					
					res.json({ path })
					
				}catch(err){
					next(err)
				}
				
			})
			
		}catch(err){
			next(err)
		}
		
	}
}