module.exports = function(message, status){
	const err = new Error(message)
	err.status = status
	return err
}