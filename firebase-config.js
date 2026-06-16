import { initializeApp }  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getRemoteConfig, fetchAndActivate, getValue }
  from "https://www.gstatic.com/firebasejs/12.13.0/firebase-remote-config.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAVxE8R8wO-Po3T7JCoJ4wnKC8BD0mDdeU",
  authDomain:        "hub-interno-colaboradores.firebaseapp.com",
  projectId:         "hub-interno-colaboradores",
  storageBucket:     "hub-interno-colaboradores.firebasestorage.app",
  messagingSenderId: "220646715919",
  appId:             "1:220646715919:web:b8ac8268abbb081f0ce97a",
  measurementId:     "G-1L314XPWXB"
};

const app = initializeApp(firebaseConfig);

export const db     = getFirestore(app);
export const auth   = getAuth(app);
export const apiKey = firebaseConfig.apiKey;

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings = { minimumFetchIntervalMillis: 3600000 };

export async function getGroqKey() {
  await fetchAndActivate(remoteConfig);
  return getValue(remoteConfig, 'GROQ_API_KEY').asString();
}
