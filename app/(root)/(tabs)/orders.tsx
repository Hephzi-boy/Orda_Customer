// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\orders.tsx
import Images from '@/constants/Images'; // <-- Import Images for logo
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, // <-- Import Button
    Alert,
    Image, // <-- Import Image
    Platform,
    SafeAreaView, // <-- Import SafeAreaView
    ScrollView,
    StyleSheet,
    Text,
    TextInput, // <-- Import TextInput
    TouchableOpacity,
    View
} from 'react-native';

// Define a type for the item being ordered (passed via params)
interface OrderItemDetails {
    itemId: number;
    itemType: 'food' | 'drink' | 'room';
    itemName: string;
    itemPrice?: number;
    itemImageUrl?: string | null;
    hotelId: number; // Or business_id?
    hotelName?: string;
    quantity: number;
}

type PaymentMethod = 'online' | 'arrival';

const OrdersScreen = () => {
  const router = useRouter(); // Get router for navigation
  const params = useLocalSearchParams<{
      action?: string; // Expect 'placeOrder'
      itemId?: string;
      itemType?: 'food' | 'drink' | 'room';
      itemName?: string;
      itemPrice?: string;
      itemImageUrl?: string;
      hotelId?: string; // Or business_id?
      hotelName?: string;
  }>();

  // State related only to placing an order
  const [selectedItemForOrder, setSelectedItemForOrder] = useState<OrderItemDetails | null>(null);
  const [loading, setLoading] = useState(false); // General loading for placing order
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('arrival');

  // State for manually editable payment details for 'online' method
  const [customerEmailForPayment, setCustomerEmailForPayment] = useState<string>('');
  const [amountForPayment, setAmountForPayment] = useState<string>(''); // Stored as string for TextInput
  const [currencyForPayment, setCurrencyForPayment] = useState<string>('NGN'); // Default currency

  // --- Effect to handle incoming navigation parameters for placing an order ---
  useEffect(() => {
      // This effect runs when the component mounts or params change
      // It sets up the screen for placing an order based on navigation params
      if (params.action === 'placeOrder' && params.itemId && params.itemType && params.itemName && params.hotelId) {
        console.log("Received params for placing order:", params);

        // Parse IDs
        const hotelIdNumeric = parseInt(params.hotelId, 10);
        const itemIdNumeric = parseInt(params.itemId, 10);
        const itemPriceNumeric = params.itemPrice ? parseFloat(params.itemPrice) : undefined;

        // Validate parsed numbers
        if (isNaN(hotelIdNumeric) || isNaN(itemIdNumeric)) {
            console.error("Invalid numeric ID received in params:", params);
            setError("Invalid item or hotel information received.");
            // Optionally navigate back or show a persistent error
            return;
        }

        // Set the item details for the order confirmation UI
        setSelectedItemForOrder({
            itemId: itemIdNumeric,
            itemType: params.itemType,
            itemName: params.itemName,
            itemPrice: itemPriceNumeric,
            itemImageUrl: params.itemImageUrl || null,
            hotelId: hotelIdNumeric,
            hotelName: params.hotelName,
            quantity: 1
        });

        // Pre-fill payment details
        const user = supabase.auth.user();
        if (user) {
            setCustomerEmailForPayment(user.email || '');
        }
        const initialTotalPrice = (itemPriceNumeric || 0) * 1; // Assuming quantity is 1 initially
        setAmountForPayment(initialTotalPrice.toFixed(2));
        setCurrencyForPayment('NGN'); // Default or could be based on user profile/location

        setPaymentMethod('arrival');
        setError(null);
      } else {
          // If not navigated here with 'placeOrder' action, show placeholder or navigate away
          console.log("Orders screen loaded without 'placeOrder' action or required params.");
          setSelectedItemForOrder(null); // Ensure no item is selected
          // Clear payment specific fields too
          setCustomerEmailForPayment('');
          setAmountForPayment('');
          setCurrencyForPayment('NGN');
      }
      // Expanded dependencies to ensure effect runs if any relevant param changes
  }, [params.action, params.itemId, params.itemType, params.itemName, params.hotelId, params.itemPrice, params.itemImageUrl, params.hotelName]);
  

  // --- Handle Quantity Change ---
  const handleQuantityChange = (change: number) => {
      setSelectedItemForOrder(prev => {
          if (!prev) {
              return null;
          }
          const newQuantity = Math.max(1, prev.quantity + change);
          const newTotalPrice = (prev.itemPrice || 0) * newQuantity;
          setAmountForPayment(newTotalPrice.toFixed(2)); // Update amountForPayment based on new quantity
          return { ...prev, quantity: newQuantity };
      });
  };

  // --- Handle Placing the Actual Order ---
  const handlePlaceOrder = async () => {
      if (!selectedItemForOrder || placingOrder) return;

      // Set loading states and clear previous errors at the beginning
      setPlacingOrder(true);
      setLoading(true); // Keep general loading true as well
      setError(null);

      // --- Use v1 method to get user ---
      const user = supabase.auth.user();
      if (!user) {
          Alert.alert("Error", "User not logged in. Please sign in again.");
          setPlacingOrder(false); // Reset loading states
          setLoading(false);
          // Optionally, navigate to sign-in: router.replace('/sign-in');
          return;
      }

      // --- Handle Online Payment ---
      if (paymentMethod === 'online') {
          // Validate new manual input fields
          if (!customerEmailForPayment.trim() || !amountForPayment.trim() || !currencyForPayment.trim()) {
              Alert.alert("Input Required", "Please fill in your email, the amount, and currency for online payment.");
              setPlacingOrder(false);
              setLoading(false);
              return;
          }
          const parsedAmount = parseFloat(amountForPayment);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
              Alert.alert("Invalid Amount", "Please enter a valid amount for payment.");
              setPlacingOrder(false);
              setLoading(false);
              return;
          }
          if (currencyForPayment.trim().length !== 3) {
            Alert.alert("Invalid Currency", "Currency code should be 3 letters (e.g., NGN).");
            setPlacingOrder(false); setLoading(false); return;
          }

          try {
              // Prepare parameters for checkoutHookScreen
              // It expects totalPrice, customerEmail, and optionally currency & reference.
              // We are using the values from the state: amountForPayment, customerEmailForPayment, currencyForPayment
              const checkoutHookParams = {
                  totalPrice: amountForPayment, // This is the total amount confirmed by the user
                  customerEmail: customerEmailForPayment,
                  currency: currencyForPayment,
                  // You can add a reference if your checkoutHookScreen uses it
                  // reference: `ORDACUST_ONLINE_${Date.now()}`,
                  // Pass other details if checkoutHookScreen is designed to forward them or use them for metadata
                  // For now, we'll stick to the core payment details.
              };

              console.log("Navigating to Checkout Hook Screen with params:", checkoutHookParams);
              router.push({
                  pathname: '/checkoutHookScreen', // Navigate to the screen using the usePaystack hook
                  params: checkoutHookParams,
              });
              // Reset loading states for this screen as checkoutHookScreen takes over
              setPlacingOrder(false);
              setLoading(false);
          } catch (navError: any) {
              console.error("Error preparing or navigating to Checkout Hook Screen:", navError);
              const message = "Could not proceed to online payment. " + (navError.message || '');
              Alert.alert("Navigation Error", message);
              setError(message);
              setPlacingOrder(false);
              setLoading(false);
          }
          return; // Exit after handling online payment
      }

      // --- Existing logic for 'arrival' payment method ---
      try {
          // Prepare the order details (Ensure correct hotel/business ID column name)
          const orderDetails = {
              customer_id: user.id,
              hotel_id: selectedItemForOrder.hotelId, // Or business_id
              item_id: selectedItemForOrder.itemId,
              item_type: selectedItemForOrder.itemType,
              quantity: selectedItemForOrder.quantity,
              total_price: (selectedItemForOrder.itemPrice || 0) * selectedItemForOrder.quantity,
              status: 'pending',
              payment_method: paymentMethod, // Should be 'arrival' here
          };

          console.log("Placing order with data (arrival):", orderDetails);
          
          const { error: insertError } = await supabase
              .from('orders')
              .insert(orderDetails);

          if (insertError) {
              console.error("Supabase insert error:", JSON.stringify(insertError, null, 2));
              throw insertError;
          }

          // --- Success Path ---
          setSelectedItemForOrder(null); // Clear form data

          // Show success alert and NAVIGATE on dismiss for 'arrival'
          Alert.alert(
              'Success',
              'Order Placed Successfully!',
              [
                  {
                      text: 'OK',
                      onPress: () => {
                          // --- Navigate to the Order History screen ---
                          console.log("Alert dismissed, navigating to Order History...");
                          // Use replace to prevent going back to the order confirmation screen
                          router.replace('/orderHistory'); // Navigate to the history screen
                      }
                  }
              ],
              { cancelable: false }
          );

      } catch (e: any) {
          console.error("Error placing order (arrival):", JSON.stringify(e, null, 2), e);
          const errorMessage = e.message || "Failed to place order.";
          setError(errorMessage);
          Alert.alert('Order Failed', errorMessage);
          // Ensure loading stops even on error
          setPlacingOrder(false);
          setLoading(false);
      } finally {
          // This 'finally' block is primarily for the 'arrival' payment path.
          // For the 'arrival' success case, loading states are not reset in the 'try' block above.
          // The original code relied on component unmount after router.replace.
          // If an error occurred in 'arrival', loading states are reset in 'catch'.
      }
  };


  // --- Render Content (Only Place Order UI) ---
  const renderContent = () => {
      // Combined loading state check
      if (placingOrder || (loading && !selectedItemForOrder)) {
          return (
              <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>
                      {placingOrder ? 'Placing your order...' : 'Loading...'}
                  </Text>
              </View>
          );
      }

      // Show error if item details couldn't be loaded
      if (error && !selectedItemForOrder) {
          return (
              <View style={styles.centered}>
                  <Text style={styles.errorText}>Error: {error}</Text>
                  <TouchableOpacity onPress={() => router.replace('/browseHotel')} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Go Back</Text>
                  </TouchableOpacity>
              </View>
          )
      }

      // Render the order confirmation UI if item is selected
      if (selectedItemForOrder) {
        const totalPrice = (selectedItemForOrder.itemPrice || 0) * selectedItemForOrder.quantity;
        return (
          // Use a Fragment to return multiple elements without a parent View
          <>
            <ScrollView contentContainerStyle={styles.placeOrderContainer}>
              {/* Removed Title from here, placed above ScrollView */}
              {selectedItemForOrder.itemImageUrl ? (
                <Image source={{ uri: selectedItemForOrder.itemImageUrl }} style={styles.placeOrderImage} resizeMode="cover" />
              ) : (
                <View style={[styles.placeOrderImage, styles.imagePlaceholder]}>
                   <Text style={styles.placeholderTextSmall}>No Image</Text>
                </View>
              )}
              <Text style={styles.placeOrderItemName}>{selectedItemForOrder.itemName}</Text>
              <Text style={styles.placeOrderItemHotel}>From: {selectedItemForOrder.hotelName || 'Hotel'}</Text>
              {selectedItemForOrder.itemPrice !== undefined && (
                  <Text style={styles.placeOrderItemPrice}>
                      Price per item: ${selectedItemForOrder.itemPrice.toFixed(2)}
                  </Text>
              )}
              <View style={styles.quantityContainer}>
                  <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(-1)} disabled={placingOrder}>
                      <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{selectedItemForOrder.quantity}</Text>
                  <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(1)} disabled={placingOrder}>
                      <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
              </View>
               {selectedItemForOrder.itemPrice !== undefined && (
                  <Text style={styles.totalPriceText}>
                      Total: ${totalPrice.toFixed(2)}
                  </Text>
              )}

              {/* Payment Method Selection - Moved up to be visible before online payment inputs */}
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <View style={styles.paymentRow}>
                  <TouchableOpacity
                      style={[styles.paymentOption, paymentMethod === 'online' && styles.selectedOption, placingOrder && styles.disabledButton]}
                      onPress={() => setPaymentMethod('online')}
                      disabled={placingOrder}
                  >
                      <Text style={styles.paymentOptionText}>Online</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[styles.paymentOption, paymentMethod === 'arrival' && styles.selectedOption, placingOrder && styles.disabledButton]}
                      onPress={() => setPaymentMethod('arrival')}
                      disabled={placingOrder}
                  >
                      <Text style={styles.paymentOptionText}>On Arrival</Text>
                  </TouchableOpacity>
              </View>

              {/* Conditional Inputs for Online Payment */}
              {paymentMethod === 'online' && (
                <View style={styles.onlinePaymentInputsContainer}>
                  <Text style={styles.paymentInputLabel}>Confirm Email for Payment:</Text>
                  <TextInput style={styles.paymentInput} value={customerEmailForPayment} onChangeText={setCustomerEmailForPayment} placeholder="your.email@example.com" keyboardType="email-address" autoCapitalize="none" editable={!placingOrder} />
                  <Text style={styles.paymentInputLabel}>Confirm Amount:</Text>
                  <TextInput style={styles.paymentInput} value={amountForPayment} onChangeText={setAmountForPayment} placeholder="e.g., 50.00" keyboardType="numeric" editable={!placingOrder} />
                  <Text style={styles.paymentInputLabel}>Currency (e.g., NGN):</Text>
                  <TextInput style={styles.paymentInput} value={currencyForPayment} onChangeText={(text) => setCurrencyForPayment(text.toUpperCase())} placeholder="NGN" autoCapitalize="characters" maxLength={3} editable={!placingOrder} />
                </View>
              )}

              {/* Display placement-specific errors */}
              {error && <Text style={[styles.errorText, { marginTop: 15, marginBottom: 15 }]}>{error}</Text>}

              {/* Buttons are moved outside the ScrollView */}

            </ScrollView>

            {/* --- Button Container (Outside ScrollView) --- */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.placeOrderButton, placingOrder && styles.disabledButton]}
                    onPress={handlePlaceOrder}
                    disabled={placingOrder}
                >
                    <Text style={styles.placeOrderButtonText}>Place Order</Text>
                </TouchableOpacity>
                 <TouchableOpacity
                    style={[styles.cancelButton, placingOrder && styles.disabledButton]}
                    // Cancel could navigate back or to the menu
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/browseHotel')}
                    disabled={placingOrder}
                 >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
          </>
        );
      } else {
        // Placeholder if navigated here without proper params or after clearing
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>No item selected for order.</Text>
            <Text style={styles.placeholderSubText}>
              Please select an item from the menu first.
            </Text>
            {/* Optional: Button to go back */}
            <TouchableOpacity onPress={() => router.replace('/browseHotel')} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Browse Hotels</Text>
            </TouchableOpacity>
          </View>
        );
      }
  };

  // --- Main Return ---
  return (
    // Use SafeAreaView for better spacing on notches/islands
    <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
            {/* --- LOGO AT THE TOP --- */}
            <View style={styles.headerContainer}>
                <Image
                    source={Images.OrdaLogo}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            {/* --- END LOGO --- */}

            {/* --- TITLE (Moved here, above ScrollView if item selected) --- */}
            {selectedItemForOrder && (
                <Text style={styles.placeOrderTitle}>Confirm Your Order</Text>
            )}

            {/* Render the main content (ScrollView + Buttons or Placeholder) */}
            {renderContent()}
        </View>
    </SafeAreaView>
  );
};

