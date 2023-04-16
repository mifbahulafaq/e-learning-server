const { querySync } = require('../../database');

module.exports = async function(req, table, columns){
	
	let sqlText = '';
	let sqlValues = [];
	const where = Object.keys(req.params)[0]
	
	
	columns.forEach((e,i)=>{
		
		if(req.body[e]){
			
			sqlText += `${e} = $${sqlValues.length+1}`;
			sqlValues.push(req.body[e]);
			
		}else{
			
			sqlText += `${e} = ${e}`;
		}
		sqlText += e === columns[columns.length-1]?'':', ';
		
	})
	
	const sql = {
		text: `UPDATE ${table} SET ${sqlText} WHERE ${where}=$${sqlValues.length+1} RETURNING *`,
		values: [...sqlValues,  parseInt(req.params[where]) || undefined]
	}
	return await querySync(sql)
}