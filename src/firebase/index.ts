// src/firebase/index.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDg705H_FQ40K3JwYLgsP0_2Mkv5yBnWCo",
  authDomain: "latido-app-d957f.firebaseapp.com",
  projectId: "latido-app-d957f",
  storageBucket: "latido-app-d957f.appspot.com",
  messagingSenderId: "462741906935",
  appId: "1:462741906935:web:ddecfdbf7191079afa7af2",
  measurementId: "G-MVBTG7JTF5",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { app };
