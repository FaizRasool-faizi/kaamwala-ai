import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  deleteUser,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import type { UserProfile, UserRegistrationInput } from "@/types/user";

const USERS_COLLECTION = "users";
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/** Helper to check if a value is a plain JavaScript object */
function isPlainObject(value: any): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/** Deeply removes undefined fields from plain objects to satisfy Firestore validation */
function removeUndefinedFields(obj: any): any {
  if (isPlainObject(obj)) {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) {
          newObj[key] = removeUndefinedFields(value);
        }
      }
    }
    return newObj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  }

  return obj;
}

/** Persist user profile in Firestore (document id = Auth uid) */
export async function saveUserDocument(
  uid: string,
  data: Omit<UserProfile, "id" | "createdAt" | "role">
): Promise<UserProfile> {
  const db = getFirebaseDb();
  const userRef = doc(db, USERS_COLLECTION, uid);
  const createdAt = new Date().toISOString();

  const profile: UserProfile = {
    id: uid,
    role: "user",
    ...data,
    createdAt,
  };

  const firestoreData = removeUndefinedFields({
    ...profile,
    createdAt: serverTimestamp(),
  });

  await setDoc(userRef, firestoreData);

  return profile;
}

/** Register User: Auth user + Firestore doc */
export async function registerUser(input: UserRegistrationInput): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  let user: User | null = null;

  if (!input.password) {
    throw new Error("Password is required for credentials signup");
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );
    user = credential.user;

    await updateProfile(user, { displayName: input.name });

    return await saveUserDocument(user.uid, {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      address: input.address.trim(),
    });
  } catch (error) {
    // Roll back Auth user if Firestore failed after account creation
    if (user) {
      try {
        await deleteUser(user);
      } catch {
        /* ignore cleanup errors */
      }
    }
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Email/password login for users */
export async function loginUser(email: string, password: string): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    return credential.user;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Send password reset email to user */
export async function resetUserPassword(email: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Google sign-in for users */
export async function loginUserWithGoogle(): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: string }).code)
      : "";

    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      const auth = getFirebaseAuth();
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Redirecting to Google sign-in...");
    }

    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Completes Firebase redirect sign-in after returning from Google */
export async function completeGoogleRedirectLogin(): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    const credential = await getRedirectResult(auth);
    return credential?.user ?? null;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Sign out user */
export async function logoutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Load user profile from Firestore */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: uid,
      role: "user",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
      createdAt:
        typeof data.createdAt === "string"
          ? data.createdAt
          : data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Check if user profile exists in Firestore */
export async function userProfileExists(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  return profile !== null;
}
