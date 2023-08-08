
const sqlUpdate = require('./app/utils/sqlUpdate')
const http = require('http');
const path = require('path');
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const app = express();
const pool = require('./database');
let config = require('./config');
let port = config.port || 3000;
//import middlewares
const decodeToken = require('./middlewares/decodeToken');
const privateStaticFile = require('./middlewares/privateStaticFile');

//import routers
const { authRouter, apiRouter } = require('./routers')

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
app.use('/api', apiRouter);
//router test
app.use('/trying', (req,res)=>{
		
		const returnSql = sqlUpdate(
			{user_id: 1},
			'users',
			 {
				name: 'mif',
				email: 'mif@',
				gender: undefined
			},
		)
		console.log(returnSql)
		return res.send('test')
})

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
