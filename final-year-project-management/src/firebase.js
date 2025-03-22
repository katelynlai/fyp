import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAduCwr8NtHbHQWWM3Cnvjf_H0FN4QBKsk",
  authDomain: "final-year-management-project.firebaseapp.com",
  projectId: "final-year-management-project",
  storageBucket: "final-year-management-project.firebasestorage.app",
  messagingSenderId: "944437867202",
  appId: "1:944437867202:web:c6c9c497dba60580d3415b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db};