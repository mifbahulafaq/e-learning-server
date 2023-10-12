require('dotenv').config();
const path = require('path');

module.exports = {
	port : process.env.PORT,
	client_url : process.env.CLIENT_URL,
	serviceName : process.env.SERVICE_NAME,
	rootPath: path.resolve(__dirname),

	keyOfCipher:  process.env.KEY_OF_CIPHER,
	
	accessTokenSecretKey:  process.env.ACCESS_TOKEN_SECRET_KEY,
	refreshTokenSecretKey:  process.env.REFRESH_TOKEN_SECRET_KEY,
	
	accessTokenPrivateKey: process.env.ACCESS_TOKEN_PRIVATE_KEY,
	accessTokenPublicKey: process.env.ACCESS_TOKEN_PUBLIC_KEY,
	refreshTokenPrivateKey: process.env.REFRESH_TOKEN_PRIVATE_KEY,
	refreshTokenPublicKey: process.env.REFRESH_TOKEN_PUBLIC_KEY,
	accessTokenExpireIn: 1, //minute
	refreshTokenExpireIn: 59,//minute
	uploadPhoto: {
		dest: path.resolve(__dirname, './public/photo'),
		ext: ['.jpg','.png','.jpeg'],
		size: 500000 //500kb
	},
	uploadDoct: {
		dest: path.resolve(__dirname, './public/document'),
		ext: ['.pdf','.docx','.doc'],
		size: 3000000 //3MB
	},
	
	dbHost : process.env.DB_HOST,
	dbPort : process.env.DB_PORT,
	dbName : process.env.DB_NAME,
	dbUser : process.env.DB_USER,
	dbPassword : process.env.DB_PASSWORD,
	
	googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
	googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
	googleRedirect: process.env.GOOGLE_OAUTH_REDIRECT,
	
	//transporter config
	transporterService: process.env.TRANSPORTER_SERVICE,
	transporterHost: process.env.TRANSPORTER_HOST,
	transporterPort: process.env.TRANSPORTER_PORT,
	transporterSecure: process.env.TRANSPORTER_SECURE,
	transporterPass: process.env.TRANSPORTER_PASS,
	transporterUser: process.env.SERVICE_EMAIL,
}