import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Get this from the Firebase console (Project settings > General > Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyDZUvYYC4waeScoEHfGxoD86hnhFfg8v9I",
  authDomain: "rental-loan-dapp.firebaseapp.com",
  projectId: "rental-loan-dapp",
  storageBucket: "rental-loan-dapp.firebasestorage.app",
  messagingSenderId: "282124993582",
  appId: "1:282124993582:web:b153613d1c77fb98910bbf",
  measurementId: "G-ELR2HBEKE1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
