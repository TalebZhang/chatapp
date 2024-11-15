// server.js
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const https = require('https')
const socketio = require('socket.io');
const fs = require('fs');


const app = express();

port=3000;

app.use(express.json());
app.use(cookieParser());
  
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json()); // To parse JSON request body


app.use('/uploads', express.static(path.join('/tmp')));  // Serve from /tmp folder directly



const dbURI = process.env.MONGODB_URI;
//const dbURI = "mongodb://localhost:27017/mydatabase"




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
app.post('/send-audio-message', upload.single('audio'), async(req, res) => {
    const audioFilePath = req.file.path; // Path to the saved audio file
    const { type,email } = req.query; // Query parameter to filter by message type ('text' or 'audio')


    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ email });
    if (!user) {
        console.log('no audio user error');
    }

    try {
// Construct a URL for the uploaded audio (assuming it's served from /uploads)
const audioUrl = `https://chatapp-bsrk.onrender.com/uploads/${path.basename(audioFilePath)}`;

        if (email=== 'test@gmail.com'){
        // Save the audio file path to the user's messages
        user.messages.push({ content: audioUrl, sender: 'self', type: 'audio',timestamp: new Date() });}else{
        user.messages.push({ content: audioUrl, sender: 'user', type: 'audio',timestamp: new Date() });   
        }
        await user.save();

        res.status(200).json({ message: 'Audio message saved', filePath: audioUrl });
    } catch (error) {
        console.error('Error saving audio message:', error);
        res.status(500).send({ error: 'Failed to save audio message' });
    }
});


app.post('/upload-image/:chatId', upload.single('image'), async(req, res) => {
    const chatId = req.params.chatId;
    const imageUrl = req.file.path; // Path to the saved audio file

    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ chatId });
    if (!user) {
        // If user doesn't exist, create a new one
        user = new User({ chatId, messages: [] });
        await user.save();
    }

    try {
// Construct a URL for the uploaded audio (assuming it's served from /uploads)
const imageUrls = `https://chatapp-bsrk.onrender.com/uploads/${path.basename(imageUrl)}`;


        // Save the image file path to the user's messages
        user.messages.push({ content: imageUrls, sender: 'self', type: 'image',timestamp: new Date() });
        await user.save();

        res.status(200).json({ message: 'image message saved', filePath: audioUrl });
    } catch (error) {
        console.error('Error saving image message:', error);
        res.status(500).send({ error: 'Failed to save image message' });
    }
});



// Endpoint to send a message and save it in the database
app.post('/send-message', async (req, res) => {
    const {email, messageContent, type = 'text'} = req.body;
    

    if (!messageContent) {
        return res.status(400).send({ error: 'Message content is required' });
    }

     // Validate messageType to be either 'text' or 'audio'
     if (!['text', 'audio', 'image'].includes(type)) {
        return res.status(400).send({ error: 'Invalid message type. Must be "text" or "audio".' });
    }

    // Find the user or create one if it doesn't exist
    let user = await User.findOne({ email });
    if (!user) {
        // If user doesn't exist, create a new one
        console.log('no email error');
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

        // Check if the message type is 'audio' and if the URL already exists in the messages array
        if (type === 'image') {
            // Check if the audio URL is already in the database for this user
            const isImageDuplicate = user.messages.some(message => message.type === 'image' && message.content === messageContent);

            if (isImageDuplicate) {
                return res.status(400).send({ error: 'This image message has already been sent' });
            }
        }

        if( email === 'test@gmail.com'){
        // Save the message with the specified type
        const message = {
            content: messageContent,
            sender: 'self', // You can adjust the sender based on your needs
            type: type, // Use 'text' or 'audio'
            timestamp: new Date()
        };
        user.messages.push(message);
    } else {
            const message = {
                content: messageContent,
                sender: 'user', // You can adjust the sender based on your needs
                type: type, // Use 'text' or 'audio'
                timestamp: new Date()
            };
            user.messages.push(message);
        }

        // Get or create a user by chatId and add the new message
      
        
        await user.save();

        res.status(200).send({ message: 'Message saved successfully' });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).send({ error: 'Failed to save message' });
    }
});



