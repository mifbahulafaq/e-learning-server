require('dotenv').config();
const path = require('path');

module.exports = {
	port : process.env.PORT,
	serviceName : process.env.SERVICE_NAME,
	imageSize: 300000,//300kb,
	rootPath: path.resolve(__dirname, '..'),
	secretKey:  process.env.SECRET_KEY,
	dbHost : process.env.DB_HOST,
	dbPort : process.env.DB_PORT,
	dbName : process.env.DB_NAME,
	dbUser : process.env.DB_USER,
	dbPassword : process.env.DB_PASSWORD
}