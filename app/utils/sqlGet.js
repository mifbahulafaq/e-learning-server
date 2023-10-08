module.exports = (table, where = {})=>{
	
	const keyOfWhere = Object.keys(where)
	
	let sql =  {
		text: `SELECT * FROM ${table}`,
		values: []
	}
	
	keyOfWhere.forEach((e,i)=>{
		
		if(i == 0) {
			sql.text += ` WHERE ${e} = $${i+1}`;
		}else{
			sql.text += ` AND ${e} = $${i+1}`;
		}
		
		sql.values.push(where[e])
	})
	
	return sql
}