// server.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const webPush = require('web-push');
const bodyParser = require('body-parser');


// Replace with your own VAPID keys
const publicVapidKey = 'BFg2rQaD9c2SaGDcXQDfMrh3bxoeqk63Ck4QsC972q5ckKoEKMnRVMjut54AqD75wDIb4b_xF-qVbeLMy3CQusI';
const privateVapidKey = 'iqb6DyChM_uw0BUhM0GEl5ZTXNHVTptb1KbVe2f3cP8';

webPush.setVapidDetails(
    'mailto:zzyiji@outlook.com',
    publicVapidKey,
    privateVapidKey
  );
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  const cors = require('cors');
  app.use(cors());
  app.use(bodyParser.json()); // To parse JSON request body

  const dbURI = process.env.MONGODB_URI ||'mongodb://localhost:27017/yourDatabaseName';

mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(error => console.error('MongoDB connection error:', error));


// Store the subscriptions in-memory (use a database in production)
let subscriptions = [];

// Serve the public folder (containing your HTML, service-worker.js, etc.)
app.use(express.static('public'));
  
  // Endpoint to subscribe the client to push notifications
  app.post('/subscribe', (req, res) => {
    const subscription = req.body;

    subscriptions.push(subscription); // Store subscription

    
    // Store the subscription (usually in a database)
    // For now, we are just sending a success message back
    res.status(201).json({});
  
    // Send a push notification
    const payload = JSON.stringify({ title: 'New message', body: 'You have a new message' });
    
    webPush.sendNotification(subscription, payload)
      .catch(err => console.error('Error sending notification:', err));
  });


    // Example: Notify a specific user when a new message comes in
app.post('/send-notification', (req, res) => {
    const { subscription, message } = req.body;  // subscription is the active user's subscription object

    const payload = JSON.stringify({
        title: 'New message in chat',
        body: message,
        icon: 'https://yozipic.top/pic/icon.png', // Update to the full URL
        badge: 'https://yozipic.top/pic/badge.png' // Update to the full URL
    });

    // Send the push notification to the specific user's subscription
    webPush.sendNotification(subscription, payload)
        .then(() => {
            res.status(200).json({ message: 'Notification sent successfully' });
        })
        .catch(err => {
            console.error('Error sending notification:', err);
            res.status(500).json({ message: 'Error sending notification' });
        });
});



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

// // Function to generate a unique user ID (simple random string)
// function generateUniqueId() {
//     return 'user-' + Math.random().toString(36).substr(2, 9);
// }
const port = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});
