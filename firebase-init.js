import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKVsYum6zDpKny0ZE4Ci9uuxH-Woe1a8Y",
  authDomain: "festejospedidos.firebaseapp.com",
  projectId: "festejospedidos",
  storageBucket: "festejospedidos.firebasestorage.app",
  messagingSenderId: "279687657822",
  appId: "1:279687657822:web:9b2a76aa4af6f3b70bf7cf",
  measurementId: "G-03TT9XMWPR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
