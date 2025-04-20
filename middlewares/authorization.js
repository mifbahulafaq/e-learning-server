module.exports = function(req, res, next){
	
	//req.params.id_matt is single
	
	console.log(req.baseUrl)
	console.log(req.originalUrl)
	console.log(req.path)
	res.send('mdd')
}