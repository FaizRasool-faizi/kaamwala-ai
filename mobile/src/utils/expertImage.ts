/** React Native Image does not render SVG; normalize dicebear and missing URLs to PNG. */
export function getExpertImageUrl(
  name: string,
  avatarUrl?: string | null,
  profileImage?: string | null
): string {
  const raw = (avatarUrl || profileImage || "").trim();
  if (!raw) {
    return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name || "Expert")}`;
  }
  if (raw.includes("dicebear.com") && raw.includes("/svg")) {
    return raw.replace("/svg", "/png");
  }
  return raw;
}
