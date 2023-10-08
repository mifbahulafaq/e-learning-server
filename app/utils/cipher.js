const { createCipheriv } = require('crypto');
const { Buffer } = require('buffer');
const { keyOfCipher, ivOfCipher} = require('../../config');

module.exports = async function(data){
	
	const algorithm = 'aes-192-cbc';
	
	try{
		
		const key = Buffer.from(keyOfCipher, 'hex')
		const iv = Buffer.from(ivOfCipher, 'hex')
		
		const cipher = createCipheriv(algorithm, key, iv);
		
		let encrypted = cipher.update(data, 'utf8', 'base64');
		const finalEncrypted = cipher.final('base64');
		
		return encrypted += finalEncrypted;
		
		
	}catch(err){
		throw err
	}
}