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
const privateStaticFile = require('./middlewares/privateStaticFile');

//import routers
const authRouter = require('./app/auth/router');
const classRouter = require('./app/class/router');
const classStudentRouter = require('./app/class-student/router');
const classDiscussRouter = require('./app/class-discussion/router');
const matterDiscussRouter = require('./app/matter-discussion/router');
const scheduleRouter = require('./app/schedule/router');
const matterRouter = require('./app/matter/router');
const examRouter = require('./app/exam/router');
const examAnsRouter = require('./app/exam-answer/router');
const examAnsCommentRouter = require('./app/exam-ans-comment/router');
const assignmentRouter = require('./app/matt-ass/router')
const assAnswerRouter = require('./app/ass-answer/router')


app.set('views', path.join(config.rootPath,'views'));
app.set('view engine', 'ejs');

//middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logger('dev'));
app.use(cors())
app.use(decodeToken);

app.use('/public/photo',express.static(path.join(__dirname, 'public/photo')))
app.use('/private/document/:user_id',privateStaticFile, express.static(path.join(__dirname, 'public/document')))
app.use('/auth',authRouter);
app.use('/api',classRouter);
app.use('/api',classStudentRouter);
app.use('/api',classDiscussRouter);
app.use('/api',matterDiscussRouter);
app.use('/api',scheduleRouter);
app.use('/api',matterRouter);
app.use('/api',examRouter);
app.use('/api',examAnsRouter);
app.use('/api',examAnsCommentRouter);
app.use('/api',assignmentRouter);
app.use('/api',assAnswerRouter);

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