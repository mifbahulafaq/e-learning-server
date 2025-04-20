//several ways/questions to solve my desire
//-how to get pending status of javascript Promise
const { Pool, Client } = require('pg');
const config = require('../config');
const appError = require('../app/utils/appError')

const pool = new Pool({
	
  user: config.dbUser,
  host: config.dbHost,
  database: config.dbName,
  password: config.dbPassword,
  port: config.dbPort
  
})

function queryAsync(){
		
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

}
async function querySync(){
	
	try{
		
		let arrArgument = Array.from(arguments)
		const start = Date.now();
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

function setWhere(from, where){
	
	let text = '';
	const keysOfWhere = Object.keys(where)
	const valuesOfWhere = Object.values(where);
	
	for(let i = 0; i < keysOfWhere.length ; i++ ){
		
		text += i == 0? 'WHERE ': ' AND ';
		text += `${keysOfWhere[i]} = $${from+i}`;
		
	}
	
	return { text, values: valuesOfWhere };
	
}

const proto = {
	
	async exec(verb){
		
		if(!this.sql) {
			
			if(this[verb]){
				return await this[verb]()
			}else{
				return await this['find']()
			}
			
		}
		
		return await querySync(this.sql);
	},
	
	async execute(){
		// console.log('executing')
		if(typeof this.validate === "function"){
			// console.log('val')
			const val = this.validate();
			
			if(!val) return { rows: [] };
		}
		// console.log('pass validate fnc', this.sql)
		return await querySync(this.sql);
	},
	
	find(where = {}){
		
		this.select = function (v){
			
			const oldSelect = this.selection;
			
			this.selection = v;
			
			const arrOfSql = this.sql.text.split(oldSelect);
			
			this.sql = { ...this.sql, text : arrOfSql.join(this.selection)}
			
			return this
			
			// this[this.verb]();
		}
		
		const { text: whereText, values: whereValues } = setWhere(1, where)
		
		this.selection = "*";
		
		this.sql =  {
			text: `SELECT ${this.selection} FROM ${this.table} ${whereText}`,
			values: [...whereValues]
		}
		return this;
	},
	
	async insert(data){
		
		
		const keysOfData = Object.keys(data);
		
		
		if(!keysOfData.length) throw appError('No data sent', 200)
		
		const sqlColumn = keysOfData.join(",")
		const sqlValues = keysOfData.map((e,i)=>`$${i+1}`)
		const valArr = keysOfData.map((e,i)=>data[e])
		
		 this.sql = {
			 text: `INSERT INTO ${this.table}(${sqlColumn}) VALUES(${sqlValues}) returning *`,
			 values: valArr
		 }
		 
		return await this.exec('insert')
	},
	
	update(data, where){
		
		if(!this.verb){
			
			const keysOfDatas = Object.keys(data);
			const keysOfWhere = Object.keys(where);
			
			this.verb = 'update';
			this.data = [];
			this.where = [];
			this.values = [];
			
			this.validate = function(){
				return Boolean(this.data.length)
			}
			
			this.setWhere = function (text, value){
				this.where.push(text);
				this.setValues(value);
				
				return this[this.verb]();
			}

			this.setData = function (text, value){			
				this.data.push(text)
				this.setValues(value);
				
				return this[this.verb]();
			}

			this.setValues = function (value){
				if(Array.isArray(value)){
					this.values.push(...value);
				}else{
					this.values.push(value);
				}
			
			}
			
			//set data
			keysOfDatas.forEach((e,i)=> this.setData(`${e} = $${i+1}`, data[e]))
			//set where
			keysOfWhere.forEach(e=> this.setWhere(`${e} = $${this.values.length + 1}`, where[e]))
			
		}
		
		let sql= `UPDATE ${this.table}`;
		let setText = "";
		let whereText = "";
		
		this.data.forEach((e,i)=>{
			setText += i == 0? ` SET ${e}`: `, ${e}`;
		})
		this.where.forEach((e,i)=>{
			whereText += i == 0? ` WHERE ${e}`: ` AND ${e}`
		})
		
		// const keysOfWhere = Object.keys(this.where);
		
		this.sql = { text: sql+setText+whereText+" RETURNING *", values: this.values}
		
		return this;
	},
	
	async delete(where){
		
		//set where
		const { text: whereText, values: whereValues } = setWhere(1, where)
		
		this.sql = {
			text: `DELETE FROM ${this.table} ${whereText} RETURNING *`,
			values: [...whereValues]
		}
		
		return await this.exec('delete');
	},
}

function Query(table){
	this.table = table
}

Query.prototype = proto;

module.exports = {
	Query,
	queryAsync,
	querySync
}
