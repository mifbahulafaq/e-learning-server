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
			
			const policy = policyFor(req.user);
			
			if(!policy.can('create', 'Schedule')){
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
			
			let sql = {
				text : `INSERT INTO schedules(day, time, code_class) VALUES${strVal} ON CONFLICT ON CONSTRAINT unique_schedules DO NOTHING RETURNING *`,
				values : []
			}
			schedules.forEach(e=>sql.values = [...sql.values, e.day, e.time, code_class]);
			
			const result = await querySync(sql);
			
			res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err);
		}
	},
	
	async readSchedules(req, res, next){
		
		const code_class = parseInt(req.params.code_class) || undefined
		
		try{
			
			let sql = {
				text: "SELECT teacher FROM classes WHERE code_class=$1",
				values: [code_class]
			}
			let result = await querySync(sql);
			
			const subjectSchedule = subject('Schedule', {user_id: result.rows[0]?.teacher})
			const policy = policyFor(req.user);
			
			if(!policy.can('read', subjectSchedule)){
				return res.json({
					error: 1,
					message: "You cannot read this data"
				})
			}
			
			//set SQL values and filter
			const currentDate = new Date()
			let { 
				order_type = '', 
				latest= 0,
				day: df, 
				time: tf,
				limit: lim= 10
			} = req.query
			df = parseInt(df)? df: currentDate.getDay()
			const tempDate = (new Date()).toDateString() 
			const tempDateTime = new Date(tempDate +' '+tf)
			tf = isNaN((new Date(tempDateTime)).getDate())? currentDate.toLocaleString('en-GB', {timeStyle: 'medium'}): tf
			
			let value_of_obj = {code_class, lim}
			if(latest) value_of_obj = {...value_of_obj, df, tf}
			const indexOfObj = key=>Object.keys(value_of_obj).indexOf(key) + 1
			
			sql.values = Object.values(value_of_obj);
			
			//set SQL text and filter
			order_type = order_type.toUpperCase()
			let orderType = order_type === 'DESC' || order_type === 'ASC'? order_type: ''
			const orderByDay = `
				CASE WHEN CONCAT(day, '')::INTEGER < $${indexOfObj('df')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
					 WHEN CONCAT(day, '')::INTEGER > $${indexOfObj('df')} THEN CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
					 WHEN time < $${indexOfObj('tf')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
					 ELSE CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
				END`
			// const orderByTime = `
				// CASE WHEN CONCAT(day, '')::INTEGER != $${indexOfObj('df')} THEN CURRENT_DATE + time
					 // WHEN time < $${indexOfObj('tf')} THEN (CURRENT_DATE + time) + '24 H'
					 // ELSE CURRENT_DATE + time
				// END
			// `
			latest = latest ? `ORDER BY ${orderByDay}, time ${orderType}`: ''
			sql.text = `SELECT * FROM schedules WHERE code_class=$${indexOfObj('code_class')} ${latest} LIMIT $${indexOfObj('lim')}`;
			
			result = await querySync(sql);
			return res.json({data: result.rows});
			
		}catch(err){
			next(err)
		}
	}
	
}