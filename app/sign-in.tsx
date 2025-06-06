// c:\Users\Lenovo\Desktop\Orda_Customer\app\sign-in.tsx
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Icons from '@/constants/Icons';
import Images from '@/constants/Images';
import { getCountryAndCurrency } from '@/utils/getCurrency';

const { height: screenHeight } = Dimensions.get('window');
const BACKGROUND_COLOR = '#E4EBE5';
const DARK_TEXT = '#333333';
const SECONDARY_DARK_TEXT = '#555555';
const PRIMARY_COLOR = '#007bff';

// Supabase v1 Sign In
export const signInUser = async (
  email: string,
  password: string
): Promise<{ user?: User | null; session?: Session | null; error?: Error | null }> => {
  const { data, error } = await supabase.auth.signIn({
    email: email.trim(),
    password,
  });

  if (error) return { error };
  return { user: data?.user ?? null, session: data?.session ?? null };
};

// Supabase v1 Sign Up
async function signUpWithEmailInternal(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
  });
  return { session: data?.session ?? null, error };
}

const SignIn = () => {
  const router = useRouter();

  const slideshowImages = [Images.bed, Images.Chicken, Images.Chefs, Images.female, Images.room1];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slideshowImages.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Input Required', 'Please enter both email and password.');
      return;
    }
    setLoading(true);

    const { user, session, error } = await supabase.auth.signIn({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      console.log('Login error:', error.message);
      Alert.alert('Sign In Error', error.message);
      return;
    }

    if (user && session) {
      await new Promise((res) => setTimeout(res, 500));
      try {
        const { country, currency } = getCountryAndCurrency();
        const { error: profileError } = await supabase
          .from('profile')
          .upsert({ id: user.id, country, currency })
          .eq('id', user.id);

        if (profileError) {
          console.error('Profile update failed:', profileError.message);
        } else {
          console.log('Country & currency saved.');
        }
      } catch (err: any) {
        console.error('Profile update error:', err?.message || err);
      }

      Alert.alert('Success', 'Signed In', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/');
            setLoading(false);
          },
        },
      ]);
    } else {
      setLoading(false);
      Alert.alert('Sign In Failed', 'Could not sign in. Please try again.');
    }
  }

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Input Required', 'Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { session, error } = await signUpWithEmailInternal(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else if (!session) {
      Alert.alert('Verification Required', 'Check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace('/sign-in') },
      ]);
    } else {
      Alert.alert('Signed Up', 'Welcome!', [{ text: 'OK', onPress: () => router.replace('/') }]);
    }
  }

  const handleGoogleSignIn = async () => {
    Alert.alert('Google Sign-In', 'Google Sign-In not yet implemented.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.slideshowContainer}>
            <Image source={slideshowImages[currentIndex]} style={styles.slideshowImage} resizeMode="cover" />
          </View>

          <View style={styles.contentContainer}>
            <Image source={Images.OrdaLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.welcomeText}>Welcome to Orda</Text>
            <Text style={styles.taglineText}>Order, Eat, Enjoy Life</Text>

            <View style={styles.inputSection}>
              <View style={styles.inputOuterContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Image source={Icons.envelope} style={styles.inputIcon} resizeMode="contain" />
                  <TextInput
                    style={styles.inputText}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#aaa"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputOuterContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Image source={Icons.lock} style={styles.inputIcon} resizeMode="contain" />
                  <TextInput
                    style={styles.inputText}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry
                    placeholder="Password"
                    autoCapitalize="none"
                    placeholderTextColor="#aaa"
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.emailButton, loading && styles.disabledButton]}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTitle}>Sign in with Email</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emailButton, styles.signUpButton, loading && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTitle}>Sign up with Email</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>OR</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Image source={Icons.googleIcon} style={styles.googleIcon} resizeMode="contain" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* --- Sign Up Link --- */}
            <View style={styles.signUpLinkContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => !loading && router.push('/sign-up')} disabled={loading}>
                <Text style={styles.signUpButtonText}>Sign-up</Text>
              </TouchableOpacity>
            </View>
            {/* --- End Sign Up Link --- */}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;

// Add your styles (unchanged)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  slideshowContainer: { height: screenHeight * 0.3 },
  slideshowImage: { width: '100%', height: '100%' },
  contentContainer: { padding: 20 },
  logo: { width: 120, height: 60, alignSelf: 'center', marginBottom: 10 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: DARK_TEXT, textAlign: 'center' },
  taglineText: { fontSize: 16, color: SECONDARY_DARK_TEXT, textAlign: 'center', marginBottom: 20 },
  inputSection: { marginBottom: 20 },
  inputOuterContainer: { marginBottom: 12 },
  label: { fontSize: 14, color: DARK_TEXT, marginBottom: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10 },
  inputIcon: { width: 20, height: 20, marginRight: 8 },
  inputText: { flex: 1, height: 40, color: DARK_TEXT },
  buttonSection: { marginTop: 10 },
  emailButton: { backgroundColor: PRIMARY_COLOR, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  signUpButton: { backgroundColor: '#6c757d' },
  disabledButton: { opacity: 0.6 },
  buttonTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#ccc' },
  separatorText: { marginHorizontal: 10, fontSize: 14, color: '#555' },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ccc' },
  googleIcon: { width: 20, height: 20, marginRight: 10 },
  googleButtonText: { fontSize: 16, color: DARK_TEXT },
  // --- Styles for Sign Up Link ---
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25, // Add some space above
  },
  signUpText: {
    fontSize: 15,
    color: DARK_TEXT, // Black color for the text
  },
  signUpButtonText: {
    fontSize: 15,
    color: '#28a745', // Green color for "Sign-up"
    fontWeight: 'bold',
  },
});
