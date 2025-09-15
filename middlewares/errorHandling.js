const { removeFiles } = require('../services/file');

module.exports = (err,req,res,next)=>{
	// set locals, only providing error in development
	//res.locals.message = err.message;
	//res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	//removing the files, if exist

	console.log('error', err)
	
	if(req.files){
		removeFiles(req.files);
	}else if(req.file){
		removeFiles([req.file]);
	}
	
	err.status = err.status || 500;
	
	const data = {status: err.status, error: 1, message: err.message};
	if(err.field) data.field = err.field;
	
	res.status(err.status).json(data);
	
}