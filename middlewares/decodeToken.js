const jwt = require('jsonwebtoken');
const { querySync } = require('../database');
const config = require('../config');
const getToken = require('../app/utils/get-token');

module.exports = async function(req, res, next){
	const token = getToken(req);
	if(!token) return next();
	
	const query ={
		text: 'SELECT * FROM users WHERE $1 = ANY(token)',
		values: [token]
	}
	
	try{
		const result = await querySync(query);
		
		if(!result.rowCount) return res.json({
			error: 1,
			message: 'Token expired'
		})
		
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