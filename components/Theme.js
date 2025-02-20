const lightTheme = {
  colors: {
    primary: "#FFFFFF", // Clean white
    background: "#F1F3F5", // Soft modern gray
    activeColor: "#1A1A1A", // Near-black, less harsh
    inactiveColor: "#6B7280", // Cool gray
    subInactiveColor: "#D1D5DB", // Light gray
    activeIndicatorStyle: "#E5E7EB", // Subtle light gray
    textColor: "#2D3748", // Dark gray for readability
    ripple: "rgba(0, 0, 0, 0.15)", // Visible ripple
    progressColor: "#B0B7C0", // Cool gray
    button: "#4a90e2", // Modern blue
    disabled: "#9CA3AF", // Softer gray
    deleteButton: "#EF4444", // Deep red

    gradientStart: "#E0E7FF", // Soft blue-white
    gradientEnd: "#A5BFFA", // Light modern blue
    buttonGradientStart: "#60A5FA", // Vibrant sky blue, slightly lighter than button
    buttonGradientEnd: "#1D4ED8", // Deep blue, bold and modern
  },
};

const darkTheme = {
  colors: {
    primary: "#363636", // Lighter than background
    background: "#1F2527", // Rich dark tone
    activeColor: "#FFFFFF", // Pure white
    inactiveColor: "#9CA3AF", // Soft gray
    activeIndicatorStyle: "#4B5154", // Subtle gray
    textColor: "#D1D5DB", // Light gray
    ripple: "rgba(255, 255, 255, 0.15)", // White ripple
    progressColor: "#6B7280", // Cool gray
    button: "#60A5FA", // Lighter blue
    disabled: "#6B7280", // Muted gray
    deleteButton: "#F87171", // Softer red

    gradientStart: "#1E2A3C", // Deep blue-gray
    gradientEnd: "#3B4A66", // Sleek blue-gray
    buttonGradientStart: "#93C5FD", // Soft blue, lighter for contrast
    buttonGradientEnd: "#3B82F6", // Rich blue, ties to light theme button
  },
};

export { lightTheme, darkTheme };
