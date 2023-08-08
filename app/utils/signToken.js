const jwt, { SignOptions } require('jsonwebtoken')
const config require('../../config')


module.exports = {
	
	async signJwt(payload, key, options){
		
		const privateKey = Buffer.from(config[key])
		console.log(privateKey)
		return 
		
	},
	
	async getToken(){
		
		console.log(this)
		
		return {}
	}
}