// Fetch messages for a specific user
app.get('/messages', async (req, res) => {
    const { type,email } = req.query; // Query parameter to filter by message type ('text' or 'audio')

    try {
        const user = await User.findOne({ email });
        if (user) {
            let messages = user.messages;

            // If type query is provided, filter messages by type
            if (type && ['text', 'audio','image'].includes(type)) {
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




// Login route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' }); // User not found
        }

        // Compare the entered password with the stored hashed password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' }); // Password mismatch
        }

        // If credentials are valid
        res.status(200).json({
            message: 'Login successful!',
            user: { email: user.email }  // Include the user's email in the response
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
 
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { chatId, email, password} = req.body;

    try {
        // Check if email or name already exists in the database
        const existingUserByEmail =await User.findOne({email});
        const existingUserByChatId = await User.findOne({chatId});

        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email is already taken.' });
        }

        if (existingUserByChatId) {
            return res.status(400).json({ message: 'Name is already taken.' });
        }
   
        // If no duplicates found, create a new user
        const newUser = new User({
            chatId,
            email,
            password, // The password will be hashed automatically before saving
            messages: [] // Initialize with an empty messages array
        });

        await newUser.save();
        console.log('save success')
        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
 
    }
});

//we need a key and cert to run https
//we generated them with mkcert
// $ mkcert create-ca
// $ mkcert create-cert
const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

//we changed our express setup so we can use https
//pass the key and cert to createServer on https
const expressServer = https.createServer({key, cert}, app);
//create our socket.io server... it will listen to our express port
const io = socketio(expressServer,{
    cors: {
        origin: [
            "https://chatapp-bsrk.onrender.com",
            // 'https://LOCAL-DEV-IP-HERE' //if using a phone or another computer
        ],
        methods: ["GET", "POST"]
    }
});

//offers will contain {}
const offers = [
    // offererUserName
    // offer
    // offerIceCandidates
    // answererUserName
    // answer
    // answererIceCandidates
];
const connectedSockets = [
    //username, socketId
]

io.on('connection',(socket)=>{
    // console.log("Someone has connected");
    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    if(password !== "x"){
        socket.disconnect(true);
        return;
    }
    connectedSockets.push({
        socketId: socket.id,
        userName
    })

    //a new client has joined. If there are any offers available,
    //emit them out
    if(offers.length){
        socket.emit('availableOffers',offers);
    }
    
    socket.on('newOffer',newOffer=>{
        offers.push({
            offererUserName: userName,
            offer: newOffer,
            offerIceCandidates: [],
            answererUserName: null,
            answer: null,
            answererIceCandidates: []
        })
        // console.log(newOffer.sdp.slice(50))
        //send out to all connected sockets EXCEPT the caller
        socket.broadcast.emit('newOfferAwaiting',offers.slice(-1))
    })

    socket.on('newAnswer',(offerObj,ackFunction)=>{
        console.log(offerObj);
        //emit this answer (offerObj) back to CLIENT1
        //in order to do that, we need CLIENT1's socketid
        const socketToAnswer = connectedSockets.find(s=>s.userName === offerObj.offererUserName)
        if(!socketToAnswer){
            console.log("No matching socket")
            return;
        }
        //we found the matching socket, so we can emit to it!
        const socketIdToAnswer = socketToAnswer.socketId;
        //we find the offer to update so we can emit it
        const offerToUpdate = offers.find(o=>o.offererUserName === offerObj.offererUserName)
        if(!offerToUpdate){
            console.log("No OfferToUpdate")
            return;
        }
        //send back to the answerer all the iceCandidates we have already collected
        ackFunction(offerToUpdate.offerIceCandidates);
        offerToUpdate.answer = offerObj.answer
        offerToUpdate.answererUserName = userName
        //socket has a .to() which allows emiting to a "room"
        //every socket has it's own room
        socket.to(socketIdToAnswer).emit('answerResponse',offerToUpdate)
    })

    socket.on('sendIceCandidateToSignalingServer',iceCandidateObj=>{
        const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;
        // console.log(iceCandidate);
        if(didIOffer){
            //this ice is coming from the offerer. Send to the answerer
            const offerInOffers = offers.find(o=>o.offererUserName === iceUserName);
            if(offerInOffers){
                offerInOffers.offerIceCandidates.push(iceCandidate)
                // 1. When the answerer answers, all existing ice candidates are sent
                // 2. Any candidates that come in after the offer has been answered, will be passed through
                if(offerInOffers.answererUserName){
                    //pass it through to the other socket
                    const socketToSendTo = connectedSockets.find(s=>s.userName === offerInOffers.answererUserName);
                    if(socketToSendTo){
                        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer',iceCandidate)
                    }else{
                        console.log("Ice candidate recieved but could not find answere")
                    }
                }
            }
        }else{
            //this ice is coming from the answerer. Send to the offerer
            //pass it through to the other socket
            const offerInOffers = offers.find(o=>o.answererUserName === iceUserName);
            const socketToSendTo = connectedSockets.find(s=>s.userName === offerInOffers.offererUserName);
            if(socketToSendTo){
                socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer',iceCandidate)
            }else{
                console.log("Ice candidate recieved but could not find offerer")
            }
        }
        // console.log(offers)
    })

})

expressServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
