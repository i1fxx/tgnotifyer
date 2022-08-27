require('dotenv').config();
let { TelegramClient } = require('telegram');
let { StringSession } = require('telegram/sessions');
let { NewMessage } = require('telegram/events');
let input = require('input');
let stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION);

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
	console.log(message);
}


//telegram user main auth pool
let authUser = async()=>{
	const client = new TelegramClient(stringSession, parseInt(process.env.TELEGRAM_API_ID), process.env.TELEGRAM_API_HASH, {
                connectionRetries: 5,
	});
	if(process.env.TELEGRAM_STRING_SESSION === '') client = await regUser(client);
	// get string session
	// client.session.save()
	await client.connect();
	return client;
}

//main pool
(async()=>{
	let client = await authUser();


	let result = await client.getMessages("me",{
		limit : 10,
	});


	console.log(result);
	client.addEventHandler(messageHandler, new NewMessage({}));
})();
