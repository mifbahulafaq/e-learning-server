const moment = require('moment');

module.exports = function isDate(value){ 

	const isValid = moment.parseZone(value, "YYYY-MM-DD HH:mm:ss", true).isValid();
	
	if(!isValid) throw new Error(`the format of ${value} isn't date`);
		
	return true;
}