const qs = require('qs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const config = require('../../config')
const { querySync } = require('../../database')

//services
const userService = require('../user/service');
const emailService = require('../../services/email');

//utils
const appError = require('../utils/appError');
const sqlGet = require('../utils/sqlGet');
const cipher = require('../utils/cipher');
const decipher = require('../utils/decipher');

module.exports = {
	
	async getGoogleOauthToken({ code }){
		
		const urlToken = 'https://oauth2.googleapis.com/token'
		const options = {
			code,
			client_id: config.googleClientId,
			client_secret: config.googleClientSecret,
			redirect_uri: config.googleRedirect,
			grant_type: 'authorization_code'
		}
		
		try{
			const result = await axios.post(
				urlToken, 
				qs.stringify(options), 
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					}
				}
			)
			return result
		}catch(err){
			
			console.log('Failed to fetch google oauth token')
			throw new Error(err)
			
		}
		
	},
	
	async sendEmailVerification({ user_id, email}){
		
		try{
			
			//create token
			const stringData = JSON.stringify([ user_id, email ]);
			let { encrypted: token, iv} = await cipher(stringData);
			
			//store token to verify email;
			const updateSql = {
				text: 'UPDATE users SET token = ARRAY[[$1, $2]] WHERE user_id = $3',
				values: [token, iv, user_id]
			}
			await querySync(updateSql);
			
			token = encodeURIComponent(token);
				
			const link = `${config.client_url}/verify?t=${token}`;
				
			const message = {
				from: `"${config.serviceName}" <${config.serviceEmail}>`,
				to: email,
				subject: 'Verification Email Messages',
				text: 'text',
				html: `
				<h1>HALO</h1>
				<a href=${link} >${link}</a>
				`
			}
			
			await emailService.sendEmail(message);
			
		}catch(err){
			
			throw err
		}
	},
	
	async register(payload){
		
		const errorMessage = 'Registration failed';
		
		try{
			
			//add user
			const insertingResult = await userService.insertUser(payload, { return : true });
			
			const user = insertingResult.rows[0];
			
			if(!user) throw appError(errorMessage, 200); 
			
			//create token
			const { user_id, email } = user;
			
			//start sending a email verification
			await this.sendEmailVerification({ user_id, email })
			
			
		}catch(err){ 
			
			throw err
			
		}
	},
	
	async forgotPassword(email){
		
		try{
			const findingEmail = await userService.findUser({ email });
			
			if(!findingEmail.rowCount) throw appError('Email not found', 200);
			
			let {password, token: t, ...dataRemains } = findingEmail.rows[0];
			
			//create token
			const stringData = JSON.stringify([ dataRemains.user_id, dataRemains.email ]);
			let { encrypted: token, iv} = await cipher(stringData);
			
			//store token to verify email;
			const updateSql = {
				text: 'UPDATE users SET token = token || ARRAY[[$1, $2]] WHERE user_id = $3',
				values: [token, iv, dataRemains.user_id]
			}
			await querySync(updateSql);
			token = encodeURIComponent(token);
			
			const link = `${config.client_url}/reset-password?t=${token}`;
			
			const message = {
				from: `"${config.serviceName}" <${config.serviceEmail}>`,
				to: email,
				subject: 'Reset Password',
				text: 'text',
				html: `
				<a href=${link} >${link}</a>
				`
			}
			
			await emailService.sendEmail(message)
			
			return dataRemains;
			
		}catch(err){
			throw err
		}
		
	},
	
	async resetPassword(user_id, pwd){
		
		try{
			const result = await userService.updateUser({user_id}, {password: pwd, token: null});
			
			if(!result.rowCount) throw appError('Failed to reset password', 200);
			
			const { token, password, ...dataRemains} = result.rows[0]
			return dataRemains;
		}catch(err){
			throw err
		}
		
	},
	
	async verifyEmail(user){
		
		const errorMessage = "Couldn't verify your email";
		const errorStatus = 200;
		
		try{
			
			const verifiedEmail = await userService.findUser({ verified: true, user_id: user?.user_id});
			
			if(verifiedEmail.rowCount) throw appError('Email has been verified', errorStatus);
			
			const updateData = { verified: 't', provider: 'Google', token: null};
			
			const userData = await userService.updateUser({user_id: user?.user_id, verified: false}, updateData)
			
			if(!userData.rowCount) throw appError(errorMessage, errorStatus);
			
			const { password, token: t, ...remains } = userData.rows[0];
			
			return remains;
			
			
		}catch(err){
			console.log(err)
			if(err.status === 200) throw err;
			
			throw appError(errorMessage, errorStatus);
		}
		
	},
	async getGooleUser({ id_token, access_token }){
		
		const urlUserInfo = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
		try{
			
			const result = await axios.get(
				urlUserInfo, 
				{
					headers: {
						Authorization: `Bearer ${id_token}`
					}
				}
			)
			return result
			
		}catch(err){
			
			console.log('Failed to get google user info')
			throw err
			
		}
	},
	
	async googleOauth(code){
		
		try{
			//use the code to get the id and access tokens
			const { data: { id_token, access_token } } = await this.getGoogleOauthToken({ code })
			
			//use the tokens to get the user info
			const { data: { name, verified_email, email, picture } } = await this.getGooleUser({ id_token, access_token})
			
			if(!verified_email) return { error:1, message:"Email isn't verified", statusCode: 401}
			
			//update user if user alredy exists or create new user
			
			const sqlResult = await userService.findUser({ email })
			
			if(sqlResult.rowCount){
				
				const { user_id } = sqlResult.rows[0]
				
				return await this.signToken(user_id)
				
			}else{
				
				const sql_createId = {
					text: "SELECT nextval('userid')"
				}
				sqlResult = await querySync(sql_createId)
				
				const user_id = parseInt(sqlResult.rows[0].nextval)
				
				const { access_token, refresh_token } = await this.signToken(user_id)
				
				await userService.insertUser({user_id, name,verified: true, email, provider: 'Google', picture})
				
				return { access_token, refresh_token }
			}
		}catch(err){
			throw err 
		}
	},
	
	async signToken(user_id){
		
		const access_token = jwt.sign(
			{user_id}, 
			config.accessTokenSecretKey, 
			{
				expiresIn: config.accessTokenExpireIn * 60
			}
		)
		const refresh_token = jwt.sign(
			{user_id}, 
			config.refreshTokenSecretKey, 
			{expiresIn: config.refreshTokenExpireIn * 60}
		)
		
		return { access_token, refresh_token }
	},
	
	async refreshToken(refreshToken){
		
		try{
			
			const { user_id } = jwt.verify(refreshToken, config.refreshTokenSecretKey);
			
			const user = await querySync({
				text: 'SELECT * FROM users WHERE user_id = $1',
				values: [user_id]
			})
			
			if(!user.rowCount) throw appError("Couldn't refresh token", 200);
			
			return jwt.sign({user_id}, config.accessTokenSecretKey)
			
		}catch(err){
			
			const jwtErrorNames = ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'];
			
			if(jwtErrorNames.includes(err.name)) throw appError("Couldn't refresh token", 200);
			
			throw err
		}
	}
	
}
