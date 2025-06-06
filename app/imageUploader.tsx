import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  StyleSheet,
  View,
} from 'react-native';

export default function UploadImageScreen() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickAndUploadImage = async () => {
    // Step 1: Pick an image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    setUploading(true); // Start loading
    const file = result.assets[0];
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // ✅ Supabase v1 method to get user
    const user = supabase.auth.user();

    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      setUploading(false);
      return;
    }

    const filePath = `business/${user.id}-${Date.now()}-${file.fileName || 'image.jpg'}`;

    // Step 2: Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      Alert.alert('Upload failed', error.message);
      setUploading(false);
      return;
    }

    // Step 3: Get public URL (still valid in v1)
    const { publicURL } = supabase.storage.from('images').getPublicUrl(filePath).data;

    setImageUrl(publicURL);
    setUploading(false); // Stop loading
  };

  return (
    <View style={styles.container}>
      {uploading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Pick & Upload Image" onPress={pickAndUploadImage} disabled={uploading} />
      )}

      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 200, height: 200, marginTop: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
});
