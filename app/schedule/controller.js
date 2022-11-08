const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	
	async createSchedule(req, res, next){
		
		const { schedules, code_class} = req.body;
		
		try{
			
			const errCreate = validationResult(req);
			if(!errCreate.isEmpty()){
				return res.json({
					error: 1,
					field: errCreate.mapped()
				})
			}
			
			let sql = {
				text: "SELECT teacher FROM classes WHERE code_class=$1",
				values: [code_class]
			}
			let result = await querySync(sql);
			
			const subjectSchedule = subject('Schedule', {user_id: result.rows[0]?.teacher})
			const policy = policyFor(req.user);
			
			if(!policy.can('create', subjectSchedule)){
				return res.json({
					error: 1,
					message: "You're not allowed to create a schedule"
				})
			}
			
			//set multiple insert
			let length = 3;
			let strVal = '($1, $2, $3)';
			schedules.forEach((e,iP)=>{
				if(iP>0){
					strVal += `, ($${length+1}, $${length+2}, $${length+3})`;
					length += 3;
				}
			})
			
			sql.text = `INSERT INTO schedules(day, time, code_class) VALUES${strVal} RETURNING *`;
			sql.values = [];
			schedules.forEach(e=>sql.values = [...sql.values, e.day, e.time, code_class]);
			
			result = await querySync(sql);
			return res.json({
				data: result.rows
			})
			
		}catch(err){
			return next(err);
		}
	},
	
	async readSchedules(req, res, next){
		
		try{
			
			let sql = {
				text: "SELECT teacher FROM classes WHERE code_class=$1",
				values: [req.params.code_class]
			}
			let result = await querySync(sql);
			
			const subjectSchedule = subject('Schedule', {user_id: result.rows[0].teacher})
			const policy = policyFor(req.user);
			
			if(!policy.can('read', subjectSchedule)){
				return res.json({
					error: 1,
					message: "You cannot read this data"
				})
			}
			
			sql.text = "SELECT * FROM schedules WHERE code_class=$1";
			sql.values = [req.params.code_class];
			result = await querySync(sql);
			
			return res.json({data: result.rows});
			
		}catch(err){
			next(err)
		}
	}
	
}