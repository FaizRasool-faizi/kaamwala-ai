import React from "react";
import { Linking, Pressable, SafeAreaView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, CheckCircle2, MessageSquare, Zap } from "lucide-react-native";
import tw from "twrnc";

export default function BookingConfirmationScreen({ navigation, route }: any) {
  const {
    expertName = "Expert",
    scheduledTime = "",
    amount = "PKR 1,500",
    phone = "",
    service = "Service",
  } = route.params || {};

  const openWhatsApp = async () => {
    const phoneNumber = String(phone).replace(/[^0-9]/g, "");
    const message = `Booking confirmed for ${expertName} at ${scheduledTime}.`; 
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("Unable to open WhatsApp:", err);
    }
  };

  return (
    <LinearGradient colors={["#0b0c10", "#121318"]} style={tw`flex-1`}> 
      <SafeAreaView style={tw`flex-1 px-5 py-6`}>
        <View style={tw`flex-1 justify-between`}>
          <View>
            <View style={tw`w-20 h-20 rounded-full border border-green-500/40 items-center justify-center bg-green-500/10 mx-auto mb-8`}>
              <Zap color="#34d399" size={40} />
            </View>

            <Text style={tw`text-center text-white text-3xl font-black mb-3`}>Booking Confirmed!</Text>
            <Text style={tw`text-center text-gray-400 text-sm px-4 leading-6 mb-8`}>
              WhatsApp messages have been automatically sent to both you and {expertName}.
            </Text>

            <View style={tw`bg-white/5 border border-white/10 rounded-3xl p-6 mb-8`}>
              <View style={tw`flex-row justify-between mb-4`}>
                <Text style={tw`text-gray-400 text-sm`}>Expert</Text>
                <Text style={tw`text-white text-sm font-bold`}>{expertName}</Text>
              </View>
              <View style={tw`flex-row justify-between mb-4`}>
                <Text style={tw`text-gray-400 text-sm`}>Time</Text>
                <Text style={tw`text-white text-sm font-bold`}>{scheduledTime}</Text>
              </View>
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-gray-400 text-sm`}>Est. Charges</Text>
                <Text style={tw`text-white text-sm font-bold`}>{amount}</Text>
              </View>
            </View>

            <Pressable
              onPress={openWhatsApp}
              style={tw`flex-row items-center justify-center bg-white/10 border border-white/15 rounded-3xl py-4 mb-3`}
            >
              <MessageSquare color="#f97316" size={18} />
              <Text style={tw`text-white text-base font-bold ml-3`}>Open WhatsApp Message</Text>
              <ArrowRight color="#f97316" size={18} style={tw`ml-2`} />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("CustomerDashboard")}
              style={tw`flex-row items-center justify-center bg-orange-500 rounded-3xl py-4`}
            >
              <Text style={tw`text-white text-base font-bold`}>Done</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
