const policyFor = require('../app/policy');
const { subject } = require('@casl/ability');
const appError = require('../app/utils/appError');
const isFunc = require('../app/utils/isFunc');

// const proto = {
	
	// methods
	// validate(subjectMatter, cb, data){
		
		// let err = null
		
		// if(!this.policy.can(this.can, this.subject)) err = appError(this.single_err_msg, this.success_statuscode);
		
		// if(isFunc(cb)){
			// cb(data, err);
			// return;
		// }
		
		// if(err) throw err;
		
		// return data;
	// },
	
	// readsingle(user_id, cb){
		
		// this.err_msg = `You have no access to the single ${this.entity}`;
		// this.can = "readsingle";
		// this.subject = subject(this.entity,{ user_id });
		
		// return this.validate(cb);
	// }
// }

// const Authorization = function(user, entity){
	
	// this.entity = entity;
	// this.;
	// this.success_statuscode = 200;
	
// }

// Authorization.prototype = proto;

// module.exports = Authorization;

module.exports = function(entity, login_user, userid_of_data, cb){
		
	const isTeacher = Object.keys(userid_of_data).indexOf('teacher') >= 0;

	let err = null;
	const user_id = isTeacher? userid_of_data.teacher: userid_of_data.user_id;
	const policy = policyFor(login_user)
	
	if(!policy.can('readsingle', subject(entity,{ user_id }))) err = appError(`You have no access to the single ${entity}`, 200);
	
	if(isFunc(cb)) return cb(userid_of_data, err);
	
	if(err) throw err;
	
	return userid_of_data;
}