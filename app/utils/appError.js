module.exports = function(message, status){
	const err = new Error(message)
	if(status) err.status = status
	return err
}