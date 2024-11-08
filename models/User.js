// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    chatId: { type: String, unique: true, required: true },
    messages: [{
        content: { type: String, required: true },
        sender: { type: String, required: true, default: 'user' },
        timestamp: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);
module.exports = User;
