const { createCipheriv, randomFillSync } = require('crypto');
const { Buffer } = require('buffer');
const { keyOfCipher} = require('../../config');

module.exports = async function(data){
	
	const algorithm = 'aes-192-cbc';
	
	try{
		
		const key = Buffer.from(keyOfCipher, 'hex')
		
		const iv = await randomFillSync(Buffer.alloc(16));
		
		const cipher = createCipheriv(algorithm, key, iv);
		
		let encrypted = cipher.update(data, 'utf8', 'base64');
		const finalEncrypted = cipher.final('base64');
		
		return { encrypted: encrypted += finalEncrypted, iv: iv.toString('hex') }
		
		
	}catch(err){
		throw err
	}
}