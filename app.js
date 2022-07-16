const http = require('http');
const path = require('path');
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const app = express();
const pool = require('./database');
let config = require('./app/config');
let port = config.port || 3000;

//import middlewares
const decodeToken = require('./middlewares/decodeToken');

//import routers
const authRouter = require('./app/auth/router');
const classRouter = require('./app/class/router');
const studentRouter = require('./app/student/router');
const studentClassDiscuss = require('./app/class-discussion/router');


app.set('views', path.join(config.rootPath,'views'));
app.set('view engine', 'ejs');

//middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'));
app.use(decodeToken);
app.use(cors())

app.use('/auth',authRouter);
app.use('/api',classRouter);
app.use('/api',studentRouter);
app.use('/api',studentClassDiscuss);

//Error handling router
app.use((req,res,next)=>{
	next(createError(404));
})
app.use((err,req,res,next)=>{
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	
	res.status(err.status || 500);
	res.render('error');
	
})

http.createServer(app)
.listen(port,()=>{
	console.log(`Server is running`);
});