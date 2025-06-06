// c:\Users\Lenovo\Desktop\Orda_Customer\app\sign-up.tsx
import { supabase } from '@/lib/supabase';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons'; // <-- Import icons
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable, // Using Pressable for better feedback, could use TouchableOpacity
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput, // <-- Import TextInput
    TouchableOpacity,
    View,
} from 'react-native';

// Import your constants - MAKE SURE THESE PATHS ARE CORRECT
import Images from '@/constants/Images';
import { useRouter } from 'expo-router';

const BACKGROUND_COLOR = '#E4EBE5'; // Match sign-in style
const DARK_TEXT = '#333333';
const SECONDARY_DARK_TEXT = '#555555';
const PRIMARY_COLOR = '#007bff'; // Example primary color

const SignUp = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCustomer, setIsCustomer] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Sign Up Handler ---
  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Input Required', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password should be at least 6 characters.');
      return;
    }
    if (!isCustomer) {
      Alert.alert('Account Type Required', 'Please confirm you are signing up as a customer.');
      return;
    }

    setLoading(true);

    const { data: { session }, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          role: 'customer', // Store the role in user_metadata
        }
      }
    });

    setLoading(false); // Set loading false regardless of outcome

    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else if (!session) {
      Alert.alert(
        'Verification Required',
        'Account created successfully! Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
      );
    } else {
        Alert.alert('Sign Up Successful', 'Account created and you are signed in!', [
          { text: 'OK', onPress: () => router.replace('/') }
        ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            {/* Logo Centered at Top */}
            <Image
              source={Images.OrdaLogo}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titleText}>Create Your Account</Text>

            {/* --- Input Fields --- */}
            <View style={styles.inputSection}>
              {/* Email Input */}
              <View style={styles.inputOuterContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome name="envelope" size={18} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="email@address.com"
                    autoCapitalize={'none'}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholderTextColor="#aaa"
                    editable={!loading} // Disable while loading
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputOuterContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome name="lock" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password (min. 6 characters)"
                    autoCapitalize={'none'}
                    textContentType="newPassword" // Hint for password managers
                    placeholderTextColor="#aaa"
                    editable={!loading} // Disable while loading
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputOuterContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome name="lock" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    onChangeText={setConfirmPassword}
                    value={confirmPassword}
                    secureTextEntry={true}
                    placeholder="Confirm Password"
                    autoCapitalize={'none'}
                    textContentType="newPassword"
                    placeholderTextColor="#aaa"
                    editable={!loading} // Disable while loading
                  />
                </View>
              </View>
            </View>

            {/* --- Customer Checkbox --- */}
            <View style={styles.checkboxContainer}>
              <Pressable
                onPress={() => !loading && setIsCustomer(!isCustomer)}
                style={styles.checkboxElement}
                disabled={loading}
                hitSlop={10} // Makes it easier to tap
              >
                <MaterialCommunityIcons
                  name={isCustomer ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color={isCustomer ? PRIMARY_COLOR : DARK_TEXT}
                />
              </Pressable>
              {/* Make the text clickable too */}
              <TouchableOpacity
                onPress={() => !loading && setIsCustomer(!isCustomer)}
                activeOpacity={0.7}
                disabled={loading}>
                 <Text style={styles.checkboxLabel}>I am signing up as a Customer</Text>
              </TouchableOpacity>
            </View>


            {/* --- Create Account Button --- */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading || !isCustomer} // Also disable if checkbox isn't checked
              style={[styles.createButton, (loading || !isCustomer) && styles.buttonDisabled]}
              activeOpacity={0.8} // Give feedback on press
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonTitle}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>

            {/* Optional: Link back to Sign In */}
             <TouchableOpacity onPress={() => !loading && router.back()} disabled={loading}>
                 <Text style={styles.linkText}>Already have an account? Sign In</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center', // Center content vertically
  },
  container: {
    flex: 1,
    alignItems: 'center', // Center items horizontally
    justifyContent: 'center', // Center content vertically
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logo: {
    width: 120, // Adjust size as needed
    height: 120,
    marginBottom: 30, // Space below logo
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DARK_TEXT,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
  },
  inputOuterContainer: {
    marginBottom: 15, // Space between inputs
  },
  inputContainer: {
    flexDirection: 'row', // Align icon and text input horizontally
    alignItems: 'center', // Center items vertically
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8, // Adjust padding for different platforms
  },
  inputIcon: {
    marginRight: 10, // Space between icon and text input
  },
  inputText: {
    flex: 1, // Allow text input to take remaining space
    color: DARK_TEXT,
    fontSize: 16, // Ensure font size is set
  },
  label: {
    color: SECONDARY_DARK_TEXT,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10, // Align with input container padding
    marginBottom: 4,
  },
  // --- Checkbox Styles ---
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // Take full width
    marginBottom: 20, // Space before the button
    paddingLeft: 5, // Align roughly with input fields
  },
  checkboxElement: {
    // padding: 0, // Removed as it's now a Pressable
    margin: 0,
    marginLeft: 0,
    marginRight: 8, // Space between checkbox and label
  },
  checkboxLabel: {
    color: DARK_TEXT,
    fontSize: 15,
    fontWeight: '500',
  },
  // --- Button Styles ---
  createButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 14, // Make button slightly larger
    paddingHorizontal: 20,
    width: '100%', // Make button full width
    marginBottom: 15, // Space before link
    alignItems: 'center', // Center content (text/indicator)
    justifyContent: 'center', // Center content
    minHeight: 48, // Ensure a minimum tappable height
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff', // White text for the button
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff', // Lighter color when disabled
  },
  // --- Link style ---
  linkText: {
    marginTop: 10, // Adjusted margin
    color: PRIMARY_COLOR,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SignUp;
