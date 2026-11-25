// Browser-side Firebase adapter. This module is loaded only when a participant
// chooses a shared workshop. No administrative credentials are used.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB1KvkA2QenizP3kSEDN9j1pbZUyl57PLE',
  authDomain: 'epistemic-transitions.firebaseapp.com',
  projectId: 'epistemic-transitions',
  storageBucket: 'epistemic-transitions.firebasestorage.app',
  messagingSenderId: '1019086514780',
  appId: '1:1019086514780:web:94a8e091ac5c9a4b27d499'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export async function connectWorkshop(workshopId, onData, onError) {
  if (!/^[a-z0-9-]{3,40}$/.test(workshopId)) throw new Error('Use 3–40 lowercase letters, digits, or hyphens for a session ID.');
  const credential = await signInAnonymously(auth);
  const uid = credential.user.uid;
  const base = ['workshops', workshopId];
  const nodesRef = collection(db, ...base, 'nodes');
  const edgesRef = collection(db, ...base, 'edges');
  let nodes = [], edges = [], nodesReady = false, edgesReady = false;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const deliver = () => { if (nodesReady && edgesReady) {onData({nodes, edges});resolveReady();} };
  const failed = error => {onError(error);rejectReady(error);};
  const unsubs = [
    onSnapshot(nodesRef, snapshot => {
      nodes = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
      nodesReady = true; deliver();
    }, failed),
    onSnapshot(edgesRef, snapshot => {
      edges = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
      edgesReady = true; deliver();
    }, failed)
  ];
  try { await ready; } catch(error) { unsubs.forEach(fn=>fn()); throw error; }
  return {
    uid,
    workshopId,
    async addNode(input) {
      const id = crypto.randomUUID();
      await setDoc(doc(nodesRef, id), {
        label: input.label.slice(0, 100),
        detail: input.detail.slice(0, 2000),
        type: input.type,
        ...(input.type==='condition'?{status:['observed','emerging','anticipated'].includes(input.status)?input.status:'emerging'}:{}),
        createdBy: uid,
        createdAt: serverTimestamp()
      });
      return id;
    },
    async addEdge(from, to) {
      const id = crypto.randomUUID();
      await setDoc(doc(edgesRef, id), {from, to, createdBy: uid, createdAt: serverTimestamp()});
    },
    disconnect() { unsubs.forEach(fn => fn()); }
  };
}
