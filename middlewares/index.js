const decodeToken = require('./decodeToken');
const errInsert = require('./errInsert');
const errorHandling = require('./errorHandling');
const identifyWhoUserIs = require('./identifyWhoUserIs');
const locateFile = require('./locateFile');
const privateStaticFile = require('./privateStaticFile');
const upload = require('./upload');

module.exports = {
	decodeToken,
	errInsert,
	errorHandling,
	identifyWhoUserIs,
	locateFile,
	privateStaticFile,
	upload,
}