module.exports = function noWhitespace(v){
	if(!v) return v
	return v.replace(/(^\s*)|(\s*$)/g, "")
};



