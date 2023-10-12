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
			
			return transporter.sendMail(message)
			
		}catch(err){

			throw err
		}
		
	},
	
}