// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\browseMenu.tsx
import Images from '@/constants/Images'; // <-- Import Images for the logo
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image, // <-- Import Image
  Platform, // <-- Import Platform
  SafeAreaView, // <-- Import SafeAreaView
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Define types for your data including image_url
interface Food {
  id: string | number;
  name: string;
  price?: number;
  hotel_id: string | number;
  image_url?: string | null;
}

interface Drink {
  id: string | number;
  name: string;
  price?: number;
  hotel_id: string | number;
  image_url?: string | null;
}

interface Room {
  id: string | number;
  room_type: string;
  price_per_night?: number;
  hotel_id: string | number;
  image_url?: string | null;
}

export default function BrowseMenu() {
  const router = useRouter();
  const params = useLocalSearchParams<{ hotelId?: string; hotelName?: string }>();
  const { hotelId, hotelName } = params;

  const [foods, setFoods] = useState<Food[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hotelId) {
      setError("Hotel ID is missing. Cannot load menu.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [foodResponse, drinkResponse, roomResponse] = await Promise.all([
          supabase.from('food').select('id, name, price, hotel_id, image_url').eq('hotel_id', hotelId),
          supabase.from('drinks').select('id, name, price, hotel_id, image_url').eq('hotel_id', hotelId),
          supabase.from('rooms').select('id, room_type, price_per_night, hotel_id, image_url').eq('hotel_id', hotelId)
        ]);

        if (foodResponse.error) throw foodResponse.error;
        if (drinkResponse.error) throw drinkResponse.error;
        if (roomResponse.error) throw roomResponse.error;

        setFoods(foodResponse.data || []);
        setDrinks(drinkResponse.data || []);
        setRooms(roomResponse.data || []);

      } catch (e: any) {
        console.error("Error fetching menu data:", e);
        setError(e.message || "Failed to fetch menu items.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hotelId]);

  const handleSelect = (item: Food | Drink | Room, type: 'food' | 'drink' | 'room') => {
    console.log(`Selected ${type}:`, item);

    const itemName = type === 'room' ? (item as Room).room_type : item.name;
    const itemPrice = type === 'room' ? (item as Room).price_per_night : (item as Food | Drink).price;

    router.push({
      pathname: '/orders',
      params: {
          action: 'placeOrder',
          itemId: item.id.toString(),
          itemType: type,
          itemName: itemName,
          itemPrice: itemPrice?.toString(),
          itemImageUrl: item.image_url || '',
          hotelId: hotelId,
          hotelName: hotelName
      }
    });
  };

   // Render function for list items with larger Image
   const renderMenuItem = ({ item, type }: { item: Food | Drink | Room, type: 'food' | 'drink' | 'room' }) => (
    <TouchableOpacity
      style={styles.menuItemButton} // Style updated for larger size
      onPress={() => handleSelect(item, type)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.menuItemImage} resizeMode="cover" /> // Style updated for larger size
      ) : (
        <View style={[styles.menuItemImage, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No Pic</Text>
        </View>
      )}
      <View style={styles.menuItemTextContainer}>
          <Text style={styles.menuItemText} numberOfLines={1} ellipsizeMode="tail">
            {type === 'room' ? (item as Room).room_type : item.name}
          </Text>
          {/* Optionally display price */}
          {/* <Text style={styles.itemPrice}>${type === 'room' ? (item as Room).price_per_night : (item as Food | Drink).price}</Text> */}
      </View>
    </TouchableOpacity>
  );


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

   if (!hotelId) {
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No Hotel Selected</Text>
          <Text>Please go back and select a hotel from the 'Hotels' tab.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // Use SafeAreaView for better spacing on notches/islands
    <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
            {/* --- LOGO AT THE TOP --- */}
            <View style={styles.headerContainer}>
                <Image
                    source={Images.OrdaLogo}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            {/* --- END LOGO --- */}

            {/* --- TITLE WITH CUSTOM FONT --- */}
            <Text style={styles.title}>Menu for {hotelName || 'Selected Hotel'}</Text>
            {/* --- END TITLE --- */}

            {/* Foods Section */}
            <Text style={styles.sectionTitle}>Foods</Text>
            {foods.length > 0 ? (
                <FlatList
                data={foods}
                horizontal
                renderItem={({ item }) => renderMenuItem({ item, type: 'food' })}
                keyExtractor={(item) => `food-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                />
            ) : (
                <Text style={styles.emptyText}>No food items available for this hotel.</Text>
            )}


            {/* Drinks Section */}
            <Text style={styles.sectionTitle}>Drinks</Text>
            {drinks.length > 0 ? (
                <FlatList
                data={drinks}
                horizontal
                renderItem={({ item }) => renderMenuItem({ item, type: 'drink' })}
                keyExtractor={(item) => `drink-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                />
            ) : (
                <Text style={styles.emptyText}>No drink items available for this hotel.</Text>
            )}

            {/* Rooms Section */}
            <Text style={styles.sectionTitle}>Rooms</Text>
            {rooms.length > 0 ? (
                <FlatList
                data={rooms}
                horizontal
                renderItem={({ item }) => renderMenuItem({ item, type: 'room' })}
                keyExtractor={(item) => `room-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                />
            ) : (
                <Text style={styles.emptyText}>No room information available for this hotel.</Text>
            )}

            {/* Add some space at the bottom */}
            <View style={{ height: 30 }} />

        </ScrollView>
    </SafeAreaView>
  );
}

// Updated styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 0, // Adjust top padding for Android
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 15, // Space around the logo
    marginBottom: 5, // Space below logo before title
  },
  logo: {
    width: 80, // Adjust logo size as needed
    height: 80,
  },
   title: {
    fontSize: 22,
    fontWeight: 'bold', // Keep bold or adjust as needed
    marginBottom: 25, // Space below title
    color: '#333',
    textAlign: 'center',
    fontFamily: 'WinkySans-Regular', // <-- APPLY CUSTOM FONT HERE
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 25, // Increased space between sections
    marginBottom: 15, // Space before the horizontal list
    color: '#444',
    paddingLeft: 5,
    // Consider applying a WinkySans font here too if desired
    // fontFamily: 'WinkySans-Medium', // Example
  },
  listContent: {
    paddingLeft: 5,
    paddingBottom: 10,
  },
  menuItemButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, // Slightly more rounded
    marginRight: 15, // Increased space between items
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, // Slightly increased shadow
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    elevation: 3,
    overflow: 'hidden',
    width: 140, // Increased width for larger image
  },
  menuItemImage: {
    width: '100%',
    height: 100, // Increased height for larger image
  },
  imagePlaceholder: {
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12, // Made placeholder text slightly larger
    color: '#888',
  },
  menuItemTextContainer: {
     paddingVertical: 10, // Increased padding
     paddingHorizontal: 8,
     alignItems: 'center',
     minHeight: 40, // Ensure space for text even if short
  },
  menuItemText: {
    fontSize: 14, // Slightly larger text
    fontWeight: '500',
    color: '#007bff',
    textAlign: 'center',
    // Consider applying a WinkySans font here too if desired
    // fontFamily: 'WinkySans-Regular', // Example
  },
  itemPrice: {
    fontSize: 13, // Slightly larger price text
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
      textAlign: 'left',
      marginTop: 5,
      fontSize: 14,
      color: '#666',
      fontStyle: 'italic',
      marginLeft: 5,
  }
});
