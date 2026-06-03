import { collection, getDocs, doc, setDoc, getDoc, getDocFromServer } from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "./firebase";
import { Match } from "../types";

const ROUNDS_COLLECTION = "rounds";
const ADMINS_COLLECTION = "admins";

/**
 * Fetch all rounds from Firestore.
 */
export async function fetchAllRoundsFromFirestore(): Promise<Record<number, Match[]> | null> {
  const path = ROUNDS_COLLECTION;
  try {
    const querySnapshot = await getDocs(collection(db, path));
    if (querySnapshot.empty) {
      return null;
    }

    const roundsData: Record<number, Match[]> = {};
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const roundNum = parseInt(docSnap.id, 10);
      if (!isNaN(roundNum) && Array.isArray(data.matches)) {
        roundsData[roundNum] = data.matches;
      }
    });

    return Object.keys(roundsData).length > 0 ? roundsData : null;
  } catch (error) {
    // Graceful error fallback
    console.warn("Could not retrieve rounds from Firestore. Falling back to default data.", error);
    return null;
  }
}

/**
 * Save / Update a single round in Firestore
 */
export async function saveRoundToFirestore(roundNum: number, matches: Match[]): Promise<void> {
  const docId = String(roundNum);
  const path = `${ROUNDS_COLLECTION}/${docId}`;
  try {
    const docRef = doc(db, ROUNDS_COLLECTION, docId);
    await setDoc(docRef, {
      round: roundNum,
      matches: matches
    });
    console.log(`Round ${roundNum} successfully updated in Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bootstrap all 38 rounds into Firestore at once (First time setup helper)
 */
export async function bootstrapRoundsToFirestore(allRounds: Record<number, Match[]>): Promise<void> {
  console.log("Bootstrapping all 38 rounds to Firestore...");
  for (let r = 1; r <= 38; r++) {
    const matches = allRounds[r];
    if (matches) {
      await saveRoundToFirestore(r, matches);
    }
  }
}

/**
 * Check if the currently signed-in user of Firebase is an administrator
 */
export async function checkIfUserIsAdmin(uid: string): Promise<boolean> {
  const path = `${ADMINS_COLLECTION}/${uid}`;
  try {
    const docRef = doc(db, ADMINS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking admin privilege status:", error);
    return false;
  }
}

/**
 * Bootstrap active admin configuration for the logged-in builder email
 */
export async function bootstrapAdminEmail(uid: string, email: string): Promise<void> {
  const path = `${ADMINS_COLLECTION}/${uid}`;
  try {
    const docRef = doc(db, ADMINS_COLLECTION, uid);
    await setDoc(docRef, { email });
    console.log(`User ${email} bootstrapped as authorized administrator successfully.`);
  } catch (error) {
    console.error("Failed to bootstrap admin:", error);
  }
}
