import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

// Import Screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ExpertRegisterScreen from "../screens/ExpertRegisterScreen";
import CustomerDashboard from "../screens/CustomerDashboard";
import ExpertDashboard from "../screens/ExpertDashboard";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string>("Login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is a Customer
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setInitialRoute("CustomerDashboard");
            setInitializing(false);
            return;
          }

          // Check if user is an Expert
          const expertDoc = await getDoc(doc(db, "experts", user.uid));
          if (expertDoc.exists()) {
            setInitialRoute("ExpertDashboard");
            setInitializing(false);
            return;
          }

          // Default fallback
          setInitialRoute("Login");
        } catch (error) {
          setInitialRoute("Login");
        }
      } else {
        setInitialRoute("Login");
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0b0c10", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ExpertRegister" component={ExpertRegisterScreen} />
        <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
        <Stack.Screen name="ExpertDashboard" component={ExpertDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
