import { FirebaseError } from "firebase/app";

/** Maps Firebase Auth / Storage error codes to user-friendly messages */
export function getFirebaseErrorMessage(error: unknown): string {
  const code =
    error instanceof FirebaseError
      ? error.code
      : typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: string }).code)
        : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found with this email or password is incorrect.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters with letters and numbers.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "storage/unauthorized":
      return "Upload failed: permission denied.";
    case "storage/canceled":
      return "Upload was cancelled.";
    case "storage/unknown":
      return "Image upload failed. Please try again.";
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return "Something went wrong. Please try again.";
  }
}
