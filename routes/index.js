var express = require('express');
var router = express.Router();
const { usersArray } = require("../utils/rooms"); // Import roomsArray correctly
const crypto = require("crypto"); // For generating random names
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAJ9Gb69tYaRXeK34oQl8Ze3OVwP5Th9WY");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


router.get("/ai", async (req, res) => {
  try {
      const prompt = "Explain how AI works";

      const result = await model.generateContent(prompt);
      const responseText = result.response.text(); // Extract AI-generated text

      res.json({ status: "done", response: responseText });
  } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// Function to generate a random room name
function generateRoomName() {
    return `room${crypto.randomBytes(3).toString("hex")}`; // Example: room-a3f9c2
}

router.post("/createroom", (req, res) => {
  roomname = generateRoomName();
  const username= req.query.username; // Get the username from query parameters
  usersArray[roomname]=[]; // Store the unique room name
  res.redirect(`/room?username=${encodeURIComponent(username)}&roomname=${encodeURIComponent(roomname)}`);
});

router.get('/selectname',(req, res)=>{
    const roomname=req.query.roomname;

    res.render('selectname',{roomname});
});

// 1️⃣ Create a Room with a Unique Name
router.get("/room", (req, res) => {

  const username = req.query.username; // Get the username from query parameters
  const roomname = req.query.roomname; // Get the username from query parameters
  
    if(!username){
      res.redirect('/');
    }
    // Ensure room name is unique
        
   // res.json({ success: true, roomName, roomsArray, message: "Room created successfully!" });
   res.render('chatRoom', {roomname, username});
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/publicChat', function(req, res, next) {
  
  const roomname = req.query.roomname; // Get room from query parameters
  const username = req.query.username; // Get username from query parameters
  
  if (!roomname || !username) {
      return res.redirect('/'); // Redirect to home if missing details
  }

  res.render('publicRoom', { roomname, username }); // Pass room & username to the template
});
module.exports = router;
