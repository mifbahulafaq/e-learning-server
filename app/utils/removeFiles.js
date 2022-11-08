const fs = require('fs');

module.exports = function(files){
	
	files.forEach(e=>{
		if(fs.existsSync(e?.path)) {
			fs.unlinkSync(e.path)
		}
	});
}