const { createDecipheriv } = require('crypto');
const { Buffer } = require('buffer');
const { keyOfCipher} = require('../../config');

module.exports = async function(encryptedData, iv){
	
	const algorithm = 'aes-192-cbc';
	
	try{
		
		const key = Buffer.from(keyOfCipher, 'hex')
		const iv2 = Buffer.from(iv, 'hex')
		
		const decipher = createDecipheriv(algorithm, key, iv2);
		
		let dencrypted = decipher.update(encryptedData, 'base64', 'utf8');
		const finalDencrypted = decipher.final('utf8');
		
		return dencrypted += finalDencrypted;
		
		
	}catch(err){
		throw err
	}
}