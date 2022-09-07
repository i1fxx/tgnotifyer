require('dotenv').config();
let { TelegramClient, Api } = require('telegram'),
	{ StoreSession } = require('telegram/sessions'),
	{ NewMessage } = require('telegram/events'),
	input = require('input'),
	nodemailer = require('nodemailer'),
	storeSession = new StoreSession(''),
	{ User } = require('./models/models'),
	TelegramApi = require('node-telegram-bot-api'),
	bot = new TelegramApi(process.env.TELEGRAM_BOT_TOKEN, {polling: true}),
	nodeMailMessage = (count)=>{
		return `<html lang='en'>
		<head>
		  <style>
			  body{
				  max-width:500px;
				  margin : 25px auto;
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
let authUser = async(user, chat)=>{
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
			
		//let user = await getTelegramUser(client, 'me');
		let dbResult = await User.findOne({
			attributes : ['email', 'user_id'],
			where : {
				telegram_id : user.id
			}
		});
		if(dbResult) regResult = {client, user : { id: dbResult.dataValues.user_id,telegram_id : user.id, email : dbResult.dataValues.email }};
		else await regUser(client, user, chat);

	} catch(e) {
		if(e.code === 401){
			regResult = await regUser(client, user, chat);
		}
	}
	return regResult;
}

let sendEmail = async (count, email)=>{
	try{
		let testAccount = await nodemailer.createTestAccount();
		let transporter = nodemailer.createTransport({
			host: process.env.NODEMAIL_HOST,
			port: parseInt(process.env.NODEMAIL_PORT),
			secure: parseInt(process.env.NODEMAIL_SECURE), // true for 465, false for other ports
			auth: {
				user: testAccount.user, // generated ethereal user
				pass: testAccount.pass, // generated ethereal password
			}
		});

		let info = await transporter.sendMail({
			from: '"[Telegram Bot] Native Connection" <nativeconnection@gmail.com>', // sender address
			to: email, // list of receivers
			subject: "New messages in Telegram📥!", // Subject line
			text: `You have ${count} unread messages in telegram.`, // plain text body
			html: nodeMailMessage(count), // html body
		});
		console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
	} catch(e) {
		console.log(e);
	}
}

//telegram user registration logic
let regUser = async(client, user, chat)=>{
	
	const result = await client.invoke(
		new Api.auth.SendCode({
		  phoneNumber: user.phone,
		  apiId: parseInt(process.env.TELEGRAM_API_ID),
		  apiHash: process.env.TELEGRAM_API_HASH,
		  settings: new Api.CodeSettings({
			allowFlashcall: true,
			currentNumber: true,
			allowAppHash: true,
			allowMissedCall: true,
			logoutTokens: [Buffer.from("arbitrary data here")],
		  }),
		})
	);

	console.log(result);

	/*await client.start({
		phoneNumber: user.phone,
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
	return {client, user : {telegram_id : userInfo.id, email}};*/
}



let getTelegramUser = async(client, id)=>{
	let user = await client.invoke(new Api.users.GetFullUser({id}));
	return user.users[0];
}

let messageHandler = async (msg, client, user)=>{

	let {message} = msg, fromId = message.peerId.userId.value;

	if(!message.out && fromId !== user.telegram_id){
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
	
		if(!dialog.notifySettings.muteUntil){//&& dialog.unreadCount
			let timeoutIndex = timeOuts.findIndex(x => x.id === fromId),
				timer = setTimeout(()=>{
					if(timeoutIndex === -1) timeoutIndex = 0;
					sendEmail(timeOuts[timeoutIndex].count, user.email);
					delete timeOuts[timeoutIndex];
				}, parseInt(process.env.SEND_TIMEOUT));
			
			if(timeoutIndex !== -1){
				clearTimeout(timeOuts[timeoutIndex].timer);
				timeOuts[timeoutIndex].timer = timer;
				timeOuts[timeoutIndex].count = timeOuts[timeoutIndex].count+1;
			} else timeOuts.push({'id' : fromId, timer, count : 1});
		}
	}
}

let appLogic = async(preUser, chat)=>{

	let {client, user} = await authUser(preUser, chat);

	console.log(user);

	//client.addEventHandler((message)=>{messageHandler(message, client, user)}, new NewMessage({}));

}


let start = ()=>{

	let botOptions = {
		reply_markup : JSON.stringify({
			inline_keyboard : [
				[{text : 'Начать настройку', callback_data : 'start_settings'}]
			]
		})
	}

	bot.setMyCommands(
		[
			{command : '/start', description : 	'Точка входа в приложение. "Главная страница"'}
		]
	)

	bot.on('message',msg=>{
		console.log(msg);
		let {text, chat} = msg;
		switch(text){
			case('/start') : {
				bot.sendMessage(chat.id, `Привет, это бот Native Connection. Более подробно обо мне можно узнать по команде /info.
				
				Давай начнем настройку!
				`, botOptions);
				break;
			}
			case('/settings') : {
				bot.sendMessage(chat.id, `Для настройки потребуется указать твой email адресс и подвтердить код, который пришлет тебе телеграмм`);
			}
			case('/info') : {
				break;
			}
			default : {
				bot.sendMessage(chat.id, 'Данная задача мне не ясна.');
			}
		}
	});

	bot.on('callback_query', (msg)=>{

		let {data, message, from} = msg;

		if(data === 'start_settings') {
			console.log(from.id);
			console.log(message.entities);
			appLogic({id : from.id, phone : '89811607403'}, message.chat.id);
		}
	
	});
}

start();