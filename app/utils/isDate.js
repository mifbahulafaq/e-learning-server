module.exports = function(date){
	return !isNaN((new Date(date)).getDate())
}