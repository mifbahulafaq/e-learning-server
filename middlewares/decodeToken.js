const jwt = require('jsonwebtoken');
const config = require('../config');
const appError = require('../app/utils/appError')

module.exports = async function(req, res, next){
	
	try{
	
		const token = req.cookies.access_token
		
		if(!token) return next(appError('Token expired',401))
		
		req.user = jwt.verify(token, config.accessTokenSecretKey);
		next();
		
	}catch(err){
		if(err && err.name === 'JsonWebTokenError'){
			
			return res.json({
				error: 1,
				message: err.message
			})
		}
		next(err);
	}
	
}