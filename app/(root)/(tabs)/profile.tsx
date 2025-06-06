// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\profile.tsx
import Icons from '@/constants/Icons';
import Images from '@/constants/Images'; // <-- Import Images for logo
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router'; // <-- Import useFocusEffect
import React, { useCallback, useState } from 'react'; // <-- Add useCallback
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // <-- Added SafeAreaView

// Helper function to extract file extension
const getFileExtension = (uri: string): string | null => {
  const match = uri.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  return match ? match[1] : null;
};

const ProfileScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  // --- ADDED: State for profile data (username) ---
  const [profileData, setProfileData] = useState<{ username?: string } | null>(null);
  // --- END ADDED ---
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // --- Fetch User and Profile Data ---
  const fetchUserData = useCallback(async () => { // <-- Wrap in useCallback
    setLoadingUser(true);
    try {
      // --- Use v1 method ---
      const currentUser = supabase.auth.user();
      if (!currentUser) {
        console.log("No user session found during fetch.");
        setUser(null);
        setProfileImageUrl(null);
        setProfileData(null); // Clear profile data
        setLoadingUser(false);
        // Optionally navigate to sign-in if no user is found and screen requires auth
        // router.replace('/sign-in');
        return;
      }

      setUser(currentUser);
      setProfileImageUrl(currentUser.user_metadata?.avatar_url || null);

      // --- ADDED: Fetch username from 'profile' table ---
      const { data: fetchedProfile, error: profileError } = await supabase
        .from('profile') // Ensure 'profile' is the correct table name
        .select('username')
        .eq('id', currentUser.id)
        .maybeSingle(); // Use maybeSingle() if a profile might not exist

      if (profileError) {
        console.error("Error fetching profile username:", profileError.message);
        // Set fallback or handle error - e.g., use email part as username
        setProfileData({ username: currentUser.email?.split('@')[0] || 'User' });
      } else {
        setProfileData(fetchedProfile); // Store fetched profile data (or null)
      }
      // --- END ADDED ---

    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      Alert.alert("Error", "Could not fetch user profile.");
      setUser(null);
      setProfileImageUrl(null);
      setProfileData(null); // Clear profile data on error
    } finally {
      setLoadingUser(false);
    }
  }, []); // <-- Empty dependency array for useCallback

  // --- UseFocusEffect to refetch when screen is focused ---
  useFocusEffect(
    useCallback(() => {
      console.log("Profile screen focused, fetching data...");
      fetchUserData(); // Call the memoized fetch function
    }, [fetchUserData]) // Depend on the memoized fetch function
  );
  // --- End UseFocusEffect ---


  // --- Pick Image ---
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload a profile picture.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Keep aspect ratio square
      quality: 0.6, // Reduce quality slightly for faster uploads
      base64: true, // Request base64 data
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64 && user) {
      const asset = result.assets[0];
      console.log("Image picked, starting upload...");
      uploadImage(asset);
    } else if (!result.canceled) {
        console.error("Image picker result missing assets or base64 data.");
        Alert.alert("Error", "Could not get image data to upload.");
    } else {
        console.log("Image picking cancelled.");
    }
  };

  // --- Upload Image ---
  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
      if (!user || !asset.base64 || !asset.uri) {
          Alert.alert("Error", "Missing user data or image details for upload.");
          return;
      }

      setUploading(true);
      const fileExt = getFileExtension(asset.uri);
      const fileName = `${user.id}_${Date.now()}.${fileExt || 'jpg'}`; // Add timestamp for uniqueness
      const filePath = `avatars/${fileName}`; // Store in 'avatars' bucket

      console.log(`Uploading image to path: ${filePath}`);

      try {
          // Decode base64 string to ArrayBuffer
          const decodedBase64 = decode(asset.base64);

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
              .from('avatars') // Your bucket name
              .upload(filePath, decodedBase64, {
                  contentType: asset.mimeType ?? `image/${fileExt || 'jpeg'}`,
                  upsert: true, // Overwrite if file exists (optional, consider if needed)
              });

          if (uploadError) throw uploadError;

          console.log("Image uploaded to storage, getting public URL...");

          // Get the public URL of the uploaded image
          const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

          if (!urlData?.publicURL) {
              throw new Error("Could not get public URL for the uploaded image.");
          }
          const publicUrl = urlData.publicURL;
          console.log(`Public URL obtained: ${publicUrl}`);

          // Update the user's metadata with the new avatar URL
          console.log("Updating user data with new avatar URL...");
          const { error: updateError } = await supabase.auth.update({ // Use update() for v1
              data: { avatar_url: publicUrl } // Store URL in user_metadata
          }); // Use update() for v1
          if (updateError) throw updateError;

          console.log("User metadata updated successfully.");
          setProfileImageUrl(publicUrl); // Update state to show the new image
          Alert.alert("Success", "Profile picture updated!");

      } catch (error: any) {
          console.error("Error uploading image:", error);
          Alert.alert("Upload Error", error.message || "Failed to upload profile picture.");
      } finally {
          setUploading(false); // Ensure loading state is turned off
      }
  };

  // --- Remove Image ---
  const removeImage = async () => {
    if (!user || !profileImageUrl) return;

    // Extract the file path from the public URL
    let filePath = null;
    try {
        // More robust URL parsing
        const url = new URL(profileImageUrl);
        // Pathname usually starts with /storage/v1/object/public/
        const pathSegments = url.pathname.split('/');
        // Find the bucket name ('avatars') and join the rest as the path
        const bucketIndex = pathSegments.indexOf('avatars');
        if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
            filePath = pathSegments.slice(bucketIndex + 1).join('/'); // e.g., 'user_id.jpg'
        } else {
            // Fallback for potentially different URL structures
            const simpleParts = profileImageUrl.split('/avatars/');
            filePath = simpleParts.length > 1 ? simpleParts.pop() : null;
             if (filePath?.includes('?')) { // Remove query params if any
                filePath = filePath.split('?')[0];
            }
        }
    } catch (e) {
        console.error("Error parsing profile image URL for removal:", e);
        // Fallback parsing if URL constructor fails
        const simpleParts = profileImageUrl.split('/avatars/');
        filePath = simpleParts.length > 1 ? simpleParts.pop() : null;
        if (filePath?.includes('?')) { // Remove query params if any
            filePath = filePath.split('?')[0];
        }
    }


    if (!filePath) {
        Alert.alert("Error", "Could not determine the file path to remove from the URL.");
        console.error("Failed to extract filePath from URL:", profileImageUrl);
        return;
    }

    console.log(`Attempting to remove image file: avatars/${filePath}`);
    setRemoving(true);
    try {
      // Remove the file from Supabase Storage
      const { error: removeError } = await supabase.storage
        .from('avatars') // Your bucket name
        .remove([filePath]); // Pass the path inside the bucket

      // Log error but proceed to update metadata even if file removal fails (e.g., already deleted)
      if (removeError) {
        console.warn("Error removing image from storage (proceeding to update metadata):", removeError.message);
      } else {
        console.log("Image successfully removed from storage.");
      }

      // Update user metadata to remove the avatar_url
      console.log("Updating user data to remove avatar URL...");
      const { error: updateError } = await supabase.auth.update({ // Use update() for v1
        data: { avatar_url: null }
      }); // Use update() for v1
      if (updateError) throw updateError;

      console.log("User metadata updated, avatar URL removed.");
      setProfileImageUrl(null); // Clear image URL in state
      Alert.alert("Success", "Profile picture removed.");

    } catch (error: any) {
      console.error("Error removing image:", error);
      Alert.alert("Removal Error", error.message || "Failed to remove profile picture.");
    } finally {
      setRemoving(false); // Ensure loading state is turned off
    }
  };

  // --- Other Handlers ---
  const handleLogout = async () => {
    setLoadingUser(true); // Show loading indicator during logout
    const { error } = await supabase.auth.signOut();
    setLoadingUser(false);
    if (error) {
      Alert.alert('Logout Error', error.message);
    } else {
      console.log("User signed out, navigating to sign-in.");
      setUser(null); // Clear user state
      setProfileImageUrl(null); // Clear image
      setProfileData(null); // Clear profile data
      router.replace('/sign-in'); // Navigate to sign-in screen
    }
  };

  // Placeholder for navigation actions
  const handleNavigate = (route: string) => {
    console.log(`Navigating to ${route}`);
    // Example: router.push(route);
    Alert.alert('Navigate', `Navigation to ${route} is not fully implemented yet.`);
    // If you have specific screens like '/change-password', use:
    // router.push('/change-password');
  };

  // --- Render Loading State ---
  if (loadingUser && !user) { // Show full screen loader only on initial load without user data
      return (
          <SafeAreaView style={styles.safeArea}>
              <View style={styles.centeredLoader}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Loading Profile...</Text>
              </View>
          </SafeAreaView>
      );
  }

  // --- Render Sign In Prompt if no user ---
  if (!user && !loadingUser) {
      return (
          <SafeAreaView style={styles.safeArea}>
              <View style={styles.centeredLoader}>
                  <Image source={Images.OrdaLogo} style={styles.logo} resizeMode="contain" />
                  <Text style={styles.signInPromptText}>Please sign in to view your profile.</Text>
                  <TouchableOpacity style={styles.signInButton} onPress={() => router.replace('/sign-in')}>
                      <Text style={styles.signInButtonText}>Sign In</Text>
                  </TouchableOpacity>
              </View>
          </SafeAreaView>
      );
  }


  // --- Main Render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Logo */}
        <View style={styles.headerContainer}>
            <Image
                source={Images.OrdaLogo}
                style={styles.logo}
                resizeMode="contain"
            />
        </View>

        {/* Content Area */}
        <View style={styles.content}>

          {/* Profile Image Area */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={pickImage} disabled={uploading || removing}>
              {uploading ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator size="large" color="#007bff" />
                </View>
              ) : profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileImage} resizeMode="cover" />
              ) : (
                // Default placeholder icon
                <View style={[styles.imagePlaceholder, styles.defaultPlaceholder]}>
                   <Image source={Icons.UserCircleOutline} style={styles.defaultPlaceholderIcon} resizeMode="contain" />
                </View>
              )}
            </TouchableOpacity>
            {/* Show remove button only if image exists and not currently removing/uploading */}
            {profileImageUrl && !removing && !uploading && (
              <TouchableOpacity style={styles.removeButton} onPress={removeImage} disabled={removing}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
            {/* Show indicator while removing */}
            {removing && (
               <ActivityIndicator size="small" color="#dc3545" style={styles.removeIndicator} />
            )}
          </View>

          {/* User Name Display */}
          {loadingUser && !profileData ? ( // Show loading indicator only if profile data isn't loaded yet
            <ActivityIndicator size="small" color="#888" style={styles.userNameLoading} />
          ) : (
            <Text style={styles.userNameText}>
              {/* Display username from profileData, fallback to email part */}
              {profileData?.username || user?.email?.split('@')[0] || 'User Profile'}
            </Text>
          )}


          {/* Other Profile Buttons */}
          <View style={styles.buttonGroup}>
             {/* --- Link to a screen for changing username/info --- */}
             <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/changeUsername')} // Navigate to the change username screen
              disabled={loadingUser || uploading || removing} // Disable if loading/busy
             >
              <Text style={styles.buttonText}>Change Personal Information</Text>
             </TouchableOpacity>

             {/* Other Placeholder Buttons */}
              <TouchableOpacity
              style={styles.button}
              onPress={() => handleNavigate('/my-wallets')}
              disabled={loadingUser || uploading || removing}
              >
              <Text style={styles.buttonText}>My Wallets</Text>
              </TouchableOpacity>

              <TouchableOpacity
              style={styles.button}
              onPress={() => handleNavigate('/change-password')}
              disabled={loadingUser || uploading || removing}
              >
              <Text style={styles.buttonText}>Change Password</Text>
              </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
            style={[styles.logoutButtonContainer, (loadingUser || uploading || removing) && styles.disabledButton]}
            onPress={handleLogout}
            disabled={loadingUser || uploading || removing} // Disable if loading/busy
        >
          {/* Use a Text button for logout for better styling control */}
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5', // Match app background
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    // Removed vertical padding, handled by SafeAreaView and content spacing
    backgroundColor: '#E4EBE5', // Match app background
    justifyContent: 'space-between', // Pushes logout to bottom
    paddingBottom: 20, // Add padding at the very bottom
  },
  headerContainer: { // Added for Logo
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 15, // Adjust top padding
    paddingBottom: 10, // Space below logo
  },
  logo: { // Added for Logo
    width: 80,
    height: 80,
  },
  centeredLoader: { // For initial loading or sign-in prompt
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#E4EBE5',
  },
  loadingText: {
      marginTop: 15,
      fontSize: 16,
      color: '#555',
  },
  signInPromptText: {
      fontSize: 18,
      color: '#333',
      textAlign: 'center',
      marginBottom: 20,
      marginTop: 15,
  },
  signInButton: {
      backgroundColor: '#007bff',
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
  },
  signInButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    paddingTop: 10, // Add some space below the logo
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 15, // Space below image area
    position: 'relative', // Needed for absolute positioning of remove button
    width: 140, // Set fixed width/height for container
    height: 140,
  },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70, // Make it circular
    backgroundColor: '#e0e0e0', // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Clip content to bounds
    borderWidth: 1,
    borderColor: '#ccc',
  },
  defaultPlaceholder: {
      backgroundColor: '#f0f0f0', // Lighter background for default icon
  },
  defaultPlaceholderIcon: {
      width: 80, // Size of the default icon
      height: 80,
      tintColor: '#a0a0a0', // Color of the default icon
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70, // Make it circular
    borderWidth: 2, // Optional border
    borderColor: '#eee', // Light border color
  },
  removeButton: {
    position: 'absolute',
    bottom: 0, // Position at bottom-right of the image container
    right: 0,
    backgroundColor: 'rgba(220, 53, 69, 0.8)', // Semi-transparent red
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15, // Rounded corners
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeIndicator: {
      position: 'absolute', // Position over the remove button area
      bottom: 5,
      right: 5,
  },
  userNameLoading: {
    marginTop: 15, // Space above loading indicator
    marginBottom: 30, // Space below
  },
  userNameText: {
    fontSize: 20, // Larger font size for username
    fontWeight: '600', // Bold weight
    color: '#333', // Darker color
    marginTop: 15, // Space above username
    marginBottom: 30, // Increased space below username
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%', // Group takes full width
    alignItems: 'center', // Center buttons within the group
  },
  button: {
    backgroundColor: '#70B96F', // <-- UPDATED COLOR
    paddingVertical: 14, // Vertical padding
    paddingHorizontal: 25, // Horizontal padding
    borderRadius: 10, // More rounded corners
    marginBottom: 15, // Space between buttons
    width: '90%', // Button width relative to container
    alignItems: 'center', // Center text inside button
    borderWidth: 1,
    borderColor: '#E0E0E0', // Light border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF', // White text for better contrast on dark green
    fontWeight: '500', // Medium weight
  },
  logoutButtonContainer: {
    alignSelf: 'center', // Center the logout button horizontally
    marginTop: 20, // Add space above the logout button
    backgroundColor: '#dc3545', // Red background for logout
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '90%', // Match width of other buttons
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
  disabledButton: { // Style for disabled buttons
      opacity: 0.6,
  },
  // Removed logoutIcon style as we switched to a text button
});

export default ProfileScreen;
