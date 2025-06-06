// SplashScreen.tsx
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
// If you are using Expo Router, you might prefer useRouter
// import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const navigation = useNavigation();
  // If using Expo Router:
  // const router = useRouter();

  useEffect(() => {
    // Automatically move to the sign-in screen after 2 seconds
    const timer = setTimeout(() => {
      // Using React Navigation's navigate
      navigation.navigate('sign-in' as never); // Use 'sign-in' as the target route name

      // If using Expo Router, you might use replace to prevent going back to the splash
      // router.replace('/sign-in');

    }, 2000); // 2000 milliseconds = 2 seconds

    // Clear the timer if the component unmounts before the timer finishes
    return () => clearTimeout(timer);
  }, [navigation]); // Add navigation (or router) to dependency array if using React Navigation hooks directly

  // IMPORTANT: Verify this path is correct relative to THIS file's location.
  // Assuming '@/' is an alias pointing to your source/root directory.
  const imageSource = require('@/assets/images/OrdaLogo.png');

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.logo} // Style applied to the Image component
        resizeMode="contain" // Matches the resizeMode from your app.json
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Matches the backgroundColor from your app.json splash config
    backgroundColor: '#70CFAF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Using percentage-based dimensions works well with resizeMode="contain"
    // to scale the logo relative to the screen size. Adjust as needed.
    width: '80%',
    height: '80%',
  },
});
