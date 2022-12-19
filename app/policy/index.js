const { AbilityBuilder, Ability } = require('@casl/ability');

module.exports = function(user){
	const builder = new AbilityBuilder();
	if(user){
		builder.can('create','Class')
		builder.can('update','Class',{user_id: user.user_id})
		builder.can('delete','Class',{user_id: user.user_id})
		builder.can('read','Class')
		builder.can('readsingle','Class',{user_id: user.user_id})
		
		builder.can('create','Schedule', {user_id: user.user_id})
		builder.can('read','Schedule',{user_id: user.user_id})
		
		builder.can('create','Student')
		builder.can('read','Student',{user_id: user.user_id}) //by code_class
		builder.can('readAll','Student')
		
		builder.can('read','Class_discussion',{user_id: user.user_id})
		builder.can('create','Class_discussion')
		
		builder.can('create','Matter')
		builder.can('update','Matter',{user_id: user.user_id})
		builder.can('delete','Matter',{user_id: user.user_id})
		builder.can('readsingle','Matter',{user_id: user.user_id})
		builder.can('read','Matter',{user_id: user.user_id})
		
		builder.can('read','Matter_discussion',{user_id: user.user_id})
		builder.can('create','Matter_discussion')
		
		builder.can('create','Exam')
		builder.can('update','Exam',{user_id: user.user_id})
		builder.can('delete','Exam',{user_id: user.user_id})
		builder.can('read','Exam',{user_id: user.user_id})
		builder.can('readsingle','Exam',{user_id: user.user_id})
		
		builder.can('create','Exam_answer')
		builder.can('read','Exam_answer',{user_id: user.user_id})
		builder.can('readsingle','Exam_answer',{user_id: user.user_id})
		builder.can('update','Exam_answer',{user_id: user.user_id})
		
		builder.can('read','Exam_answer_comment',{user_id: user.user_id})
		builder.can('create','Exam_answer_comment')
		
		builder.can('create','Matt_ass')
		builder.can('read','Matt_ass',{user_id: user.user_id})
		builder.can('readsingle','Matt_ass',{user_id: user.user_id})
		builder.can('delete','Matt_ass',{user_id: user.user_id})
		
		builder.can('read','Assignment_answer',{user_id: user.user_id})
		builder.can('readsingle','Assignment_answer',{user_id: user.user_id})
		builder.can('create','Assignment_answer')
		
		builder.can('read', 'File', {user_id: user.user_id})
	}
	
	
	return new Ability(builder.rules);
}