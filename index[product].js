require('dotenv').config();
let Application = require('./appClass');
let app = new Application(
	{

		api:{
			id : process.env.TELEGRAM_API_ID,
			hash : process.env.TELEGRAM_API_HASH
		},

		mail:{
			host : process.env.NODEMAIL_HOST,
			port : process.env.NODEMAIL_PORT,
			secure : process.env.NODEMAIL_SECURE
		},
		timeout : process.env.SEND_TIMEOUT,
        user : {
            telegram_id : process.env.USER_ID,
            email : process.env.USER_EMAIL
        }
	}
);

(async ()=>{
    let auth = await app.authUser();
    if(auth.code === 100) await app.regUser();

})();