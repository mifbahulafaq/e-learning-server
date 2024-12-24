function UpdatingSql(table){
	this.table = table;
	this.data = [];
	this.where = [];
	this.values = [];
}

UpdatingSql.prototype.setWhere = function (text, value){

	this.where.push(text);
	this.setValues(value);

}

UpdatingSql.prototype.setData = function (text, value){
	
	this.data.push(text)
	this.setValues(value);

}

UpdatingSql.prototype.setValues = function (value){

	if(Array.isArray(value)){
		this.values.push(...value);
	}else{
		this.values.push(value);
	}
	
}

UpdatingSql.prototype.get = function (){
	
	let sql= `UPDATE ${this.table}`;
	let set = "";
	let where = "";
	
	this.data.forEach((e,i)=>{
		set += i == 0? ` SET ${e}`: ` ${e}`;
	})
	this.where.forEach((e,i)=>{
		set += i == 0? ` WHERE ${e}`: ` ${e}`
	})
	
	// const keysOfWhere = Object.keys(this.where);
	
	return { text: sql+set+where, values: this.values}
	
}

module.exports = UpdatingSql;



