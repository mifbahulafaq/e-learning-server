const { querySync } = require('../database');
const jwt = require('jsonwebtoken');
const config = require('../config');

const userService = require('../app/user/service');

const appError = require('../app/utils/appError');
const decipher = require('../app/utils/decipher');

module.exports = async function(req, res, next){
	
	const tokenMessage = 'Invalid token or token expired';
	const errorStatus = 200;
	
	try{
	
		if(req.cookies.access_token){
			
			let token = req.cookies.access_token;
			
			req.user = jwt.verify(token, config.accessTokenSecretKey);
			
			const user = await userService.findUser({user_id: req.user.user_id});
			
			if(!user.rowCount) return next(appError(tokenMessage, errorStatus));
			
			return next();
		}
		
		if(req.query.t){
			
			let decodedToken = decodeURIComponent(req.query.t);
			
			const findingToken = await querySync({
				text: "SELECT * FROM users WHERE $1 = ANY(token)",
				values: [decodedToken]
			})
			
			if(!findingToken.rowCount) throw appError(tokenMessage, errorStatus);
			
			const [token, iv] = findingToken.rows[0].token[0];
			
			const stringData = await decipher(token, iv);
			let [ user_id, email ] = JSON.parse(stringData);
			
			req.user = { user_id };
			
			return next();

		}
		
		next(appError("You aren't logged in", 200));
		
	}catch(err){
		
		const jwtErrorNames = ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'];
		
		if(
			jwtErrorNames.includes(err.name) || err.name === 'URIError'
		) return next(appError(tokenMessage, errorStatus));
		
		next(err);
	}
	
}