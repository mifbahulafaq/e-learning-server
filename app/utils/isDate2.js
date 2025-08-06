const moment = require('moment');

module.exports = function isDate(format){ 

	return value=>{
		
		const isValid = moment.parseZone(value, format, true).isValid();
		
		if(!isValid) throw new Error(`the format of ${value} must be ${format}`);
			
		return true;
	}
}