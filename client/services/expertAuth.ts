import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  deleteUser,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import type { ExpertProfile, ExpertRegistrationInput } from "@/types/expert";

const EXPERTS_COLLECTION = "experts";
const googleProvider = new GoogleAuthProvider();

/** Upload a file to Firebase Storage under experts/{uid}/ */
async function uploadExpertImage(
  uid: string,
  file: File,
  folder: "profile" | "id-card"
): Promise<string> {
  const storage = getFirebaseStorage();
  const extension = file.name.split(".").pop() || "jpg";
  const storageRef = ref(storage, `experts/${uid}/${folder}.${extension}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

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

/** Persist expert profile in Firestore (document id = Auth uid) */
async function saveExpertDocument(
  uid: string,
  data: Omit<ExpertProfile, "id" | "createdAt">
): Promise<ExpertProfile> {
  const db = getFirebaseDb();
  const expertRef = doc(db, EXPERTS_COLLECTION, uid);
  const createdAt = new Date().toISOString();

  const profile: ExpertProfile = {
    id: uid,
    ...data,
    createdAt,
  };

  const firestoreData = removeUndefinedFields({
    ...profile,
    createdAt: serverTimestamp(),
  });

  await setDoc(expertRef, firestoreData);

  return profile;
}

/** Register expert: Auth user + Storage uploads + Firestore doc */
export async function registerExpert(input: ExpertRegistrationInput): Promise<ExpertProfile> {
  const auth = getFirebaseAuth();
  let user: User | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password
    );
    user = credential.user;

    await updateProfile(user, { displayName: input.fullName });

    // Profile image is required — registration fails without it
    const profileImageUrl = await uploadExpertImage(user.uid, input.profileImageFile, "profile");

    let idCardImageUrl: string | null = null;
    if (input.idCardImageFile) {
      idCardImageUrl = await uploadExpertImage(user.uid, input.idCardImageFile, "id-card");
    }

    const skillsLabel = `${input.category}${input.skills ? ` — ${input.skills}` : ""}`;

    return await saveExpertDocument(user.uid, {
      name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      skills: skillsLabel,
      category: input.category,
      location: input.location,
      profileImage: profileImageUrl,
      idCardImage: idCardImageUrl,
      experience: input.experience,
      rate: input.rate,
      hours: input.hours,
    });
  } catch (error) {
    // Roll back Auth user if Firestore/Storage failed after account creation
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

/** Email/password login */
export async function loginExpert(email: string, password: string): Promise<User> {
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

/** Send password reset email to expert */
export async function resetExpertPassword(email: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/** Google sign-in */
export async function loginWithGoogle(): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

export async function logoutExpert(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Load expert profile from Firestore */
export async function getExpertProfile(uid: string): Promise<ExpertProfile | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, EXPERTS_COLLECTION, uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: uid,
    name: data.name,
    email: data.email,
    phone: data.phone,
    skills: data.skills,
    category: data.category,
    location: data.location,
    profileImage: data.profileImage,
    idCardImage: data.idCardImage ?? null,
    experience: data.experience,
    rate: data.rate,
    hours: data.hours,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function expertProfileExists(uid: string): Promise<boolean> {
  const profile = await getExpertProfile(uid);
  return profile !== null;
}
