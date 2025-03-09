// import React, { useState, useEffect, useRef } from "react";
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   ActivityIndicator,
//   Dimensions,
// } from "react-native";
// import { WebView } from "react-native-webview";
// import * as Location from "expo-location";
// import { MaterialIcons } from "@expo/vector-icons";

// const { width, height } = Dimensions.get("window");

// const MapLocationPicker = ({
//   initialLocation = null,
//   onLocationSelect,
//   onCancel,
//   theme,
// }) => {
//   const [location, setLocation] = useState(initialLocation);
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState(null);
//   const webViewRef = useRef(null);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           setErrorMsg("Permission to access location was denied");
//           return;
//         }

//         if (!initialLocation) {
//           const currentLocation = await Location.getCurrentPositionAsync({});
//           setLocation({
//             latitude: currentLocation.coords.latitude,
//             longitude: currentLocation.coords.longitude,
//           });
//         }
//       } catch (error) {
//         setErrorMsg("Could not get your location");
//         console.error(error);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [initialLocation]);

//   const handleConfirm = () => {
//     if (location) {
//       onLocationSelect(location);
//     }
//   };

//   const animateToCurrentLocation = async () => {
//     try {
//       setLoading(true);
//       const currentLocation = await Location.getCurrentPositionAsync({});
//       const newLocation = {
//         latitude: currentLocation.coords.latitude,
//         longitude: currentLocation.coords.longitude,
//       };

//       setLocation(newLocation);

//       if (webViewRef.current) {
//         webViewRef.current.injectJavaScript(`
//           map.setView([${newLocation.latitude}, ${newLocation.longitude}], 15);
//           marker.setLatLng([${newLocation.latitude}, ${newLocation.longitude}]);
//           true;
//         `);
//       }
//     } catch (error) {
//       setErrorMsg("Could not get your location");
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleMessage = (event) => {
//     try {
//       const data = JSON.parse(event.nativeEvent.data);
//       if (data.type === "location") {
//         setLocation({
//           latitude: data.latitude,
//           longitude: data.longitude,
//         });
//       }
//     } catch (error) {
//       console.error("Error parsing WebView message:", error);
//     }
//   };

//   const getMapHTML = () => {
//     const initialLat = location ? location.latitude : 0;
//     const initialLng = location ? location.longitude : 0;

//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
//         <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
//         <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
//         <style>
//           body { margin: 0; padding: 0; }
//           #map { width: 100%; height: 100vh; }
//         </style>
//       </head>
//       <body>
//         <div id="map"></div>
//         <script>
//           var map = L.map('map').setView([${initialLat}, ${initialLng}], 15);

//           L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           }).addTo(map);

//           var marker = L.marker([${initialLat}, ${initialLng}], {
//             draggable: true
//           }).addTo(map);

//           map.on('click', function(e) {
//             marker.setLatLng(e.latlng);
//             sendLocationToRN(e.latlng.lat, e.latlng.lng);
//           });

//           marker.on('dragend', function(e) {
//             var position = marker.getLatLng();
//             sendLocationToRN(position.lat, position.lng);
//           });

//           function sendLocationToRN(lat, lng) {
//             window.ReactNativeWebView.postMessage(JSON.stringify({
//               type: 'location',
//               latitude: lat,
//               longitude: lng
//             }));
//           }
//         </script>
//       </body>
//       </html>
//     `;
//   };

//   return (
//     <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
//       <WebView
//         ref={webViewRef}
//         source={{ html: getMapHTML() }}
//         style={styles.map}
//         onMessage={handleMessage}
//         javaScriptEnabled={true}
//         domStorageEnabled={true}
//         startInLoadingState={true}
//       />
//       <TouchableOpacity style={styles.button} onPress={handleConfirm}>
//         <Text style={styles.buttonText}>Confirm Location</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, justifyContent: "center", alignItems: "center" },
//   map: { width: width * 0.9, height: height * 0.7 },
//   button: {
//     marginTop: 10,
//     padding: 10,
//     backgroundColor: "blue",
//     borderRadius: 5,
//   },
//   buttonText: { color: "white", fontWeight: "bold" },
// });

// export default MapLocationPicker;
