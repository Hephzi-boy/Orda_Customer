// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\browseHotel.tsx
import Icons from '@/constants/Icons'; // <-- Import Icons for search icon
import Images from '@/constants/Images'; // <-- Import Images for logo
import { supabase } from '@/lib/supabase'; // Adjusted path relative to this file
import { Link } from 'expo-router'; // Use Expo Router's navigation
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image, // <-- Import Image
  Platform, // <-- Import Platform
  SafeAreaView, // <-- Import SafeAreaView
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Define a type for your hotel data including the image URL
interface Hotel {
  id: string; // Or number, depending on your Supabase schema
  name: string;
  location: string;
  image_url?: string | null; // <-- Added image URL property (optional)
  // Add other hotel properties if needed
}

const BrowseHotels = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]); // Stores the original full list
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]); // Stores the list to display (filtered)
  const [searchQuery, setSearchQuery] = useState(''); // State for the search input
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all hotels on load
  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure your 'hotels' table has RLS policies allowing reads
        // Select specific columns including the image_url
        const { data, error: fetchError } = await supabase
          .from('hotels') // Make sure 'hotels' is your actual table name
          .select('id, name, location, image_url'); // <-- Explicitly select image_url

        if (fetchError) {
          throw fetchError;
        }
        const fetchedHotels = data || [];
        setHotels(fetchedHotels); // Store the original list
        setFilteredHotels(fetchedHotels); // Initialize filtered list with all hotels
      } catch (e: any) {
        console.error("Error fetching hotels:", e);
        setError(e.message || "Failed to fetch hotels.");
        setHotels([]); // Clear lists on error
        setFilteredHotels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, []);

  // Search filter handler
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      // If search is empty, show all hotels
      setFilteredHotels(hotels);
    } else {
      // Filter hotels based on name (case-insensitive)
      const filtered = hotels.filter(hotel =>
        hotel.name?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredHotels(filtered);
    }
  };

  // Render function for hotel items
  const renderHotelItem = ({ item }: { item: Hotel }) => (
    <Link href={{ pathname: "/browseMenu", params: { hotelId: item.id, hotelName: item.name } }} asChild>
      <TouchableOpacity style={styles.hotelItem}>
        {/* Hotel Image */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.hotelImage} resizeMode="cover" />
        ) : (
          <View style={[styles.hotelImage, styles.imagePlaceholder]}>
            {/* Use an icon for placeholder */}
            <Image source={Icons.browseHotel} style={styles.placeholderIcon} resizeMode="contain" />
          </View>
        )}
        {/* Hotel Text Content */}
        <View style={styles.hotelTextContainer}>
          <Text style={styles.hotelName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.hotelLocation} numberOfLines={1} ellipsizeMode="tail">{item.location}</Text>
        </View>
        {/* Chevron Icon */}
        <Image source={Icons.bolt} style={styles.chevronIcon} resizeMode="contain" />
      </TouchableOpacity>
    </Link>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#70B96F" />
          <Text style={styles.loadingText}>Finding hotels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Image source={Icons.bolt} style={styles.errorIcon} resizeMode="contain" />
          <Text style={styles.errorText}>Oops! Something went wrong.</Text>
          <Text style={styles.errorDetails}>{error}</Text>
          {/* Optionally add a retry button */}
          {/* <TouchableOpacity onPress={fetchHotels} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity> */}
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Render ---
  return (
    // Use SafeAreaView for better spacing on notches/islands
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Logo */}
        <View style={styles.headerContainer}>
          <Image
            source={Images.OrdaLogo} // <-- Use OrdaLogo
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Search Bar Container */}
        <View style={styles.searchContainer}>
          <Image source={Icons.search} style={styles.searchIcon} resizeMode="contain" />
          <TextInput
            // --- THIS IS THE UPDATED LINE ---
            placeholder="Search hotels or restaurants by name..."
            // --- END OF UPDATE ---
            style={styles.searchBar}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#888"
            clearButtonMode="while-editing" // iOS clear button
          />
        </View>

        {/* Hotel List */}
        <FlatList
          data={filteredHotels} // Use the filtered list here
          keyExtractor={(item) => item.id.toString()} // Ensure key is a string
          renderItem={renderHotelItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image source={Icons.search} style={styles.emptyIcon} resizeMode="contain" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No hotels or restaurants match your search.' : 'No hotels or restaurants found.'}
              </Text>
              <Text style={styles.emptySubText}>Try adjusting your search or check back later.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false} // Hide scrollbar if desired
        />
      </View>
    </SafeAreaView>
  );
}

// Updated styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5', // Slightly off-white background
  },
  container: {
    flex: 1,
    paddingHorizontal: 15, // Consistent horizontal padding
    paddingTop: Platform.OS === 'android' ? 15 : 0, // Adjust top padding for Android status bar
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 15, // Add vertical padding
    marginBottom: 5, // Space below logo
  },
  logo: {
    width: 80, // Adjust logo size
    height: 80,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // More rounded corners
    paddingHorizontal: 12,
    marginBottom: 20, // Space below search bar
    borderWidth: 1,
    borderColor: '#E0E0E0', // Lighter border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: '#888', // Icon color
    marginRight: 8,
  },
  searchBar: {
    flex: 1, // Take remaining space
    height: 48, // Slightly taller search bar
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20, // Padding at the bottom of the list
  },
  hotelItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, // Slightly more rounded corners
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, // Add padding inside the card
    borderWidth: 1,
    borderColor: '#F0F0F0', // Very light border
  },
  hotelImage: {
    width: 70, // Slightly smaller image
    height: 70,
    borderRadius: 8, // Rounded corners for image
    marginRight: 12, // Space between image and text
  },
  imagePlaceholder: {
    backgroundColor: '#E9ECEF', // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 30,
    height: 30,
    tintColor: '#ADB5BD', // Placeholder icon color
  },
  hotelTextContainer: {
    flex: 1, // Allow text container to take remaining space
    justifyContent: 'center', // Center text vertically
  },
  hotelName: {
    fontSize: 17, // Slightly larger name
    fontWeight: '600',
    color: '#343A40', // Darker text
    marginBottom: 3,
  },
  hotelLocation: {
    fontSize: 14,
    color: '#6C757D', // Grey for location
  },
  chevronIcon: {
    width: 18,
    height: 18,
    tintColor: '#CED4DA', // Light grey chevron
    marginLeft: 8, // Space before chevron
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA', // Match background
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C757D',
  },
  errorIcon: {
    width: 50,
    height: 50,
    tintColor: '#DC3545', // Red for error
    marginBottom: 15,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 5,
  },
  errorDetails: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50, // Add margin from the top
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    tintColor: '#ADB5BD',
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 5,
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6C757D',
  },
  // Optional Retry Button Styles
  // retryButton: {
  //   marginTop: 20,
  //   backgroundColor: '#007bff',
  //   paddingVertical: 10,
  //   paddingHorizontal: 25,
  //   borderRadius: 8,
  // },
  // retryButtonText: {
  //   color: '#FFFFFF',
  //   fontSize: 16,
  //   fontWeight: 'bold',
  // },
});

export default BrowseHotels;
