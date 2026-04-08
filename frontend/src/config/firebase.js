// Firebase client config for Solchan frontend
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBdfr7bDxggvF1_RSDGvA3QsenL80HTv8k",
  authDomain: "solchan-48c21.firebaseapp.com",
  projectId: "solchan-48c21",
  storageBucket: "solchan-48c21.firebasestorage.app",
  messagingSenderId: "634866195867",
  appId: "1:634866195867:web:334ebaa6f78a9e8934553e",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
