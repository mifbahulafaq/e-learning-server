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
const middlewares = require('./middlewares');
//import routers
const { authRouter, apiRouter } = require('./routers')

app.set('views', path.join(config.rootPath,'views'));
app.set('view engine', 'ejs');
//middlewares
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'));
app.use(cors({
    credentials: true,
	origin: "http://localhost:3000"
  }))
app.use('/auth',authRouter);
app.use('/public/photo',express.static(path.join(__dirname, 'public/photo')))
app.use(middlewares.decodeToken);
app.use(
	'/private/document/:user_id',
	middlewares.privateStaticFile, 
	express.static(path.join(__dirname, 'public/document'))
)
app.use('/api', apiRouter);
//Error handling router
app.use((req,res,next)=>{
	next(createError(404));
})
app.use(middlewares.errorHandling);

http.createServer(app)
.listen(port,()=>{
	console.log(`Server is running`);
});
