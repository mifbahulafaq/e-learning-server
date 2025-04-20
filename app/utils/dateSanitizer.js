module.exports =  function dateSanitizer(value){
	 return value.map(e=>moment.parseZone(e).format("YYYY-MM-DD HH:mm:ssZ"));
}