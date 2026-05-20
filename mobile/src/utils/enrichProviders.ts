import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { ProviderOption } from "../types/provider";

/** Load profileImage from Firestore when API omits or sends SVG-only avatar URLs. */
export async function enrichProvidersWithFirestore(providers: ProviderOption[]): Promise<ProviderOption[]> {
  return Promise.all(
    providers.map(async (provider) => {
      const hasGoodImage =
        provider.avatarUrl &&
        !provider.avatarUrl.includes("/svg") &&
        provider.avatarUrl.startsWith("http");

      if (hasGoodImage) {
        return {
          ...provider,
          profileImage: provider.profileImage || provider.avatarUrl,
        };
      }

      try {
        const snap = await getDoc(doc(db, "experts", provider.id));
        if (snap.exists()) {
          const data = snap.data();
          const profileImage = data.profileImage as string | undefined;
          return {
            ...provider,
            avatarUrl: profileImage || provider.avatarUrl,
            profileImage: profileImage || provider.profileImage,
            bio: provider.bio || data.bio,
            experience: provider.experience || data.experience,
            hours: provider.hours || data.hours,
            phone: provider.phone || data.phone,
            skills: provider.skills || data.skills,
            specialization: provider.specialization || data.skills,
          };
        }
      } catch {
        // keep original provider
      }

      return provider;
    })
  );
}
