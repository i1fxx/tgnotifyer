require('dotenv').config();
let { TelegramClient, Api } = require('telegram'),
	{ StoreSession } = require('telegram/sessions'),
	{ NewMessage } = require('telegram/events'),
	input = require('input'),
	nodemailer = require('nodemailer'),
	storeSession = new StoreSession(''),
	{ User } = require('./models/models'),
	nodeMailMessage = (count)=>{
		return `<html lang='en'>
		<head>
		  <style>
			  body{
				  max-width:500px;
				  margin : 0 auto;
				}
		  </style>
		</head>
		<body>
		  Hello, in <a href="tg://t.me/">Telegram</a> you have ${count} unreaded messages.
		  <br/><br/>
		  Thanks for trust,<br/>
		  <a href="tg://t.me/native_connection_bot">Native Connection</a>
		</body>
	  </html>`;
	},
	timeOuts = [];


//telegram user main auth pool
let authUser = async()=>{
	let client = new TelegramClient(
		storeSession,
		parseInt(process.env.TELEGRAM_API_ID),
		process.env.TELEGRAM_API_HASH, {
			connectionRetries: 5,
		}
	),
	regResult = {};

	try{
		await client.connect();
			
		let user = await getTelegramUser(client, 'me');
		let dbResult = await User.findOne({
			attributes : ['email'],
			where : {
				telegram_id : user.id.value
			}
		});
		regResult = {client, user : { telegram_id : user.id.value, email : dbResult.dataValues.email }};

	} catch(e) {
		if(e.code === 401){
			regResult = await regUser(client);
		}
	}
	return regResult;
}

let sendEmail = async (count, email)=>{

	let testAccount = await nodemailer.createTestAccount();
	let transporter = nodemailer.createTransport({
	    host: process.env.NODEMAIL_HOST,
	    port: parseInt(process.env.NODEMAIL_PORT),
	    secure: Boolean(process.env.NODEMAIL_SECURE), // true for 465, false for other ports
	    auth: {
			user: testAccount.user, // generated ethereal user
			pass: testAccount.pass, // generated ethereal password
	    },
	});

	let info = await transporter.sendMail({
	    from: '"[Telegram Bot] Native Connection" <nativeconnection@gmail.com>', // sender address
	    to: email, // list of receivers
	    subject: "New messages in Telegram📥!", // Subject line
	    text: `You have ${count} unread messages in telegram.`, // plain text body
	    html: nodeMailMessage(count), // html body
	});
	console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
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

	await client.session.save();

	let userInfo = await getTelegramUser(client, 'me');
	try{
		let email = await input.text("Please enter your email: ");
		await User.create({
			telegram_id : userInfo.id,
			email
		});
	} catch(e) {
		console.log(e);
	}
	return {client, user : {telegram_id : userInfo.id, email}};
}



let getTelegramUser = async(client, id)=>{
	let user = await client.invoke(new Api.users.GetFullUser({id}));
	return user.users[0];
}

let messageHandler = async (msg, client, user)=>{

	let {message} = msg, toId = message.peerId.userId.value;

	if(!message.out && toId !== user.telegram_id){
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
	
		if(!dialog.notifySettings.muteUntil && dialog.unreadCount){
			let timeoutIndex = timeOuts.findIndex(x => x.id === toId),
				timer = setTimeout(()=>{
					if(timeoutIndex === -1) timeoutIndex = 0;
					sendEmail(timeOuts[timeoutIndex].count, user.email);
					delete timeOuts[timeoutIndex];
				}, 50000);
			
			if(timeoutIndex !== -1){
				clearTimeout(timeOuts[timeoutIndex].timer);
				timeOuts[timeoutIndex].timer = timer;
				timeOuts[timeoutIndex].count = timeOuts[timeoutIndex].count+1;
			} else timeOuts.push({'id' : toId, timer, count : 1});
		}
	}
}


//main pool
(async()=>{

	let {client, user} = await authUser();

	client.addEventHandler((message)=>{messageHandler(message, client, user)}, new NewMessage({}));

})();