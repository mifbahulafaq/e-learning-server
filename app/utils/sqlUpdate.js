module.exports = function(where, table, data){
	
	let sqlText = '';
	let sqlValues = [];
	const keyOfWhere = Object.keys(where)[0]
	const keysOfData = Object.keys(data)
	
	for (let key in data){
		
		if(data[key]){
			
			sqlText += `${key} = $${sqlValues.length+1}`
			sqlValues.push(data[key])
			
		}else{
			
			sqlText += `${key} = ${key}`;
		}
		sqlText += key === keysOfData[keysOfData.length-1]?'':', ';
	}
	
	return {
		text: `UPDATE ${table} SET ${sqlText} WHERE ${keyOfWhere}=$${sqlValues.length+1} RETURNING *`,
		values: [...sqlValues,  parseInt(where[keyOfWhere]) || undefined]
	}
}