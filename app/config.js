require('dotenv').config();
const path = require('path');

module.exports = {
	port : process.env.PORT,
	serviceName : process.env.SERVICE_NAME,
	rootPath: path.resolve(__dirname, '..'),
	secretKey:  process.env.SECRET_KEY,
	uploadPhoto: {
		dest: path.resolve(__dirname, '../public/photo'),
		ext: ['.jpg','.png','.jpeg'],
		size: 300000 //300kb
	},
	uploadDoct: {
		dest: path.resolve(__dirname, '../public/document'),
		ext: ['.pdf','.docx','.doc'],
		size: 10000000 //300kb
	},
	
	dbHost : process.env.DB_HOST,
	dbPort : process.env.DB_PORT,
	dbName : process.env.DB_NAME,
	dbUser : process.env.DB_USER,
	dbPassword : process.env.DB_PASSWORD,
}