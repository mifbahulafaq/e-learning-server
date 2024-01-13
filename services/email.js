const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2
const config = require('../config');

module.exports = {
	
	async sendEmail(message){
		
		try{
			
			const oauth2Client =new OAuth2(
				config.transporterCientId,
				config.transporterClientSecret,
				 "https://developers.google.com/oauthplayground"
			)
			
			oauth2Client.setCredentials({ refresh_token: config.transporterRefreshToken })
			
			const accessToken = await new Promise((resolve, reject)=>{
				
				oauth2Client.getAccessToken((err, token)=>{
					
					if(err) reject('Failed to create acces token');
					
					resolve(token);
				})
				
			})
			
			const opt = {
				service: 'Gmail', 
				auth: {
					type: 'OAuth2',
					user: config.transporterUser,
					accessToken,
					clientId: config.transporterCientId,
					clientSecret: config.transporterClientSecret,
					refreshToken: config.transporterRefreshToken
				},
				debug: true,
				logger: true
			}
			
			const transporter = nodemailer.createTransport(opt);
			const result = await transporter.sendMail(message);
			
			if(result.reject?.length) throw new Error('Email rejected');
			
			return result;
			
		}catch(err){

			throw err
		}
		
	},
	
}