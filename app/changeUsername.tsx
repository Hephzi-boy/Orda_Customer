// c:\Users\Lenovo\Desktop\Orda_Customer\app\changeUsername.tsx
import Images from '@/constants/Images'; // <-- Import Images for logo
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ChangeUsernameScreen = () => {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty.");
      return;
    }
    if (newUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // --- Use v1 method ---
      const user = supabase.auth.user();
      if (!user) throw new Error("User not found");

      // Update the 'username' column in the 'profile' table
      const { error: updateError } = await supabase
        .from('profile')
        .update({ username: newUsername.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Username updated successfully!',
        [{ text: 'OK', onPress: () => router.back() }] // Go back after success
      );

    } catch (e: any) {
      console.error("Error updating username:", e);
      setError(e.message || "Failed to update username.");
      Alert.alert("Update Failed", e.message || "Could not update username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* --- HEADER WITH LOGO AND TITLE --- */}
      <View style={styles.headerContainer}>
        <Image
            source={Images.OrdaLogo}
            style={styles.logo}
            resizeMode="contain"
        />
        <Text style={styles.title}>Change Username</Text>
      </View>
      {/* --- END HEADER --- */}

      {/* --- MAIN CONTENT AREA --- */}
      <View style={styles.contentContainer}>
        <Text style={styles.label}>New Username:</Text>
        <TextInput
          style={styles.input}
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="Enter your new username"
          placeholderTextColor="#888"
          autoCapitalize="none"
          editable={!loading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleUpdateUsername}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Username</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, loading && styles.disabledButton]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5',
  },
  headerContainer: { // Added for Logo
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 30, // More space at the top
    // marginBottom removed, title is now part of this container
  },
  logo: { // Added for Logo
    width: 80,
    height: 80,
    marginBottom: 15, // Space between logo and title
  },
  contentContainer: { // New container for the form elements
    flex: 1,
    padding: 20,
    justifyContent: 'center', // Vertically center the content
    alignItems: 'center', // Center content horizontally
    backgroundColor: '#E4EBE5', // Ensure background is set
    // paddingTop: 30, // Removed to allow true vertical centering
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    // marginBottom: 30, // Adjusted as it's now in header
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold', // <-- Make label bolder
    marginBottom: 8,
    alignSelf: 'flex-start', // Align label to the left
    marginLeft: '5%', // Indent label slightly
  },
  input: {
    width: '90%', // Make input slightly less wide
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#28a745', // <-- Changed to green
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '90%', // Match input width
    marginBottom: 15, // Space between buttons
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d', // Grey color for cancel
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '90%', // Match input width
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default ChangeUsernameScreen;
