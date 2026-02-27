import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDgdiNWxYt6i3xvdXqY9wYKW4KSH_2TOAs",
  authDomain: "chatbot-4a24a.firebaseapp.com",
  projectId: "chatbot-4a24a",
  storageBucket: "chatbot-4a24a.firebasestorage.app",
  messagingSenderId: "490959723335",
  appId: "1:490959723335:web:66fc91848af0502e27ca62",
  measurementId: "G-5NR04Y3M6Z",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
