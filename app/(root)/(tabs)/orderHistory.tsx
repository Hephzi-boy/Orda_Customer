// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\orderHistory.tsx
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router'; // Use useFocusEffect to fetch on screen focus
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Interface for Order data (matches the one from orders.tsx)
interface Order {
  id: string;
  hotel_id: number;
  item_id: number;
  item_type: 'food' | 'drink' | 'room';
  status: string;
  created_at: string;
  item_name?: string;
  item_price?: number;
  customer_id: string;
  quantity: number;
  total_price: number;
  payment_method?: 'online' | 'arrival';
}

const OrderHistoryScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Fetch Order History ---
  const fetchOrders = async () => {
    // Prevent refetch if already loading history specifically (unless refreshing)
    if (loadingHistory && !refreshing) return;

    console.log("Attempting to fetch order history...");
    // Ensure loading state is true when fetching starts
    if (!refreshing) {
        setLoadingHistory(true);
    }
    setError(null);

    try {
      // --- Use v1 method ---
      const user = supabase.auth.user();
      if (!user) throw new Error("User not logged in");

      console.log(`Fetching orders for user: ${user.id}`);

      // Fetch orders for the current user
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
            id, hotel_id, item_id, item_type, status, created_at,
            quantity, total_price, payment_method, customer_id
        `) // Adjust hotel_id if it's business_id
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log(`Fetched ${data?.length ?? 0} orders from Supabase.`);

      // Map data
      const fetchedOrders: Order[] = (data || []).map(order => {
          const orderId = order.id;
          const hotelId = Number(order.hotel_id ?? 0);
          const itemId = Number(order.item_id ?? 0);
          const quantity = Number(order.quantity ?? 0);
          const totalPrice = Number(order.total_price ?? 0);

          if (isNaN(hotelId) || isNaN(itemId)) {
              console.warn("Found NaN numeric ID after conversion for order:", order);
          }

          return {
              id: orderId,
              hotel_id: hotelId,
              item_id: itemId,
              item_type: order.item_type,
              status: order.status,
              created_at: order.created_at,
              customer_id: order.customer_id,
              quantity: quantity,
              total_price: totalPrice,
              payment_method: order.payment_method,
          };
      });

      setOrders(fetchedOrders);
      console.log(`Set ${fetchedOrders.length} orders in state.`);

    } catch (e: any) {
      console.error("Error fetching order history:", JSON.stringify(e, null, 2), e);
      setError(e.message || "Failed to fetch order history.");
      setOrders([]);
    } finally {
      setLoadingHistory(false); // Stop loading history
      setRefreshing(false); // Stop refreshing indicator
      console.log("Finished fetchOrders attempt.");
    }
  };

  // --- UseFocusEffect to fetch data when the screen comes into focus ---
  useFocusEffect(
    useCallback(() => {
      console.log("Order History screen focused, fetching orders...");
      fetchOrders();

      // Optional: Return a cleanup function if needed, though usually not for focus effect fetching
      // return () => console.log("Order History screen unfocused");
    }, []) // Empty dependency array ensures it runs on focus
  );

  // --- Refresh Handler ---
   const onRefresh = useCallback(() => {
    console.log("Pull-to-refresh triggered.");
    setRefreshing(true);
    setError(null);
    fetchOrders(); // Call fetchOrders on pull-to-refresh
  }, []); // No dependencies needed here

  // --- Render Order Item ---
  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderItem}>
      <Text style={styles.itemText}>Order ID: {item.id}</Text>
      <Text style={styles.itemText}>Hotel ID: {item.hotel_id}</Text>
      <Text style={styles.itemText}>Item ID: {item.item_id}</Text>
      <Text style={styles.itemText}>Type: {item.item_type}</Text>
      <Text style={styles.itemText}>Quantity: {item.quantity}</Text>
      <Text style={styles.itemText}>Total: ${item.total_price?.toFixed(2)}</Text>
      {item.payment_method && (
          <Text style={styles.itemText}>
            Payment: <Text style={styles.statusText}>{item.payment_method}</Text>
          </Text>
      )}
      <Text style={styles.itemText}>
        Status: <Text style={styles.statusText}>{item.status}</Text>
      </Text>
      <Text style={styles.itemDate}>
        Placed: {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  // --- Render Loading State ---
  if (loadingHistory && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading order history...</Text>
      </View>
    );
  }

  // --- Render Error State ---
  if (error && !loadingHistory) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
           <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Render History List ---
  return (
    <View style={styles.container}>
        <Text style={styles.title}>Your Order History</Text>
        <FlatList
            data={orders}
            keyExtractor={(item) => item.id} // Use the UUID string directly as the key
            renderItem={renderOrderItem}
            ListEmptyComponent={
                // Show different message if loading vs. truly empty
                loadingHistory ? ( // Should ideally not be reached if loading handled above, but safe fallback
                    <View style={styles.centered}><Text style={styles.emptyText}>Loading...</Text></View>
                ) : (
                    <Text style={styles.emptyText}>No order history found.</Text>
                )
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#007bff"]}
                    tintColor={"#007bff"}
                />
            }
        />
    </View>
  );
};

// --- Styles (Copied and adapted from orders.tsx) ---
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#E4EBE5',
      paddingTop: 20, // Add padding at the top
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#E4EBE5', // Ensure background matches
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#555',
    },
    listContent: {
      paddingHorizontal: 15, // Add horizontal padding for list items
      paddingBottom: 20, // Add padding at the bottom
      flexGrow: 1, // Important for ListEmptyComponent to show correctly
    },
    orderItem: {
      backgroundColor: '#FFFFFF',
      padding: 15,
      borderRadius: 8,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 1.5,
      elevation: 2,
    },
    itemText: {
      fontSize: 15,
      color: '#444',
      marginBottom: 4,
      flexShrink: 1,
    },
    statusText: {
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    itemDate: {
        fontSize: 12,
        color: '#777',
        marginTop: 5,
    },
    errorText: {
      color: 'red',
      fontSize: 16, // Slightly larger error text
      textAlign: 'center',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 50,
      fontSize: 16,
      color: '#666',
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        marginTop: 15,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default OrderHistoryScreen;
