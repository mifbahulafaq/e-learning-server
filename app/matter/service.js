const { querySync } = require('../../services/query');
const matters = require('../../services/table')('matters');
const fileService = require('../../services/file');
const toSqlArray = require('../utils/toSqlArray');
const filterData = require('../utils/filterData');

const matterColNames = ['schedule', 'name', 'description', 'attachment', 'class', 'status'];

async function findByClass(qs, code_class){
		
	let filterString = "";
	let filterArray = [];
	const isDate = date=>isNaN((new Date(date)).getDate())
	
	if(parseInt(qs.cs)) delete qs.latest //cs (coming soon)
	if(!isDate(qs.schedule)){
		
		qs = { schedule: qs.schedule }
		filterString = 'AND m.schedule = $2'
		filterArray.push(qs.schedule)
		
	}
	if(!isDate(qs.date) && isDate(qs.schedule)){
		
		const date = new Date(qs.date)
		const locale = "en-CA"
		const opt = {dateStyle:"short"};
		
		//make the date to be a day
		filterString = "AND m.schedule >= $2 AND m.schedule < $3"
		filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
		date.setDate(date.getDate() + 1)
		filterArray.push(date.toLocaleString(locale, opt)+ " " +"00:00")
		
	}
	
	const csSql = 'AND schedule > NOW() ORDER BY schedule ASC LIMIT 1'
	const latestSql = `
		ORDER BY
		CASE WHEN schedule < NOW() THEN CAST(CEIL(EXTRACT(EPOCH FROM NOW())) || '0' AS NUMERIC) - CEIL(EXTRACT(EPOCH FROM schedule))
			
			 ELSE CEIL(EXTRACT(EPOCH FROM schedule))
		END
		ASC`
	const sql = {
		text: `SELECT m.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM matter_discussions md WHERE md.matt = m.id_matter) total_comments
		FROM matters m 
		INNER JOIN classes c ON m.class=c.code_class 
		INNER JOIN users t ON c.teacher = t.user_id 
		WHERE m.class = $1 ${filterString} ${parseInt(qs.cs)? csSql: ''} ${parseInt(qs.latest)?latestSql:''}`,
		values: [code_class || undefined, ...filterArray]
	}
	
	return await querySync(sql);
}

async function create(allData){
	
	let { body, files } = allData;

	if(files){
		body.attachment = toSqlArray(files.map(e=>[e.filename, e.originalname]))
	}
	
	const data = filterData(matterColNames, body);
	
	return await matters.insert(data)
	
}

async function update(id_matter, alldatas){
	
	let { body, files } = alldatas;
	
	if(body.attachment !== undefined){
		
		await fileService.notExistAndRemove(
			'matters',
			{id_matter}, 
			( body.attachment || []).map(e=>e.filename)
		);
	}
	
	/*start setting input data attachment*/
	//body.attachment backup
	let bodyAttachmentBU = body.attachment && (body.attachment || []).map(e=>[e.filename, e.originalname]);
	files = files || [];
	
	body.attachment = body.attachment || [];
	// grouping bodyAttachmenth and files
	const allAttachments = [...body.attachment, ...files].map(e=>[e.filename, e.originalname]);
	/*end setting input data attachment*/
	
	//the beginning of setting matter update
	delete body.attachment;
	const matterUpdate = matters.update(filterData(matterColNames, body), { id_matter });
	
	if(bodyAttachmentBU === undefined){
		matterUpdate.setData(`attachment = attachment || $${matterUpdate.values.length+1}`, toSqlArray(allAttachments));
	}else{
		
		if(files.length){
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(allAttachments))
		}else{
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(bodyAttachmentBU))
		}
	}
	
	// updating data..
	let resultUpdate = await matterUpdate.execute();
	
	return resultUpdate;
}

module.exports = {
	findByClass,
	create,
	update
}