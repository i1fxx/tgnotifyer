require('dotenv').config();
let { TelegramClient, Api } = require('telegram'),
	{ StringSession } = require('telegram/sessions'),
	{ NewMessage } = require('telegram/events'),
	input = require('input'),
	stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION),
	sequlize = require('./db'),
	{ User, Target } = require('./models/models'),
	nodeMailMessage = ()=>{
		return `<html>
			<head></head>
			<body>
				nodemailerNessage
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

	await client.connect();

	//if(process.env.TELEGRAM_STRING_SESSION === '') {regResult = await regUser(client);}
	//else {

		
	let user = await getTelegramUser(client); 
	let dbResult = await User.findOne({
		where : {
			user_id : user.id
		}
	});
	regResult = {client, user : dbResult}
	//}

	// get string session
	// client.session.save()

	return regResult;
}

//telegram user registration logic
let regUser = async(client)=>{
	
	await client.start({
		phoneNumber: async () => await input.text("Please enter your number: "),
		password: async () => await input.text("Please enter your password: "),
		phoneCode: async () => await input.text("Please enter the code you received: "),
		onError: (err) => console.log(err),
	});
	
	client.connect();

	let userInfo = await getTelegramUser(client),
		createResult = await User.create({
			telegram_id : userInfo.id,
			email: await input.text('email : ')
		});
	
	return {client, user : createResult};
}

let getDialogs = async(client)=>{
	let result = await client.invoke(new Api.messages.GetDialogs({
	    offsetDate: 0,
	    offsetId: 0,
	    offsetPeer: 'username',
	    hash: BigInt('-4156887774564'),
	    excludePinned: true,
	    folderId: 0
	}));
	return result;
}

let getTelegramUser = async(client)=>{
	let user = await client.invoke(new Api.users.GetFullUser({id : 'me'}));
	return user.users[0];
}

let getLastOnline = async(client)=>{
	let lastOnline = getTelegramUser(client),
		dbNote = await Target.findAll({
			where : {user_id : 1}
		});

	console.log(lastOnline);
}

let messageHandler = (message)=>{
	
}


//main pool
(async()=>{
	
	let {client, user} = await authUser();
	console.log(user);
	//let lastOnline = await getLastOnline();
	//let dialogs = await getDialogs(client);
	//getLastOnline(client);
	//one way getting messages
	//client.addEventHandler(messageHandler, new NewMessage({}));	

})();
