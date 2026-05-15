import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Credenciais do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAVxE8R8wO-Po3T7JCoJ4wnKC8BD0mDdeU",
  authDomain: "hub-interno-colaboradores.firebaseapp.com",
  projectId: "hub-interno-colaboradores",
  storageBucket: "hub-interno-colaboradores.firebasestorage.app",
  messagingSenderId: "220646715919",
  appId: "1:220646715919:web:b8ac8268abbb081f0ce97a",
  measurementId: "G-1L314XPWXB"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore e exporta a instância
export const db = getFirestore(app);
