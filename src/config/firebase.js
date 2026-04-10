import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCrcDs70l_CJdQCPZGPHnNf2A9AdCnBb4U',
  authDomain: 'msfotbaltipovacka.firebaseapp.com',
  projectId: 'msfotbaltipovacka',
  storageBucket: 'msfotbaltipovacka.firebasestorage.app',
  messagingSenderId: '442098936826',
  appId: '1:442098936826:web:3f9ff3d0d98c5723f8d243'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
