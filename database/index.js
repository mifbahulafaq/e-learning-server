const { Pool, Client } = require('pg');
const config = require('../app/config');

const pool = new Pool({
	
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbName,
  password: config.dbPassword,
  port: config.dbPort
  
})

module.exports = {
	...pool,
	queryAsync(){
		
		let arrArgument = Array.from(arguments)
		let cb = arrArgument.pop();
		const start = Date.now();
		
		pool.query(...arrArgument,(err,result)=>{
			
			if(!err){
				
				const duration = `${Date.now() - start} ms`;
				console.log(`executed query`, {
					sql:arrArgument[0], 
					duration, 
					rows: result.rowCount}
				)
			}
			cb(err,result);
			
		})

	},
	async querySync(){
		let arrArgument = Array.from(arguments)
		const start = Date.now();
		
		try{
			const result = await pool.query(...arrArgument);
			const duration = `${Date.now() - start} ms`;
			console.log(`executed query`, {
				sql:arrArgument[0], 
				duration, 
				rows: result.rowCount}
			)
			return result;
		}catch(err){
			throw err;
		}

	}
};
