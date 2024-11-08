// server.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const bodyParser = require('body-parser');


const app = express();
app.use(express.json());
app.use(cookieParser());
  
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json()); // To parse JSON request body

// Serve the public folder (containing your HTML, service-worker.js, etc.)
app.use(express.static('public'));

const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(error => console.error('MongoDB connection error:', error));


// Endpoint to send a message and save it in the database
app.post('/send-message/:chatId', async (req, res) => {
    const { messageContent } = req.body;
    const { chatId } = req.params;

    if (!messageContent) {
        return res.status(400).send({ error: 'Message content is required' });
    }

    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ chatId });
    if (!user) {
        // If user doesn't exist, create a new one
        user = new User({ chatId, messages: [] });
        await user.save();
    }
    try {
        // Get or create a user by chatId and add the new message
      
        user.messages.push({ content: messageContent, sender: 'self' });
        await user.save();

        res.status(200).send({ message: 'Message saved successfully' });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).send({ error: 'Failed to save message' });
    }
});



// Fetch messages for a specific user
app.get('/messages/:chatId', async (req, res) => {
    const { chatId } = req.params;

    try {
        const user = await User.findOne({ chatId });
        if (user) {
            res.status(200).json(user.messages);
        } else {
            res.status(404).send({ error: 'Chat not found' });
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send({ error: 'Failed to fetch messages' });
    }
});



const port = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});
