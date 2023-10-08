

//end test

// const { Buffer } = require('buffer');
// console.log(Buffer.from('sad'))
const http = require('http');
const path = require('path');
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const app = express();
let config = require('./config');
let port = config.port || 6000;
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
app.use('/api/get-token', async (req,res, next)=>{
	
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
	
	try{
		const { access_token, refresh_token } = await authService.signToken(44);
		
		res.cookie('access_token', access_token, accessTokenCookieOptions)
		res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions)
		res.cookie('logged_in', true, {...accessTokenCookieOptions, httpOnly: false})
			
		res.json({
			message: 'Get token is successful',
			token: access_token
		})
	}catch(err){
		next(err)
	}
	
})

const cipher = require('./app/utils/cipher');
const sqlUpdate = require('./app/utils/sqlUpdate');
const userService = require('./app/user/service');

app.use('/api/test', async (req, res, next)=>{
	
	try{
		//const dencryptedData = await decipher('vz8cF+xFSKChmeKdM7BdI29uqG5mn6vTODaQXgXGheM=');
		const users = await userService.findUser({verified: false, email: 'mifbahulafaq@gmail.com'});
		console.log(users)
		res.send('testing')
	}catch(err){
		console.log(err)
		res.send('err')
	}
	
	
	
})

app.use('/auth',authRouter);
app.use('/public/photo',express.static(path.join(__dirname, 'public/photo')))
app.use('/private/document/:user_id',privateStaticFile, express.static(path.join(__dirname, 'public/document')))

app.use(decodeToken);
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
		error: 1,
		message: err.message
	});
	
})

http.createServer(app)
.listen(port,()=>{
	console.log(`Server is running`);
});
