module.exports = function(req){
	return req.headers.authorization?
	req.headers.authorization.replace('Bearer ',''):
	null;
}