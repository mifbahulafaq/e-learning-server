const { AbilityBuilder, Ability } = require('@casl/ability');

module.exports = function(user){
	const builder = new AbilityBuilder();
	if(user){
		builder.can('readsingle','User', {user_id: user.user_id})
		builder.can('update','User', {user_id: user.user_id})
		
		builder.can('readsingle','Class',{user_id: user.user_id})
		
		builder.can('read','Schedule',{user_id: user.user_id})
		
		builder.can('read','Class_student', {user_id: user.user_id}) //by code_class
		builder.can('readsingle','Class_student', {user_id: user.user_id})
		
		builder.can('read','Class_discussion',{user_id: user.user_id})
		
		builder.can('readsingle','Matter',{user_id: user.user_id})
		builder.can('read','Matter',{user_id: user.user_id})
		
		builder.can('read','Matter_discussion',{user_id: user.user_id})
		
		builder.can('read','Exam',{user_id: user.user_id})
		builder.can('readsingle','Exam',{user_id: user.user_id})
		
		builder.can('read','Exam_answer',{user_id: user.user_id})
		builder.can('readsingle','Exam_answer',{user_id: user.user_id})
		
		builder.can('read','Exam_answer_comment',{user_id: user.user_id})
		
		builder.can('read','Matt_ass',{user_id: user.user_id})
		builder.can('readsingle','Matt_ass',{user_id: user.user_id})
		
		builder.can('read','Assignment_answer',{user_id: user.user_id})
		builder.can('readsingle','Assignment_answer',{user_id: user.user_id})
		
		builder.can('read', 'File', {user_id: user.user_id})
	}
	
	
	return new Ability(builder.rules);
}