const nodemailer = require('nodemailer');
const config = require('../config')

module.exports = {
	
	async sendEmail(message){
		
		try{
			
			const transporter = nodemailer.createTransport({
				service: config.transporterService,
				host: config.transporterHost,
				port: config.transporterHost,
				secure: config.transporterSecure, // upgrade later with STARTTLS
				auth: {
					user: config.transporterUser,
					pass: config.transporterPass
				}
			});
			
			const result = await transporter.sendMail(message);
			
			if(result.reject?.length) throw new Error('Email rejected');
			
			return result;
			
		}catch(err){

			throw err
		}
		
	},
	
}