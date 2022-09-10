let { TelegramClient, Api } = require('telegram');
let { StoreSession } = require('telegram/sessions');
let { NewMessage } = require('telegram/events');
let nodemailer = require('nodemailer');
let storeSession = new StoreSession('');
let input = require('input');

module.exports = class Application{
    constructor(config){
        this.timeOuts = [];
        this.mail = config.mail;
        this.api = config.api;
        this.timeOut = config.timeout;
        this.client = new TelegramClient(
            storeSession,
            parseInt(this.api.id),
            this.api.hash, {
                connectionRetries: 5,
            }
        );
        this.mocUser = config.user;
    }

    gettimeOuts(){
        return this.timeOuts;
    }

    //telegram user main auth pool
    async authUser(){

        let result = {};

        try{
            await this.client.connect();
            

            this.client.addEventHandler(async (message)=>await this.messageHandler(message), new NewMessage());

            return {code : 101, message : 'completed'};

            /*let dbResult = await User.findOne({
                attributes : ['email', 'user_id'],
                where : {
                    telegram_id : id
                }
            });
            if(dbResult){
                result = {code : 101, user : { id: dbResult.dataValues.user_id,telegram_id : id, email : dbResult.dataValues.email }};

                this.client.addEventHandler((message)=>{messageHandler(message, client, user)}, new NewMessage());

            } else result = {code : 100, message : 'need reg'};*/

        } catch(e) {
            if(e.code === 401){
                result = {code : 100, message : 'need reg'};
            }
        }
        return result;
    }

    //telegram user registration logic
    async regUser(){

        await this.client.start({
            phoneNumber: async () => await input.text('number ?'),
            phoneCode: async () => await input.text('Code ?'),
            onError: (err) => console.log(err),
        });
        

        await this.client.session.save();


        this.client.addEventHandler(async (message)=>await this.messageHandler(message), new NewMessage());

        return {code : 101, message : 'completed'};

        /*try{
            await User.create({
                telegram_id : id,
                email : this.email
            });
        } catch(e) {
            console.log(e);
        }*/
    }

    async getTelegramUser(id){
        let user = await this.client.invoke(new Api.users.GetFullUser({id}));
        return user.users[0];
    }

    async messageHandler (msg){

        let {message} = msg, fromId = message.peerId.userId.value;
        
        if(!message.out && fromId !== parseInt(this.mocUser.telegram_id)){
            let res = await this.client.invoke(
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
        
            if(!dialog.notifySettings.muteUntil && dialog.unreadCounts){
                
                let timeoutIndex = this.timeOuts.findIndex(x => x && x.id === fromId);
                let timer = setTimeout(async ()=>{
                    if(timeoutIndex === -1) timeoutIndex = 0;
                    await this.sendEmail(this.timeOuts[timeoutIndex].count, this.mocUser.email);
                    this.timeOuts.splice(timeoutIndex, 1);
                }, parseInt(this.timeOut));
                
                if(timeoutIndex !== -1){
                    clearTimeout(this.timeOuts[timeoutIndex].timer);
                    this.timeOuts[timeoutIndex].timer = timer;
                    this.timeOuts[timeoutIndex].count = this.timeOuts[timeoutIndex].count+1;
                } else this.timeOuts.push({id : fromId, timer, count : 1});
            }
        }
    }

    async sendEmail(count, email){
        let nodeMailMessage = (count)=>{
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
        };
        try{
            let transporter = nodemailer.createTransport({
                host: this.mail.host,
                port: parseInt(this.mail.port),
                secure: parseInt(this.mail.secure), // true for 465, false for other ports
                auth: {
                    user: this.mocUser.email, // generated ethereal user
                    pass: this.mocUser.password, // generated ethereal password
                }
            });
    
            let info = await transporter.sendMail({
                from: this.mocUser.email, // sender address
                to: email, // list of receivers
                subject: "New messages in Telegram📥!", // Subject line
                text: `You have ${count} unread messages in telegram.`, // plain text body
                html: nodeMailMessage(count), // html body
            });

            //do something with info;

        } catch(e) {
            console.log(e);
            //error happens
        }
    }
}