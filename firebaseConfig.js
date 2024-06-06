// Import the functions you need from the SDKs you need

const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
require("dotenv").config();
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "study-groups-afd43.firebaseapp.com",
  projectId: "study-groups-afd43",
  storageBucket: "study-groups-afd43.appspot.com",
  messagingSenderId: "1083588345853",
  appId: "1:1083588345853:web:9340b25d061d049e4f6394",
  measurementId: "G-Z0RZESRY4T",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };
