// AuthContext.js - Authentication context provider for the application
// Handles user authentication state, login/logout functionality, and protected routes

import React, { createContext, useState, useContext, useEffect } from 'react'; // React hooks and context API
import { Route, Redirect } from 'react-router-dom'; // Routing components for protected routes

// Create a new context for authentication data
const AuthContext = createContext();

// AuthProvider component - wraps the application to provide authentication state
export const AuthProvider = ({ children }) => {
  // State to track whether user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Loading state to prevent showing protected content during auth check
  const [loading, setLoading] = useState(true);

  // Check for existing authentication in localStorage on component mount
  useEffect(() => {
    // Retrieve authentication status from browser storage
    const storedAuthState = localStorage.getItem('isAuthenticated');
    if (storedAuthState === 'true') {
      // If previously authenticated, restore that state
      setIsAuthenticated(true);
    }
    // Mark loading as complete after checking storage
    setLoading(false);
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to handle user login
  const login = () => {
    // Update authentication state to true
    setIsAuthenticated(true);
    // Persist authentication state in localStorage for page refreshes
    localStorage.setItem('isAuthenticated', 'true');
  };

  // Function to handle user logout
  const logout = () => {
    // Update authentication state to false
    setIsAuthenticated(false);
    // Remove authentication data from localStorage
    localStorage.removeItem('isAuthenticated');
  };

  // Provide auth state and functions to all child components
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easily accessing auth context in any component
export const useAuth = () => {
  // Use the context and throw an error if used outside of AuthProvider
  return useContext(AuthContext);
};

// PrivateRoute component - wraps protected routes to enforce authentication
export const PrivateRoute = ({ component: Component, ...rest }) => {
  // Get authentication status and loading state from context
  const { isAuthenticated, loading } = useAuth();

  // Show loading indicator while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  // Return a Route that conditionally renders the protected component
  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          // If authenticated, render the requested component with props
          <Component {...props} />
        ) : (
          // If not authenticated, redirect to the login page
          <Redirect to="/admin-login" />
        )
      }
    />
  );
};