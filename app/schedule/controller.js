const classService = require('../class/service');
const service = require('./service');

module.exports = {
	
	async createSchedule(req, res, next){
		
		try{
			
			const result = await service.add();
			
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
				limit: lim= 100,
				timeStart,
				timeLimit
			} = req.query
			
			df = parseInt(df)? df: currentDate.getDay()
			
			const tempDate = (new Date()).toDateString() 
			const tempDateTime = new Date(tempDate +' '+tf)
			tf = isDate(tempDateTime)? currentDate.toLocaleString('en-GB', {timeStyle: 'medium'}): tf;
			timeStart = isDate(timeStart)? timeStart: '';
			timeLimit = isDate(timeLimit)? timeLimit: '';
			
			let value_of_obj = {code_class, lim}
			//if(latest) value_of_obj = {...value_of_obj, df, tf}
			
			//function to get index of obj
			const indexOfObj = key=>Object.keys(value_of_obj).indexOf(key) + 1
			
			
			//set SQL filter
			order_type = order_type.toUpperCase()
			let orderType = order_type === 'DESC' || order_type === 'ASC'? order_type: ''
			
			/*const orderByDay = `
				CASE WHEN CONCAT(day, '')::INTEGER < $${indexOfObj('df')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
					 WHEN CONCAT(day, '')::INTEGER > $${indexOfObj('df')} THEN CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
					 WHEN time < $${indexOfObj('tf')} THEN (CONCAT(day, '')::INTEGER + 7) - $${indexOfObj('df')}
					 ELSE CONCAT(day, '')::INTEGER - $${indexOfObj('df')}
				END`
			 const orderByTime = `
				 CASE WHEN CONCAT(day, '')::INTEGER != $${indexOfObj('df')} THEN CURRENT_DATE + time
					  WHEN time < $${indexOfObj('tf')} THEN (CURRENT_DATE + time) + '24 H'
					  ELSE CURRENT_DATE + time
				 END
			 `
			 */
			latest = latest ? `ORDER BY day, time ${orderType}`: '';
			
			const singleScheduleData = "(CURRENT_DATE + (CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) > CONCAT(day, '')::INTEGER THEN (CONCAT(day, '')::INTEGER + 7) - EXTRACT(DOW FROM CURRENT_DATE) ELSE CONCAT(day, '')::INTEGER - EXTRACT(DOW FROM CURRENT_DATE) END)::INT) + time";
			
			const filterDate = {
				timeStart: '',
				timeLimit: ''
			}
			
			if(timeStart){
				value_of_obj = {...value_of_obj, timeStart}
				filterDate.timeStart = `AND ${singleScheduleData} >= $${indexOfObj('timeStart')}`;
			}
			if(timeLimit && timeLimit){
				value_of_obj = {...value_of_obj, timeLimit}
				filterDate.timeLimit = `AND ${singleScheduleData} <= $${indexOfObj('timeLimit')}`;
			}
			
			sql.text = `SELECT * FROM schedules WHERE code_class=$${indexOfObj('code_class')} ${filterDate.timeStart} ${filterDate.timeLimit} ${latest} LIMIT $${indexOfObj('lim')}`;
			sql.values = Object.values(value_of_obj);
			
			result = await querySync(sql);
			return res.json({data: result.rows});
			
		}catch(err){
			next(err)
		}
	}
	
}