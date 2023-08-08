const qs = require('qs')
const axios = require('axios')
const config = require('../config')

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
	}
}
