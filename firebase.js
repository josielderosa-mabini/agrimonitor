
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAk66BiOcjFrmhTrjinPGeH23ZiSHEazW8",
  authDomain: "agrimonitor-iot.firebaseapp.com",
  databaseURL: "https://agrimonitor-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agrimonitor-iot",
  storageBucket: "agrimonitor-iot.firebasestorage.app",
  messagingSenderId: "267871807339",
  appId: "1:267871807339:web:af058a8a7cbdbb4b760e2e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
