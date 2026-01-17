import { adminDb } from '@/lib/firebaseAdmin';

export async function verifyUser(userId: string) {
  if (!userId) {
    throw new Error("Unauthorized: No User ID");
  }

  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();

  // Centralized Access Control Logic
  if (userData?.status !== 'approved' && userData?.role !== 'admin') {
    throw new Error("Access Denied: Account not approved.");
  }

  return userData;
}