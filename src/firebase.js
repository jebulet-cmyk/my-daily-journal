
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDabjCmmbfLegurdbL8_VCOjiNFHu-XxWI",
  authDomain: "jurnal-harianku-dd317.firebaseapp.com",
  projectId: "jurnal-harianku-dd317",
  storageBucket: "jurnal-harianku-dd317.firebasestorage.app",
  messagingSenderId: "194358881245",
  appId: "1:194358881245:web:e8d0326c03790393dc2434"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
