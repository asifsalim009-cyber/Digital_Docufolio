import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const auth = getAuth(app);

createUserWithEmailAndPassword(auth, "testuser123@example.com", "password123")
  .then((cred) => console.log("Success:", cred.user.uid))
  .catch((err) => console.error("Error:", err.code, err.message));
