import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { usePaystack } from 'react-native-paystack-webview'; // Import the hook

// Define the expected parameters from the route
type CheckoutHookRouteParams = {
  totalPrice: string;
  customerEmail: string;
  currency?: string;
  reference?: string; // Optional: if you generate references beforehand
  // You can add more parameters here if needed for metadata, split, etc.
};

// Define the route type for useRoute hook
type CheckoutHookScreenRouteProp = RouteProp<{ params: CheckoutHookRouteParams }, 'params'>;

const CheckoutHookScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<CheckoutHookScreenRouteProp>();
  const { popup, isInitializing } = usePaystack(); // Use the hook

  // Access params safely
  const { customerEmail, totalPrice, currency, reference } = route.params || {};

  // Basic validation
  if (!customerEmail || !totalPrice) {
    Alert.alert('Payment Error', 'Essential payment details are missing.');
    if (navigation.canGoBack()) navigation.goBack();
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Missing payment details.</Text>
      </View>
    );
  }

  const amountInMajorUnit = parseFloat(totalPrice);
  const resolvedCurrency = currency || 'NGN'; // Default to NGN

  if (isNaN(amountInMajorUnit) || amountInMajorUnit <= 0) {
    Alert.alert('Payment Error', 'Invalid payment amount.');
    if (navigation.canGoBack()) navigation.goBack();
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Invalid payment amount.</Text>
      </View>
    );
  }

  // Paystack expects amount in minor units (kobo for NGN, cents for USD)
  const amountInMinorUnit = Math.round(amountInMajorUnit * 100);

  const payNow = () => {
    popup.checkout({
      email: customerEmail,
      amount: amountInMinorUnit,
      currency: resolvedCurrency,
      reference: reference || `ORDACUST_${Date.now()}`, // Generate a unique reference
      // You can include other parameters from your example code block here:
      // plan: 'PLN_example123',
      // invoice_limit: 3,
      // subaccount: 'SUB_abc123',
      // split_code: 'SPL_def456',
      // split: { ... },
      metadata: {
        custom_fields: [
          {
            display_name: 'Order ID',
            variable_name: 'order_id',
            value: `OID_${Date.now()}` // Example dynamic Order ID
          },
          // Add more custom fields as needed
        ]
      },
      onSuccess: (res) => {
        console.log('Payment Success (Hook):', res);
        Alert.alert('Payment Successful', `Transaction completed! Reference: ${res.transactionRef}`);
        // Navigate back or to a success screen
        if (navigation.canGoBack()) navigation.goBack();
      },
      onCancel: () => {
        console.log('User cancelled payment (Hook)');
        Alert.alert('Payment Cancelled', 'Transaction was cancelled.');
        if (navigation.canGoBack()) navigation.goBack();
      },
      onLoad: (res) => {
        console.log('Paystack WebView Loaded (Hook):', res);
      },
      onError: (err) => {
        console.log('Paystack WebView Error (Hook):', err);
        Alert.alert('Payment Error', 'An error occurred during payment. Please try again.');
        if (navigation.canGoBack()) navigation.goBack();
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.infoText}>Email: {customerEmail}</Text>
      <Text style={styles.infoText}>Amount: {resolvedCurrency} {amountInMajorUnit.toFixed(2)}</Text>
      {isInitializing ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Pay Now" onPress={payNow} />
      )}
      <View style={{ marginTop: 20 }}>
        <Button title="Cancel Payment" onPress={() => navigation.goBack()} color="gray" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  infoText: { fontSize: 16, marginBottom: 10, color: '#333' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
});

export default CheckoutHookScreen;