import React, { useState } from "react";
import { Image, View, Text, StyleSheet, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import tw from "twrnc";
import { getExpertImageUrl } from "../utils/expertImage";

type Props = {
  name: string;
  avatarUrl?: string | null;
  profileImage?: string | null;
  style?: StyleProp<ImageStyle | ViewStyle>;
  rounded?: "xl" | "2xl" | "full";
  showInitialsFallback?: boolean;
};

export default function ExpertAvatar({
  name,
  avatarUrl,
  profileImage,
  style,
  rounded = "2xl",
  showInitialsFallback = true,
}: Props) {
  const [failed, setFailed] = useState(false);
  const uri = getExpertImageUrl(name, avatarUrl, profileImage);
  const radius = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-2xl";

  const flatStyle = StyleSheet.flatten(style) || {};
  const width = (flatStyle.width as number | string) ?? "100%";
  const height = (flatStyle.height as number) ?? 160;

  if (failed && showInitialsFallback) {
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    return (
      <View
        style={[
          { width, height },
          tw`bg-orange-500/15 border border-orange-500/25 items-center justify-center ${radius}`,
        ]}
      >
        <Text style={tw`text-orange-500 font-black text-lg`}>{initials || "?"}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width, height }, tw`${radius}`]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
