const { querySync } = require('../database');
const jwt = require('jsonwebtoken');
const config = require('../config');
const appError = require('../app/utils/appError')

module.exports = async function(req, res, next){
	
	try{
	
		const token = req.cookies.access_token;
		
		if(!token){
			return res.json({
				error: 1,
				message: "You aren't logged in"
			})
		}
		
		req.user = jwt.verify(token, config.accessTokenSecretKey);
		
		const user = await querySync({
			text: 'SELECT * FROM users WHERE user_id = $1',
			values: [req.user.user_id]
		})
		
		if(!user.rowCount) return next(appError("User with that token isn't exist", 200));
		
		next();
		
	}catch(err){
		
		const jwtErrorNames = ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'];
		
		if(jwtErrorNames.includes(err.name)) return next(appError(err.message, 200));
		
		next(err);
	}
	
}