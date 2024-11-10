// server.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');


const app = express();
const server = require('http').createServer(app);
app.use(express.json());
app.use(cookieParser());
  
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json()); // To parse JSON request body


app.use('/uploads', express.static(path.join('/tmp')));  // Serve from /tmp folder directly


const dbURI = process.env.MONGODB_URI;



mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(error => console.error('MongoDB connection error:', error));


// Set up multer for audio file handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp');  // Directory to save the audio files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});
const upload = multer({ storage: storage });

// Handle audio message upload
app.post('/send-audio-message/:chatId', upload.single('audio'), async(req, res) => {
    const chatId = req.params.chatId;
    const audioFilePath = req.file.path; // Path to the saved audio file

    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ chatId });
    if (!user) {
        // If user doesn't exist, create a new one
        user = new User({ chatId, messages: [] });
        await user.save();
    }

    try {
// Construct a URL for the uploaded audio (assuming it's served from /uploads)
const audioUrl = `https://chatapp-bsrk.onrender.com/uploads/${path.basename(audioFilePath)}`;


        // Save the audio file path to the user's messages
        user.messages.push({ content: audioUrl, sender: 'self', type: 'audio',timestamp: new Date() });
        await user.save();

        res.status(200).json({ message: 'Audio message saved', filePath: audioUrl });
    } catch (error) {
        console.error('Error saving audio message:', error);
        res.status(500).send({ error: 'Failed to save audio message' });
    }
});


// Endpoint to send a message and save it in the database
app.post('/send-message/:chatId', async (req, res) => {
    const { messageContent, type = 'text'} = req.body;
    const { chatId } = req.params;

    if (!messageContent) {
        return res.status(400).send({ error: 'Message content is required' });
    }

     // Validate messageType to be either 'text' or 'audio'
     if (!['text', 'audio'].includes(type)) {
        return res.status(400).send({ error: 'Invalid message type. Must be "text" or "audio".' });
    }

    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ chatId });
    if (!user) {
        // If user doesn't exist, create a new one
        user = new User({ chatId, messages: [] });
        await user.save();
    }
    try {

         // Check if the message type is 'audio' and if the URL already exists in the messages array
         if (type === 'audio') {
            // Check if the audio URL is already in the database for this user
            const isAudioDuplicate = user.messages.some(message => message.type === 'audio' && message.content === messageContent);

            if (isAudioDuplicate) {
                return res.status(400).send({ error: 'This audio message has already been sent' });
            }
        }

        // Save the message with the specified type
        const message = {
            content: messageContent,
            sender: 'self', // You can adjust the sender based on your needs
            type: type, // Use 'text' or 'audio'
            timestamp: new Date()
        };

        // Get or create a user by chatId and add the new message
      
        user.messages.push(message);
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
    const { type } = req.query; // Query parameter to filter by message type ('text' or 'audio')


    try {
        const user = await User.findOne({ chatId });
        if (user) {
            let messages = user.messages;

            // If type query is provided, filter messages by type
            if (type && ['text', 'audio'].includes(type)) {
                messages = messages.filter(message => message.type === type);
            }
            res.status(200).json(user.messages);
        } else {
            res.status(404).send({ error: 'Chat not found' });
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send({ error: 'Failed to fetch messages' });
    }
});


const WebSocket = require('ws');
const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('New client connected');
    ws.on('message', message => {
        // Broadcast incoming message to all other clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});




server.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});
