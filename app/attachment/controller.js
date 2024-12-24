const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const { querySync } = require('../../services/query');
const classes = require('../../services/table')('classes');
const schedules = require('../../services/table')('schedules');

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
			
			let result = await classes.find({ code_class }).execute();
			
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
			
			const code_class = parseInt(req.params.code_class) || undefined;
			
			let result = await classes.find({ code_class}).execute();
			
			const subjectSchedule = subject('Schedule', {user_id: result.rows[0].teacher})
			const policy = policyFor(req.user);
			
			if(!policy.can('read', subjectSchedule)){
				return res.json({
					error: 1,
					message: "You cannot read this data"
				})
			}
			
			result = await schedules.find({code_class}).execute();
			
			return res.json({data: result.rows});
			
		}catch(err){
			next(err)
		}
	}
	
}