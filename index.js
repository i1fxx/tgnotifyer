require('dotenv').config();
let { TelegramClient, Api } = require('telegram');
let { StringSession } = require('telegram/sessions');
let { NewMessage } = require('telegram/events');
let input = require('input');
let stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION);

let nodeMailMessage = ()=>{
	return `<html>
		<head></head>
		<body>
			nodemailerNessage
		</body>

	</html>`;
}

//telegram user registration logic
let regUser = async(client)=>{
	await client.start({
		phoneNumber: async () => await input.text("Please enter your number: "),
    		password: async () => await input.text("Please enter your password: "),
    		phoneCode: async () => await input.text("Please enter the code you received: "),
    		onError: (err) => console.log(err),
	});
	return client;
}

let messageHandler = (message)=>{
	
}


//telegram user main auth pool
let authUser = async()=>{
	const client = new TelegramClient(
		stringSession,
		parseInt(process.env.TELEGRAM_API_ID),
		process.env.TELEGRAM_API_HASH, {
                connectionRetries: 5,
	});

	if(process.env.TELEGRAM_STRING_SESSION === '') client = await regUser(client);
	
	// get string session
	// client.session.save()

	await client.connect();
	return client;
}

let getDialogs = async(client)=>{
	let result = await client.invoke(new Api.messages.GetDialogs({
	    offsetDate: 0,
	    offsetId: 0,
	    offsetPeer: 'username',
	    limit: 10,
	    hash: BigInt('-4156887774564'),
	    excludePinned: true,
	    folderId: 0
	}));
	return result;
}

let getLastOnline = async(client)=>{
	let result = await client.invoke(new Api.users.GetFullUser({id: 'me'}));
	return result;
}

let getSettings = async(client)=>{

	let result = await client.invoke(new Api.messages.GetDialogs({
	    offsetDate: 0,
	    offsetId: 1,
	    offsetPeer: 'userName',
	    limit: 2,
	    hash: BigInt('-4156887774564'),
	    excludePinned: false,
	    folderId: 0
	}));
	return result;
}

//main pool
(async()=>{
	
	let client = await authUser();
	//let lastOnline = await getLastOnline();
	let dialogs = await getDialogs(client);
	let settings = await getSettings(client);

	//one way getting messages
	//client.addEventHandler(messageHandler, new NewMessage({}));

	
	console.log(settings.dialogs);

})();
