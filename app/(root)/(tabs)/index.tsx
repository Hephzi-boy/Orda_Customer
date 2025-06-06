// app/(root)/(tabs)/index.tsx
import Icons from '@/constants/Icons';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal, // <-- Import Modal
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView, // <-- Import ScrollView for modal content if it gets long
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Get screen width for styling
const { width: screenWidth } = Dimensions.get('window');

// --- Data Structure Interfaces ---
interface RecentActivityItem {
  id: string;
  type: 'order';
  timestamp: Date;
  details: string;
  item_type: string;
  status: string;
  total_price: number;
  item_name?: string | null;
  quantity?: number | null;
}

type ScreenSectionType =
  | 'welcome'
  | 'featuresGrid'
  | 'activityHeader'
  | 'activityItem'
  | 'activityLoading'
  | 'activityEmpty'
  | 'activityError';

interface ScreenSection {
  id: string;
  type: ScreenSectionType;
  data?: any;
}

// --- HomeScreen Component ---
const HomeScreen = () => {
  const router = useRouter();

  // --- State Management ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ username?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorActivity, setErrorActivity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Modal State ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<RecentActivityItem | null>(null);

  // --- Data Fetching Logic ---
  const fetchUserData = useCallback(async () => {
    console.log("HomeScreen: Fetching user data...");
    setLoadingUser(true);
    setUserProfile(null);
    setCurrentUser(null);
    try {
      const user = supabase.auth.user();
      if (user) {
        setCurrentUser(user);
        const { data: profileData, error: profileError } = await supabase
          .from('profile')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) {
          console.error('Error fetching username:', profileError.message);
          setUserProfile({ username: user.email?.split('@')[0] || 'User' });
        } else {
          setUserProfile(profileData || { username: user.email?.split('@')[0] || 'User' });
        }
      } else {
        console.log("No active user session found.");
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const fetchActivityData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing && !loadingActivity) setLoadingActivity(true); // Ensure loading is true if not already
    if (isRefreshing) setRefreshing(true);
    setErrorActivity(null);

    let userIdForActivity: string | null = currentUser?.id || null;
    if (!userIdForActivity && !loadingUser) {
      const user = supabase.auth.user();
      userIdForActivity = user?.id || null;
    }

    if (!userIdForActivity) {
      setRecentActivity([]);
      setLoadingActivity(false);
      if (isRefreshing) setRefreshing(false);
      return;
    }

    try {
      const { data: activityResponseData, error: activityResponseError } = await supabase
        .from('orders')
        .select('id, created_at, item_type, item_name, quantity, status, total_price')
        .eq('customer_id', userIdForActivity)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activityResponseError) {
        setErrorActivity(activityResponseError.message);
        setRecentActivity([]);
      } else {
        const formattedActivities: RecentActivityItem[] = (activityResponseData || []).map(order => ({
          id: order.id,
          type: 'order',
          timestamp: new Date(order.created_at),
          details: `Ordered ${order.quantity || 0}x ${order.item_name || order.item_type || 'item'} for $${(order.total_price || 0).toFixed(2)}`,
          item_type: order.item_type || 'unknown',
          status: order.status || 'unknown',
          total_price: order.total_price || 0,
          item_name: order.item_name,
          quantity: order.quantity,
        }));
        setRecentActivity(formattedActivities);
      }
    } catch (error: any) {
      setErrorActivity(error.message || "Failed to load activity.");
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [currentUser, loadingUser, loadingActivity]); // Added loadingActivity to dependencies

  useEffect(() => {
    if (!loadingUser) {
      fetchActivityData();
    }
  }, [fetchActivityData, loadingUser, currentUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData().then(() => fetchActivityData(true));
  }, [fetchUserData, fetchActivityData]);

  // --- Modal Control Functions ---
  const openOrderDetailsModal = (order: RecentActivityItem) => {
    setSelectedOrderForModal(order);
    setIsModalVisible(true);
  };

  const closeOrderDetailsModal = () => {
    setIsModalVisible(false);
    setSelectedOrderForModal(null);
  };

  // --- Handle Order Cancellation (Updated to close modal) ---
  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      "Confirm Cancellation",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId)
                .eq('status', 'pending');

              if (error) throw error;

              Alert.alert("Success", "Order cancelled successfully.");
              fetchActivityData(true); // Refresh activity list
            } catch (e: any) {
              console.error("Error cancelling order:", e);
              Alert.alert("Error", e.message || "Failed to cancel order.");
            } finally {
              closeOrderDetailsModal(); // Close modal after attempt
            }
          },
        },
      ]
    );
  };

  // --- Prepare Data for Rendering ---
  const screenSections: ScreenSection[] = [
    { id: 'welcome', type: 'welcome' },
    { id: 'features', type: 'featuresGrid' },
    { id: 'activityHeader', type: 'activityHeader' },
  ];

  if (loadingActivity && !refreshing && recentActivity.length === 0) { // Show loading only if no data and not refreshing
    screenSections.push({ id: 'activityLoading', type: 'activityLoading' });
  } else if (errorActivity) {
    screenSections.push({ id: 'activityError', type: 'activityError', data: { message: `Error: ${errorActivity}` } });
  } else if (recentActivity.length > 0) {
    recentActivity.forEach(activity => {
      screenSections.push({ id: `activity-${activity.id}`, type: 'activityItem', data: activity });
    });
  } else { // No error, not loading, and no activity
    screenSections.push({ id: 'activityEmpty', type: 'activityEmpty', data: { message: "No recent activity." } });
  }

  // --- Rendering Helpers ---
  const renderFeaturesGrid = () => (
    <View style={styles.featuresContainer}>
      <View style={styles.featuresRow}>
        <TouchableOpacity style={styles.featureBox} onPress={() => router.push('/browseHotel')}>
          <Image source={Icons.search} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureTitle}>Hotels</Text>
          <Text style={styles.featureSubtitle}>Find the latest hotels instantly</Text>
          <Text style={styles.featureLink}>learn more</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureBox} onPress={() => router.push('/orderHistory')}>
          <Image source={Icons.love} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureTitle}>Order History</Text>
          <Text style={styles.featureSubtitle}>View your past orders</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.featuresRow}>
        <TouchableOpacity style={styles.featureBox} onPress={() => router.push('/orders')}>
          <Image source={Icons.paymentMethod} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureTitle}>Easy Payments</Text>
          <Text style={styles.featureSubtitle}>Secure payment methods</Text>
          <Text style={styles.featureLink}>learn more</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.featureBox} onPress={() => router.push('/browseMenu')}>
          <Image source={Icons.bolt} style={styles.featureIcon} resizeMode="contain" />
          <Text style={styles.featureTitle}>Quick Actions</Text>
          <Text style={styles.featureSubtitle}>Find the latest international dishes and new exotic bedrooms</Text>
          <Text style={styles.featureLink}>learn more</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActivityItem = (item: RecentActivityItem) => {
    let icon;
    switch (item.item_type) {
      case 'food': icon = Icons.browseMenu; break;
      case 'drink': icon = Icons.browseMenu; break;
      case 'room': icon = Icons.browseHotel; break;
      default: icon = Icons.ShoppingBagOutline;
    }

    let statusStyle = styles.statusDefault;
    if (item.status === 'pending') statusStyle = styles.statusPending;
    else if (item.status === 'cancelled') statusStyle = styles.statusCancelled;
    else if (item.status === 'confirmed' || item.status === 'delivered') statusStyle = styles.statusConfirmed;

    return (
      <TouchableOpacity onPress={() => openOrderDetailsModal(item)}>
        <View style={styles.activityItem}>
          <Image source={icon} style={styles.activityIcon} resizeMode="contain" />
          <View style={styles.activityTextContainer}>
            <Text style={styles.activityDetails} numberOfLines={2} ellipsizeMode="tail">{item.details}</Text>
            <Text style={styles.activityTimestamp}>
              Status: <Text style={statusStyle}>{item.status}</Text>
            </Text>
            <Text style={styles.activityTimestamp}>{item.timestamp.toLocaleString()}</Text>
          </View>
          {/* The cancel button is now inside the modal */}
        </View>
      </TouchableOpacity>
    );
  };

  const renderScreenItem = ({ item }: ListRenderItemInfo<ScreenSection>) => {
    switch (item.type) {
      case 'welcome':
        return (
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>Welcome to Orda!</Text>
              <Text style={styles.welcomeSubtitle}>
                Start exploring amazing hotels and their exquisite dishes, drinks and master bedrooms.
              </Text>
            </View>
          </View>
        );
      case 'featuresGrid':
        return renderFeaturesGrid();
      case 'activityHeader':
        return <View style={styles.activityHeaderContainer}><Text style={styles.sectionTitle}>Recent Activity</Text></View>;
      case 'activityItem':
        return item.data ? <View style={styles.activityItemWrapper}>{renderActivityItem(item.data)}</View> : null;
      case 'activityLoading':
        return <View style={styles.activityStatusContainer}><ActivityIndicator size="large" color="#007bff" /></View>;
      case 'activityError':
        return (
          <View style={styles.activityStatusContainer}>
            <Text style={styles.noActivityText}>{item.data?.message || "Could not load activity."}</Text>
            <TouchableOpacity onPress={() => fetchActivityData()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry Activity</Text>
            </TouchableOpacity>
          </View>
        );
      case 'activityEmpty':
        return (
          <View style={styles.activityStatusContainer}>
            <Text style={styles.noActivityText}>{item.data?.message || "No recent activity."}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // --- Render Order Details Modal ---
  const renderOrderDetailsModal = () => {
    if (!selectedOrderForModal) return null;

    let statusStyle = styles.statusDefault;
    if (selectedOrderForModal.status === 'pending') statusStyle = styles.statusPending;
    else if (selectedOrderForModal.status === 'cancelled') statusStyle = styles.statusCancelled;
    else if (selectedOrderForModal.status === 'confirmed' || selectedOrderForModal.status === 'delivered') statusStyle = styles.statusConfirmed;


    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeOrderDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalScrollView}>
              <Text style={styles.modalTitle}>Order Details</Text>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Item:</Text>
                <Text style={styles.modalDetailValue}>{selectedOrderForModal.item_name || selectedOrderForModal.item_type || 'N/A'}</Text>
              </View>
              {selectedOrderForModal.quantity !== undefined && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Quantity:</Text>
                  <Text style={styles.modalDetailValue}>{selectedOrderForModal.quantity}</Text>
                </View>
              )}
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Total Price:</Text>
                <Text style={styles.modalDetailValue}>${selectedOrderForModal.total_price.toFixed(2)}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Status:</Text>
                <Text style={[styles.modalDetailValue, statusStyle]}>{selectedOrderForModal.status}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Ordered On:</Text>
                <Text style={styles.modalDetailValue}>{selectedOrderForModal.timestamp.toLocaleString()}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Order ID:</Text>
                <Text style={[styles.modalDetailValue, styles.orderIdText]} numberOfLines={1} ellipsizeMode="middle">{selectedOrderForModal.id}</Text>
              </View>

              {selectedOrderForModal.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => handleCancelOrder(selectedOrderForModal.id)}
                >
                  <Text style={styles.modalButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCloseButton]}
              onPress={closeOrderDetailsModal}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {loadingUser ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {userProfile?.username || 'Welcome!'}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={() => router.push('/profile')} disabled={loadingUser}>
          {loadingUser ? (
            <View style={styles.avatarPlaceholderContainer}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Image
                source={currentUser?.user_metadata?.avatar_url ? { uri: currentUser.user_metadata.avatar_url } : Icons.UserCircleOutline}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={screenSections}
        renderItem={renderScreenItem}
        keyExtractor={(item) => item.id}
        style={styles.listContainer}
        ListFooterComponent={<View style={{ height: 20 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007bff"]}
            tintColor={"#007bff"}
          />
        }
      />
      {/* Render the modal */}
      {renderOrderDetailsModal()}
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E4EBE5',
  },
  listContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    paddingBottom: 10,
    backgroundColor: '#70B96F',
    borderBottomWidth: 1,
    borderBottomColor: '#5a9a5a',
  },
  userDetails: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholderContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  welcomeContainer: {
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 25,
  },
  welcomeBox: {
    backgroundColor: '#4D854D',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: '100%',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  featuresContainer: {
    paddingHorizontal: 10,
    marginBottom: 25,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  featureBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    minHeight: 130, // Ensure enough height for content
    justifyContent: 'space-between',
  },
  featureIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 30,
    marginBottom: 5,
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    flexShrink: 1,
    marginBottom: 8,
  },
  featureLink: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '600',
    marginTop: 'auto',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 15,
    marginBottom: 12,
  },
  activityHeaderContainer: {},
  activityItemWrapper: {
    paddingHorizontal: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  activityIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: '#007bff',
  },
  activityTextContainer: {
    flex: 1,
  },
  activityDetails: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 3,
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#777',
  },
  activityStatusContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 15,
    minHeight: 100,
    justifyContent: 'center',
  },
  noActivityText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 15,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusPending: { color: '#FFA500', fontWeight: 'bold', textTransform: 'capitalize' },
  statusCancelled: { color: '#FF6347', fontWeight: 'bold', textTransform: 'capitalize' },
  statusConfirmed: { color: '#32CD32', fontWeight: 'bold', textTransform: 'capitalize' },
  statusDefault: { color: '#555', fontWeight: 'bold', textTransform: 'capitalize' },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%', // Max height for the modal
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingTop: 20, // Padding for title
    paddingBottom: 10, // Padding for close button
    paddingHorizontal: 5, // Minimal horizontal padding, content will have its own
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollView: {
    paddingHorizontal: 15, // Horizontal padding for scrollable content
    paddingBottom: 10, // Space before the fixed close button
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalDetailLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  modalDetailValue: {
    fontSize: 15,
    color: '#333',
    flexShrink: 1, // Allow text to wrap or shrink
    textAlign: 'right',
  },
  orderIdText: {
    fontSize: 13,
    color: '#777',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 10, // Space above buttons
    marginHorizontal: 15, // Horizontal margin for buttons within modal content area
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: '#FF6347', // Tomato Red for cancel
    marginBottom: 5, // Space between cancel and close if both are present
  },
  modalCloseButton: {
    backgroundColor: '#6c757d', // Grey for close
    // This button is outside ScrollView, so margin is handled by modalContainer paddingBottom
  },
});

export default HomeScreen;
