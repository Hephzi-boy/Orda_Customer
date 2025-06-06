// c:\Users\Lenovo\Desktop\Orda_Customer\app\(root)\(tabs)\_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';

// Import your custom icons constant
import Icons from '@/constants/Icons'; // Adjust path if necessary
// --- IMPORT THE HOOK ---
import { useCreateUserProfile } from '@/hooks/useCreateUserProfile'; // Adjust path if you placed the hook elsewhere

// Define colors
const TAB_BAR_BACKGROUND = '#70B96F';
const FOCUSED_ICON_BACKGROUND = '#DFEBDD';
const FOCUSED_TINT_COLOR = '#333333';
const INACTIVE_TINT_COLOR = '#FFFFFF';

// Helper component for rendering icons using Image
const TabIcon = ({ iconSource, color, name, focused }: { iconSource: ImageSourcePropType; color: string; name: string; focused: boolean }) => {
  return (
    // Apply dynamic styles based on 'focused' state
    <View style={[
      styles.tabIconContainer,
      focused ? styles.tabIconContainerFocused : null // Apply focused styles
    ]}>
      <Image
        source={iconSource}
        resizeMode="contain"
        // Apply tint color based on focus state
        tintColor={color} // Use the color passed by Tabs.Screen options
        style={styles.tabIconImage}
      />
    </View>
  );
};


const TabsLayout = () => {
  // --- CALL THE HOOK HERE ---
  // This will run the profile check logic when the Tabs layout mounts
  useCreateUserProfile();
  // --- END HOOK CALL ---

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: FOCUSED_TINT_COLOR, // Color for icon/text when focused
        tabBarInactiveTintColor: INACTIVE_TINT_COLOR, // Color for icon/text when inactive
        tabBarShowLabel: false, // Keep this false as we removed the label from TabIcon
        headerShown: false, // Hide header for tab screens if desired
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND, // Set the tab bar background color (now green)
          borderTopWidth: 0, // Remove top border if desired
          height: Platform.OS === 'ios' ? 80 : 65, // Adjusted height slightly as text is removed
          paddingBottom: Platform.OS === 'ios' ? 20 : 5, // Adjust padding
          paddingTop: 5, // Add some top padding
        },
      }}
    >
      {/* --- Tab Screens --- */}
      <Tabs.Screen
        name="index" // Matches index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.HomeOutline}
              name="Home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browseHotel" // Matches browseHotel.tsx
        options={{
          title: 'Hotels',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.browseHotel}
              name="Hotels"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
       <Tabs.Screen
        name="browseMenu" // Matches browseMenu.tsx
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.browseMenu}
              name="Menu"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      {/* Keep the original 'orders' screen, maybe hide it later if needed */}
      <Tabs.Screen
        name="orders" // Matches orders.tsx
        options={{
          title: 'Orders', // This screen is for placing an order now
          // Consider hiding this from the tab bar if it's only reached via navigation
          // href: null,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.ShoppingBagOutline} // Or a different icon if desired
              name="Orders"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      {/* --- ADDED ORDER HISTORY TAB --- */}
      <Tabs.Screen
        name="orderHistory" // Matches orderHistory.tsx
        options={{
          title: 'History', // Title for the screen
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.orderHistoryView} // Use the specific history icon
              name="History" // Name for the icon component
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      {/* --- END ADDED ORDER HISTORY TAB --- */}

      <Tabs.Screen
        name="profile" // Matches profile.tsx
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconSource={Icons.UserCircleOutline}
              name="Profile"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
};

// Add StyleSheet for the TabIcon component
const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center', // Center the icon vertically now
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'transparent',
    transform: [{ translateY: 0 }],
    minHeight: 40, // Example minimum height
  },
  tabIconContainerFocused: {
    backgroundColor: FOCUSED_ICON_BACKGROUND, // Uses the updated #DFEBDD color
    transform: [{ translateY: -8 }],
    borderRadius: 30,
    paddingVertical: 10, // Adjusted padding
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 5,
  },
  tabIconImage: {
    width: 26, // Slightly larger icon?
    height: 26, // Slightly larger icon?
  },
});

export default TabsLayout;
