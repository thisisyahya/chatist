var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');  // Import HTTP module
const { Server } = require('socket.io');  // Import Socket.IO
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const { usersArray } = require("./utils/rooms"); // Ensure correct variable is imported
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// MongoDB Connection
const mongoURI = "mongodb+srv://themultiblogsmania:rL7zZOXD33a0YQh1@cluster0.iey9bd2.mongodb.net/chat?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var server = http.createServer(app); // Create an HTTP server

// ✅ Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (or specify your frontend URL)
    methods: ["GET", "POST"]
  }
});





io.on('connection', (socket) => {
  console.log("Socket connected with ID:", socket.id);

  const rooms = io.sockets.adapter.rooms;
  console.log("Active Rooms:");
  
  rooms.forEach((_, roomname) => {
          console.log("Room:", roomname)
        });
      
  // Store user details in socket object
  socket.on('joinRoom', (data) => {
      console.log("Received joinRoom event:", data);
      
      const { username, roomname } = data;

      if (!username || !roomname) {
          console.log("Error: Missing username or roomname");
          return;
      }

      // Store the user’s room and name in the socket object
      socket.username = username;
      socket.roomname = roomname;
    
      // Check if room exists, if not, create an empty array for it
    if (!usersArray[roomname]) {
      console.log("room doesnot exist");
      return;
  }

  // Add user to the specific room if they are not already in
else{
      usersArray[roomname].push(username);


      socket.join(roomname);
        // Get the number of users in the room
        let roomSize = io.sockets.adapter.rooms.get(roomname)?.size || 0;
        let turnIndex=roomSize;
      console.log(`${username} joined room: ${roomname} : roomSize : ${roomSize} : socketId : ${socket.id}`);
       
      // Notify others in the room
      io.to(roomname).emit("welcome", { 
        username: username, 
        roomSize: roomSize, 
        usersArray: usersArray[roomname] 
    });
  }
  });

  // Handle chat messages
  socket.on("chatMessage", ({ username, roomname, message }) => {
      if (!roomname) return;
else{
      console.log(`Message in ${roomname} from ${username}: ${message} : id: ${socket.id}`);
       
      async function getResponse(){
      try {
        const prompt = `this is the message from the user: " ${message} ", if it doesnot contain any abusive language , forward it as it is or if it contains any kind of abusive, sexual, racism kind og content type "the text is not appropriate - (AI Moderation)". if it contains grammatcial error, type only the corrected sentence. no extra words`;
  
        const result = await model.generateContent(prompt);
        const responseText = result.response.text(); // Extract AI-generated text

        io.to(roomname).emit("message", { username, message:`${responseText}`, senderId: socket.id });

    } catch (error) {
        console.error("Error generating content:", error);

        io.to(roomname).emit("message", { username, message :"an error occoured", senderId: socket.id });
    }
  }
  getResponse();

      // Emit message to the specific room
}// io.to(roomname).emit("message", { username, message, senderId: socket.id });
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
      const { username, roomname} = socket; // Retrieve stored username and roomname

      if (roomname && username) {
        
        let roomSize = io.sockets.adapter.rooms.get(roomname)?.size || 0;

        if (usersArray[roomname]) { // Ensure the room exists
          let index = usersArray[roomname].indexOf(username); // Find the index of username
          if (index !== -1) { // Ensure the username exists in the array
              usersArray[roomname].splice(index, 1); // Remove 1 element at found index
          }
      }
 
          io.to(roomname).emit("disconnected", {username: username, roomSize: roomSize, usersArray: usersArray[roomname]});
          if(usersArray[roomname]){
          if (usersArray[roomname].length === 0) {
            delete usersArray[roomname]; // Properly removes the room from the object
        }
      }
           if(usersArray[roomname])
          console.log(`${username} disconnected from room: ${roomname} : roomsize=> ${roomSize} : roomsArray[${roomname}] = ${usersArray[roomname].length}`);
        else  console.log("room doesnt exist");
      } else {
          console.log("A user disconnected, but username/roomname was not stored.");
      }
  });
});



















// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = { app, server}; // Export both app and server
