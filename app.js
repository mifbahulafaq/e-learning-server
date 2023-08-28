

//end test


const http = require('http');
const path = require('path');
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const app = express();
const pool = require('./database');
let config = require('./config');
let port = config.port || 3000;
const jwt = require('jsonwebtoken');
//import middlewares
const decodeToken = require('./middlewares/decodeToken');
const privateStaticFile = require('./middlewares/privateStaticFile');

//import routers
const { authRouter, apiRouter } = require('./routers')

app.set('views', path.join(config.rootPath,'views'));
app.set('view engine', 'ejs');

//middleware
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'));
app.use(cors({
    credentials: true,
	origin: "http://localhost:3000"
  }))

//router test

//test
const authService = require('./app/auth/service')
app.use('/api/trying', async (req,res)=>{
		
		 let user = true;
		
		 console.log(req.cookies)
		
		 if(!user){
		
			 const accessTokenCookieOptions = {
				 expires: new Date(Date.now() + config.accessTokenExpireIn * 60 * 1000),
				 maxAge: config.accessTokenExpireIn * 60 * 1000,
				 httpOnly: true,
				 sameSite: 'lax'
			 }
			 const refreshTokenCookieOptions = {
				 expires: new Date(Date.now() + config.refreshTokenExpireIn * 60 * 1000),
				 maxAge: config.refreshTokenExpireIn * 60 * 1000,
				 httpOnly: true,
				 sameSite: 'lax'
			 }
			 res.cookie('access_token', 'adsdas', accessTokenCookieOptions)
			 res.cookie('refresh_token', 'dsaasd', refreshTokenCookieOptions)
			 res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
		 }
		
		res.send()
		// try{
			// const decodedToken = await jwt.verify('dasad', config.refreshTokenSecretKey)
			// console.log(decodedToken)
			// return res.status(500).json({
				// message:'Logged in successfully',
				// token: 'asdads'
			// })
		// }catch(err){
			// console.log(err)
			// res.send()
		// }
})

app.use('/auth',authRouter);
app.use(decodeToken);

app.use('/public/photo',express.static(path.join(__dirname, 'public/photo')))
app.use('/private/document/:user_id',privateStaticFile, express.static(path.join(__dirname, 'public/document')))
app.use('/api', apiRouter);

//Error handling router
app.use((req,res,next)=>{
	next(createError(404));
})
app.use((err,req,res,next)=>{
	// set locals, only providing error in development
	//res.locals.message = err.message;
	//res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	err.status = err.status || 500;
	
	return res.status(err.status).json({
		status: err.status,
		message: err.message
	});
	
})

http.createServer(app)
.listen(port,()=>{
	console.log(`Server is running`);
});
