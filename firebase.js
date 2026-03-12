import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { firebaseWebConfig } from "./firebase-config.js";

const hasRequiredConfig = Object.values(firebaseWebConfig).every(Boolean);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (hasRequiredConfig) {
  app = initializeApp(firebaseWebConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });
}

function requireFirebase() {
  if (!hasRequiredConfig || !auth || !db) {
    throw new Error("Firebase is not configured");
  }
}

export function isFirebaseReady() {
  return hasRequiredConfig;
}

export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  requireFirebase();
  return signInWithRedirect(auth, googleProvider);
}

export async function signOutCurrentUser() {
  requireFirebase();
  return signOut(auth);
}

export async function saveGameSession(session) {
  requireFirebase();

  if (!auth.currentUser) {
    throw new Error("User is not authenticated");
  }

  const sessionRef = doc(
    collection(db, "users", auth.currentUser.uid, "gameSessions"),
    session.sessionId
  );

  await setDoc(sessionRef, {
    ...session,
    uid: auth.currentUser.uid,
    userName: auth.currentUser.displayName || "",
    userEmail: auth.currentUser.email || "",
  });
}

export async function fetchGameSessions() {
  requireFirebase();

  if (!auth.currentUser) {
    return [];
  }

  const sessionsQuery = query(
    collection(db, "users", auth.currentUser.uid, "gameSessions"),
    orderBy("savedAtMs", "asc")
  );
  const snapshot = await getDocs(sessionsQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
