import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter } from "expo-router"; // Import useRouter
import { useEffect } from "react";
import { PaystackProvider } from 'react-native-paystack-webview'; // Import PaystackProvider
import "./globals.css";

// It's good practice to store your keys in a central config or environment variables
const PAYSTACK_PUBLIC_KEY = 'pk_live_66319d6ff0dbf7aabd99f429c5ddf287beb9c9b6';

// Keep the splash screen visible initially
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ // Also capture fontError
    "WinkySans-Light": require("@/assets/fonts/WinkySans-Light.ttf"),
    "WinkySans-Regular": require("@/assets/fonts/WinkySans-Regular.ttf"),
    "WinkySans-Medium": require("@/assets/fonts/WinkySans-Medium.ttf"),
  });

  const router = useRouter(); // Get the router instance

  useEffect(() => {
    if (fontError) {
      // Optionally handle font loading errors
      console.error("Font loading error:", fontError);
      // Decide if you still want to hide splash/navigate or show an error
      SplashScreen.hideAsync(); // Hide splash even on error for now
      // Potentially navigate to an error screen or just sign-in
      router.replace('/sign-in');
    }

    if (fontsLoaded) {
      SplashScreen.hideAsync(); // Hide the splash screen
      // Navigate to the sign-in screen
      // Using replace so the user can't go back to the splash screen state
      router.replace('/sign-in');
    }
  }, [fontsLoaded, fontError, router]); // Add fontError and router to dependencies

  // Return null while fonts are loading and the splash screen is visible
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Render the main navigation stack once fonts are loaded/error handled
  return (
    <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaystackProvider>
  );
}
