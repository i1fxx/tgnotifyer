let sequelize = require('../db');

let { DataTypes } = require('sequelize');

let User = sequelize.define('users',{
    user_id : {type : DataTypes.INTEGER, primaryKey : true, autoIncrement : true},
	telegram_id : {type : DataTypes.INTEGER, unique : true, allowNull : false},
    email : {type : DataTypes.STRING, unique : true, allowNull: false},
	create_date : {type: DataTypes.DATE, defaultValue: DataTypes.NOW},
    createdAt: false,
    updatedAt: false
});

let Target = sequelize.define('targets',{
	check_id : {type : DataTypes.INTEGER, primaryKey : true, autoIncrement: true},
	user_id : {type : DataTypes.INTEGER, allowNull : false},
	check_date : {type : DataTypes.DATE, defaultValue : DataTypes.NOW},
	notify_count : {type : DataTypes.INTEGER, allowNull : false}
});

User.hasMany(Target);
Target.belongsTo(User);

module.exports = {
    User,
	Target
};
