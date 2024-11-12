const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the message schema
const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    sender: { type: String, enum: ['self', 'user'], required: true },
    type: { type: String, enum: ['text', 'audio', 'image'], required: true },
    timestamp: { type: Date, default: Date.now }
});

// Define the user schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    chatId: { type: String, required: true, unique: true },
    messages: [messageSchema] // Embed the messages array
});

// Pre-save hook to hash the password before saving it to the database
userSchema.pre('save', async function(next) {
    // Only hash the password if it's being modified or is new
    if (this.isModified('password')) {
        const hashedPassword = await bcrypt.hash(this.password, 10); // 10 is the salt rounds
        this.password = hashedPassword;
    }
    next();
});

// Method to compare the entered password with the hashed password
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password); // Compare plaintext password with hashed password
};

// Create the model
const User = mongoose.model('User', userSchema);
module.exports = User;
