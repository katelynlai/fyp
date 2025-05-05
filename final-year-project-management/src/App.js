// App.js - The main entry point for the Final Year Project Management Application
// This file sets up the application's routing structure and authentication flow

import React, { Suspense, lazy } from 'react'; // React with support for code-splitting
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom'; // Routing components
import './App.css'; // Global application styles
import { AuthProvider, PrivateRoute, useAuth } from './AuthContext'; // Authentication context and utilities

// Code-splitting with lazy loading for better performance
// These components are loaded only when needed, reducing initial bundle size
const StudentsPage = lazy(() => import('./pages/StudentsPage')); // Page for managing students
const StaffPage = lazy(() => import('./pages/StaffPage')); // Page for managing staff members
const ViewData = lazy(() => import('./components/ViewData')); // Component for viewing aggregated data
const Allocation = lazy(() => import('./pages/Allocation')); // Page for allocating supervisors and moderators
const AdminLogin = lazy(() => import('./components/AdminLogin')); // Admin login screen
const SignUp = lazy(() => import('./components/SignUp')); // Account registration screen

// Header component with navigation menu - only shown to authenticated users
const Header = () => {
  const { logout } = useAuth(); // Access the logout function from auth context

  // Handle user logout action
  const handleLogout = () => {
    logout();
  };

  return (
    <header className="App-header">
      <nav>
        <ul>
          {/* Navigation links to main application sections */}
          <li><a href="/students">Students</a></li>
          <li><a href="/staff">Staff</a></li>
          <li><a href="/allocation">Allocate Supervisor/Moderator</a></li>
          <li><a href="/view-data">View Data</a></li>
          <li><button onClick={handleLogout} className="logout-button">Logout</button></li>
        </ul>
      </nav>
    </header>
  );
};

// Main application content with routing configuration
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth(); // Get authentication state

  // Show loading indicator while auth state is being determined
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {/* Only show header navigation when user is authenticated */}
      {isAuthenticated && <Header />}
      <main>
        {/* Suspense provides a fallback while lazy-loaded components are being loaded */}
        <Suspense fallback={<div>Loading...</div>}>
          <Switch>
            {/* Root path - either show students page or redirect to login */}
            <Route path="/" exact>
              {isAuthenticated ? <StudentsPage /> : <Redirect to="/admin-login" />}
            </Route>
            {/* Public routes - available to unauthenticated users */}
            <Route path="/admin-login" component={AdminLogin} />
            <Route path="/sign-up" component={SignUp} />
            
            {/* Protected routes - only accessible when authenticated */}
            <PrivateRoute path="/students" component={StudentsPage} />
            <PrivateRoute path="/staff" component={StaffPage} />
            <PrivateRoute path="/view-data" component={ViewData} />
            <PrivateRoute path="/allocation" component={Allocation} />
          </Switch>
        </Suspense>
      </main>
    </div>
  );
};

// Root Application component
function App() {
  return (
    <AuthProvider>
      {/* Router provides navigation context to the entire application */}
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App; // Export the App component for use in index.js