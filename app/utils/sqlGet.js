module.exports = (table, where = {})=>{
	
	const keyOfWhere = Object.keys(where)[0]
	
	let sql =  {
		text: `SELECT * FROM ${table}`,
		values: []
	}
	
	if(keyOfWhere){
		sql.text += ` WHERE ${keyOfWhere} = $1`
		sql.values.push(where[keyOfWhere])
	}
	
	return sql
}