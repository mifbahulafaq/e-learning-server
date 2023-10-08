module.exports = function(where, table, data){
	
	let sqlText = '';
	let sqlValues = [];
	let whereText = '';
	let whereValues = [];
	const keyOfWhere = Object.keys(where);
	const keysOfData = Object.keys(data);
	
	//set data
	for (let key in data){
		
		if(data[key]){
			
			sqlText += `${key} = $${sqlValues.length+1}`
			sqlValues.push(data[key])
			
		}else{
			
			sqlText += `${key} = ${key}`;
		}
		sqlText += key === keysOfData[keysOfData.length-1]?'':', ';
	}
	
	//set where
	keyOfWhere.forEach((e,i)=>{
		
		if(i == 0) {
			whereText += `WHERE ${e} = $${sqlValues.length + i + 1}`;
		}else{
			whereText += ` AND ${e} = $${sqlValues.length + i + 1}`;
		}
		
		whereValues.push(where[e])
	})
	
	return {
		text: `UPDATE ${table} SET ${sqlText} ${whereText} RETURNING *`,
		values: [...sqlValues,  ...whereValues]
	}
}