const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    sender: { type: String, enum: ['self', 'user'], required: true },
    type: { type: String, enum: ['text', 'audio'], required: true },
    timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    messages: [messageSchema] // Embed the messages array
});

const User = mongoose.model('User', userSchema);
module.exports = User;
