const { Query } = require('./query');

const proto = {
	
	async exec(verb){
		const query = new Query(this.table);
		return query.exec(verb);
	},
	
	async execute(){
		const query = new Query(this.table);
		return query.execute();
	},
	
	find(where = {}){
		const query = new Query(this.table);
		return query.find(where);
	},
	
	async insert(data){
		const query = new Query(this.table);
		return query.insert(data);
	},
	
	update(data, where){
		const query = new Query(this.table);
		return query.update(data, where);
	},
	
	async delete(where = {}){
		const query = new Query(this.table);
		return query.delete(where);
	},
}


function table(table){
	
	function Table(table){
		this.table = table;
	}

	Table.prototype = proto;
	
	return new Table(table);
	
}

module.exports = table
