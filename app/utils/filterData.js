module.exports = function(columns = [], body = {}){
	for( key in body){
		if(!columns.includes(key)) delete body[key];
	}
	
	return body;
}