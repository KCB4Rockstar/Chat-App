// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getDatabase, ref, update, push, onValue, get, off } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js"
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.firebase_apiKey,
  authDomain: process.env.firebase_authDomain,
  projectId: process.env.firebase_projectId,
  storageBucket: process.env.firebase_storageBucket,
  messagingSenderId: process.env.firebase_messagingSenderId,
  appId: process.env.firebase_appId,
  measurementId: process.env.firebase_measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const database = getDatabase(app)
const auth = getAuth(app);

console.log("Firebase Loaded")

////////////////////////////////////////////////////////

//data
let users = []
let selectedChat = null;
let selectedChatRef = null;

//handling user
onAuthStateChanged(auth, (user) => {
  if(user){
    if(!user.displayName){
      updateUser()
    }
  }
  else{
    signInAnonymously(auth)
  }
})

//functions
function getUsername(id){
  if(!id){
    return "Anonymous"
  }

  let u = users[id]

  if(!u){
    return "Anonymous"
  }

  return u.username || "Anonymous"
}

function addChannel(){
  let channelName = prompt("Enter the Room name: ").trim();

  if(!channelName) return;

  get(ref(database, "channels/"+channelName)).then((snapshot) => {
    if(snapshot.exists()){
      alert("A channel with this name already exists");
      return;
    }
  });

  let channelObj = {
    name: channelName,
    createdBy: auth.currentUser.uid
  }

  let channelRef = ref(database, "channels/"+channelName)

  update(channelRef, channelObj)

  updateChannelList();
}

function updateUsers(){
  get(ref(database, "users")).then((snapshot) => {
    if(snapshot.exists()){
      users = snapshot.val()

      updatePage()
    }
  }).catch((error) => {
    console.error(error)
  });
}

function updateChannelList(){
  get(ref(database, "channels")).then((snapshot) => {
    if(snapshot.exists()){
      let channels = snapshot.val();

      let channelList = document.getElementById("channels")

      let contentString = "";

      for(let key of Object.keys(channels)){
        let channel = channels[key]

        let c = `
          <p class="channel">${channel.name}</p>
        `

        contentString+=c;
      }

      channelList.innerHTML = contentString;
    }
  }).catch((error) => {
    console.error(error)
  });
}

function updatePage(){
  updateChannelList();

  let allMessages = document.getElementById("allMessages")

  if(!selectedChat){
    allMessages.innerHTML = ""
    return;
  }

  get(ref(database, `channels/${selectedChat}`)).then((snapshot) => {
    if(snapshot.exists()){
      let messages = snapshot.val().messages || {};

      let contentString = "";

      for(let key of Object.keys(messages)){
        let msg = messages[key]

        if(auth.currentUser && auth.currentUser.uid===msg.user){
          let rightMessage = `
            <span class="message messageRight">
              <span>${getUsername(msg.user)}</span>
              <span class="msg">${msg.message}</span>
            </span>
          `

          contentString+=rightMessage;
        }
        else{
          let leftMessage = `
            <span class="message">
              <span>${getUsername(msg.user)}</span>
              <span class="msg">${msg.message}</span>
            </span>
          `

          contentString+=leftMessage;
        }
      }

      allMessages.innerHTML = contentString;

      allMessages.scrollTo(0, allMessages.scrollHeight);
    }
  }).catch((error) => {
    console.error(error)
  });
}

function updateUser(){
  if(auth.currentUser){
    let username = ""

    while(!username || username.length>20){
      username = prompt("New Username (max 20 characters):")
    }

    updateProfile(auth.currentUser, {
      displayName: username
    }).then(()=>{
      update(ref(database, "users/"+auth.currentUser.uid), {
        username: username
      })

      alert("Username updated!")
    }).catch((error)=>{
      alert("There has been an error: "+error)
      console.error(error);
    })
  }
}

function sendMessage(){
  try{
    if(!auth.currentUser){
      alert("You are not signed in.")
      return;
    }
    if(!auth.currentUser.displayName){
      alert("Please set a user name before sending a message.")
      return;
    }

    let msg = document.getElementById('messageInput').value
    if(!msg){
      return
    }

    if(!selectedChat) return

    let msgObj = {
      message: msg,
      user: auth.currentUser.uid,
      timestamp: new Date().getTime()
    }

    let messagesRef = ref(database, `channels/${selectedChat}/messages`)
    let newMsg = push(messagesRef)

    update(newMsg, msgObj)

    document.getElementById('messageInput').value = ""
  }
  catch(e){
    console.error(e)
  }
}

updateUsers()

//events
document.getElementById("updateUser").addEventListener("click", updateUser);
document.getElementById("sendMessage").addEventListener("click", sendMessage);

document.getElementById("addChannel").addEventListener("click", addChannel);

document.getElementById("channels").addEventListener("click", function (event) {
  if(!event.target.classList.contains("channel")) return;
  event.preventDefault();

  if(selectedChatRef){
    off(selectedChatRef.ref, selectedChatRef.listener);
  }

  selectedChat = event.target.innerHTML;
  
  selectedChatRef = {
    ref: ref(database, `channels/${selectedChat}`),
    listener: onValue(ref(database, `channels/${selectedChat}`), (snapshot)=>{
      updatePage()
    })
  }

  document.getElementById("currentChannel").innerHTML = selectedChat
  updatePage()
});

document.getElementById("messageInput").addEventListener("keydown", function(event){
  if(event.code==="Enter"){
    event.preventDefault();
    sendMessage();
  }
});

onValue(ref(database, "users"), (snapshot)=>{
  updateUsers();
})