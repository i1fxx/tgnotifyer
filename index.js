require('dotenv').config();
let { TelegramClient, Api, types } = require('telegram'),
	{ StringSession } = require('telegram/sessions'),
	{ NewMessage } = require('telegram/events'),
	input = require('input'),
	nodemailer = require('nodemailer'),
	stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION),
	sequlize = require('./db'),
	{ User, Target } = require('./models/models'),
	nodeMailMessage = (date,count)=>{
		return `<html>
			<head></head>
			<body>
				По состоянию на ${date} у тебя ${count} непрочитанных сообщений!
			</body>
	
		</html>`;
	};


//telegram user main auth pool
let authUser = async()=>{
	const client = new TelegramClient(
		stringSession,
		parseInt(process.env.TELEGRAM_API_ID),
		process.env.TELEGRAM_API_HASH, {
            connectionRetries: 5,
		}
	);
	
	let regResult = {};

	if(process.env.TELEGRAM_STRING_SESSION === '') {regResult = await regUser(client);}
	else {
		await client.connect();
			
		let user = await getTelegramUser(client);
		let dbResult = await User.findOne({
			attributes : ['user_id', 'email'],
			where : {
				telegram_id : user.id
			}
		});
		let targetNote = await Target.findOne({
			attributes : ['check_date'],
			where : {
				user_id : dbResult.dataValues.user_id
			},
			order: [
				['check_date', 'DESC']
			]
		});
		let time = getLastTarget(user.status.wasOnline,targetNote.dataValues.check_date);
		regResult = {client, user : { time, email : dbResult.dataValues.email }};
	}

	// get string session
	// client.session.save()

	return regResult;
}

let sendEmail = async (date, count, email)=>{
	let testAccount = await nodemailer.createTestAccount();
	let transporter = nodemailer.createTransport({
	    host: "smtp.ethereal.email",
	    port: 587,
	    secure: false, // true for 465, false for other ports
	    auth: {
	      user: testAccount.user, // generated ethereal user
	      pass: testAccount.pass, // generated ethereal password
	    },
	 });
	let info = await transporter.sendMail({
	    from: '"Telegram Bot" <foo@example.com>', // sender address
	    to: email, // list of receivers
	    subject: "Новые сообщения 📥!", // Subject line
	    text: `У тебя ${count} непрочитаннх сообщений в telegram.`, // plain text body
	    html: nodeMailMessage(date,count), // html body
	});
	console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

//telegram user registration logic
let regUser = async(client)=>{
	
	await client.start({
		phoneNumber: async () => await input.text("Please enter your number: "),
		password: async () => await input.text("Please enter your password: "),
		phoneCode: async () => await input.text("Please enter the code you received: "),
		onError: (err) => console.log(err),
	});
	
	await client.connect();

	let userInfo = await getTelegramUser(client),
		createResult = await User.create({
			telegram_id : userInfo.id,
			email: await input.text('email : ')
		});
	
	return {client, user : createResult};
}

let getDialogs = async(client, time)=>{
	
	let result = await client.invoke(
		new Api.InvokeWithMessagesRange({
			range: new Api.MessageRange({
	        	minId: 28830
	      	}),
	      	query: new Api.messages.GetDialogs({
	      		offsetDate: 43,
	      		offsetId: 43,
	      		offsetPeer: new Api.InputPeerEmpty({}),
	      		limit: 100,
		    	hash: BigInt("-4156887774564"),
			    excludePinned: true,
			    folderId: 0,
			})
	    })
	);
	console.log(result);
	
	return result;

}

let getTelegramUser = async(client)=>{
	let user = await client.invoke(new Api.users.GetFullUser({id : 'me'}));
	return user.users[0];
}

let getLastTarget = (tg,db)=>{
	return Math.max(tg,new Date(db).getTime()/1000);
}

let messageHandler = async (msg, client, user)=>{
	let {message} = msg;
	//message.date, message.message
	if(!message.out){
		let res = await client.invoke(
			new Api.messages.GetDialogs({
				offsetDate: 0,
				offsetId: message.peerId.userId,
		      	offsetPeer: "username",
		      	limit: 1,
		      	hash: BigInt("-4156887774564"),
		      	excludePinned: true,
		      	folderId: 0,
		    })
		);
		let dialog = res.dialogs[0];
		sendEmail(message.date, dialog.unreadCount, user.email);
		//if(!dialog.notifySettings.muteUntil){
		//	sendEmail(message.date, dialog.unreadCount, user.email);
		//}
	}
}




//main pool
(async()=>{
	
	const client = new TelegramClient(
		stringSession,
		parseInt(process.env.TELEGRAM_API_ID),
		process.env.TELEGRAM_API_HASH, {
            connectionRetries: 5,
		}
	);

	await client.connect();

	//let {client, user} = await authUser();

	//let dialogs = await getDialogs(client,user.time);
	//getLastOnline(client);
	//one way getting messages
	
	client.addEventHandler((message)=>{messageHandler(message,client,{email : 'anton@gmail.com'})}, new NewMessage({}));

	
})();