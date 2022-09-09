require('dotenv').config();
let TelegramApi = require('node-telegram-bot-api');
let bot = new TelegramApi(process.env.TELEGRAM_BOT_TOKEN, {polling: true});
let Application = require('./appClass');
let input = require('input');
let app = new Application(
	{
		api:{
			id : process.env.TELEGRAM_API_ID,
			hash : process.env.TELEGRAM_API_HASH,
			bot : process.env.TELEGRAM_BOT_TOKEN
		},
		mail:{
			host : process.env.NODEMAIL_HOST,
			port : process.env.NODEMAIL_PORT,
			secure : process.env.NODEMAIL_SECURE
		},
		timeout : process.env.SEND_TIMEOUT
	}
);
let waitingReplys = [];


let editInWaitList = (mask, index)=>{
	waitingReplys[index].mask = mask;
}

let addToWaitList = (chat, mask)=>{
	waitingReplys.push({chat, mask});
}

let removeFromWaitList = (index)=>{
	waitingReplys.splice(index, 1);
}


(()=>{

	let botOptions = {
		reply_markup : JSON.stringify({
			inline_keyboard : [
				[{text : 'Начать настройку', callback_data : 'start_settings'}]
			]
		})
	};

	bot.setMyCommands(
		[
			{
				command : '/start',
				description : 	'Точка входа в приложение. "Главная страница"'
			}
		]
	);

	bot.on('message',async (msg)=>{


		let {text, chat, from} = msg;
		
		let waitIndex = waitingReplys.findIndex(x => x.chat === chat.id);

		if (waitIndex !== -1) {

			switch(waitingReplys[waitIndex].mask){
				
				case('email'):{
					//Добавить проверку на email
					app.setEmail(text);
					bot.sendMessage(chat.id, 'Настройка прошла успешно! ');
					app.regUser(from.id);
					removeFromWaitList(waitIndex);
					break;
				}
				default: {

				}
			}
		} else {
			switch(text){
				case('/start') : {
					bot.sendMessage(chat.id, `Привет, это бот Native Connection. Более подробно обо мне можно узнать по команде /info.
					
					Давай начнем настройку!`, botOptions);
					break;
				}
				case('/settings') : {
					bot.sendMessage(chat.id, `Для настройки потребуется указать твой email адресс и подвтердить код, который пришлет тебе телеграмм`);
				}
				case('/info') : {
					break;
				}
				case('/stats') : {
					bot.sendMessage(caht.id,`Bot working with <b>${app.getTimeOuts().length}</b> messages`);
					break;
				}
				default : {
					bot.sendMessage(chat.id, 'Данная задача мне не ясна.');
					break;
				}
			}
		}
	});

	bot.on('callback_query', (msg)=>{

		let {data, message, from} = msg;

		switch(data){
			case('start_settings'):{
				app.authUser(from.id).then(authRes=>{
					if(authRes.code === 101){
						//успешная авторизация
						bot.sendMessage(message.chat.id, 'Ты зареган, чувачок.');
					}
					else if(authRes.code === 100){
						//Нужна регистрация
						bot.sendMessage(message.chat.id, 'Укажи номер телефона, к которому привязан Telegramm.');
						addToWaitList(message.chat.id, 'email');
					} else {
						//Ошибка
					}
				});
				break;
			}
		}
	});
})();
