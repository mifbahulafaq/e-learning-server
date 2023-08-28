const qs = require('qs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const config = require('../../config')
const { querySync } = require('../../database')

const { findUser, insertUser } = require('../user/service')

const sqlGet = require('../utils/sqlGet')

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
			throw new Error(err)
			
		}
	},
	
	async googleOauth(code){
		
		try{
			console.log(this)
			//use the code to get the id and access tokens
			const { data: { id_token, access_token } } = await this.getGoogleOauthToken({ code })
			
			//use the tokens to get the user info
			const { data: { name, verified_email, email, picture } } = await this.getGooleUser({ id_token, access_token})
			
			if(!verified_email) return { error:1, message:"Email isn't verified", statusCode: 401}
			
			//update user if user alredy exists or create new user
			
			const sqlResult = await findUser({ email })
			
			if(sqlResult.rowCount){
				
				const { user_id } = sqlResult.rows[0]
				
				return await this.signToken(user_id, {update: true})
				
			}else{
				
				const sql_createId = {
					text: "SELECT nextval('userid')"
				}
				sqlResult = await querySync(sql_createId)
				
				const user_id = parseInt(sqlResult.rows[0].nextval)
				
				const { access_token, refresh_token } = await this.signToken(user_id)
				
				await insertUser({user_id, name, email, token: `{${access_token}}`, picture})
				
				return { access_token, refresh_token }
			}
		}catch(err){
			throw err 
		}
	},
	
	async signToken(user_id){
		
		const access_token = jwt.sign({user_id}, config.accessTokenSecretKey)
		const refresh_token = jwt.sign({user_id}, config.refreshTokenSecretKey)
		
		return { access_token, refresh_token }
	},
	
	async refreshToken(refreshToken){
		
		try{
			
			const { user_id } = jwt.verify(refreshToken, config.refreshTokenSecretKey)
			
			return jwt.sign({user_id}, config.accessTokenSecretKey)
			
		}catch(err){
			throw new Error(err)
		}
	}
	
}