// --- Styles (Updated) ---
const styles = StyleSheet.create({
    safeArea: { // Added SafeAreaView styles
      flex: 1,
      backgroundColor: '#E4EBE5',
    },
    container: {
      flex: 1,
      backgroundColor: '#E4EBE5',
      // Removed paddingTop from here, added to headerContainer
    },
    headerContainer: { // Added for Logo
      alignItems: 'center',
      paddingTop: Platform.OS === 'android' ? 25 : 15, // Added more top padding here
      paddingBottom: 10, // Space below logo
    },
    logo: { // Added for Logo
      width: 80,
      height: 80,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#E4EBE5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#555',
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      backgroundColor: '#E4EBE5',
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    placeholderSubText: {
        fontSize: 15,
        color: '#555',
        textAlign: 'center',
    },
    placeholderTextSmall: {
        fontSize: 12,
        color: '#888',
    },
    errorText: {
      color: 'red',
      fontSize: 16,
      textAlign: 'center',
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
    // Styles for Place Order section
    placeOrderContainer: { // Styles for the ScrollView content
        paddingHorizontal: 20,
        paddingBottom: 20, // Add padding at the bottom of scroll content
        alignItems: 'center',
        flexGrow: 1,
    },
    placeOrderTitle: { // Moved outside ScrollView, style remains
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15, // Adjusted margin
        color: '#333',
        textAlign: 'center', // Center the title
    },
    placeOrderImage: {
        width: 150,
        height: 150,
        borderRadius: 10,
        marginBottom: 15,
        backgroundColor: '#e0e0e0',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    placeOrderItemName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#444',
        marginBottom: 5,
        textAlign: 'center',
    },
    placeOrderItemHotel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        textAlign: 'center',
    },
    placeOrderItemPrice: {
        fontSize: 16,
        color: '#28a745', // <-- Changed color to green
        marginBottom: 20,
        fontWeight: '500', // Added slight weight
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 5,
    },
    quantityButton: {
        backgroundColor: '#007bff',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    quantityButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    quantityText: {
        fontSize: 18,
        fontWeight: 'bold',
        minWidth: 30,
        textAlign: 'center',
        color: '#333',
    },
    totalPriceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
        marginBottom: 15,
    },
    paymentLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        alignSelf: 'flex-start',
        marginLeft: '10%', // Align with payment options
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 20, // Space before online payment inputs or error
        width: '80%',
    },
    paymentOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderWidth: 1.5,
        borderRadius: 8,
        borderColor: '#ccc',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    selectedOption: {
        borderColor: '#007bff',
        backgroundColor: '#e7f3ff',
    },
    paymentOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    // Styles for new online payment inputs
    onlinePaymentInputsContainer: {
        width: '90%', // Container for the inputs
        marginBottom: 15,
        alignItems: 'stretch', // Make children stretch
    },
    paymentInputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#444',
        marginBottom: 5,
        marginTop: 10, // Space above each label
    },
    paymentInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#333',
        marginBottom: 5, // Space below each input
    },
    // --- Button Container (New Style) ---
    buttonContainer: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#d0d0d0',
        backgroundColor: '#E4EBE5', // Match background
        alignItems: 'center', // Center buttons horizontally
    },
    placeOrderButton: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 8,
        alignItems: 'center',
        width: '90%', // Make buttons wider
        marginBottom: 10, // Space between buttons
    },
    placeOrderButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#dc3545',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 8,
        alignItems: 'center',
        width: '90%', // Make buttons wider
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    disabledButton: {
        opacity: 0.6,
    }
});

export default OrdersScreen;
