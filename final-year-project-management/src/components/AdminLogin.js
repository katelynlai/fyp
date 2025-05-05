// Displays a login form
// Stores email and password input values using useState
// Sends login request to backend on form submission
// If credentials are valid, navigates to staff page
// Displays error message if login fails

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';

const AdminLogin = () => {
  // Define state variables for form inputs and error message
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory(); // For programmatic navigation
  const { login } = useAuth(); // Custom auth context for managing login state

  // Handle form submission for login
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent page refresh
    try {
      // Sign in user with Firebase auth
      await signInWithEmailAndPassword(auth, email, password);
      login(); // Update auth context
      history.push('/'); // Navigate to home page
    } catch (err) {
      // Show error message if login fails
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h1>Admin Login</h1>
      {/* Display error message if present */}
      {error && <p className="error-message">{error}</p>}
      {/* Login form */}
      <form onSubmit={handleLogin}>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)} // Update email state
            required
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // Update password state
            required
          />
        </label>
        <button type="submit">Log In</button>
      </form>

      {/* Link to registration page */}
      <p>
        Don't have an account? <a href="/sign-up">Sign Up</a>
      </p>

      {/* Inline CSS styling for the login component */}
      <style>{`
        .login-container {
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
          text-align: center;
        }

        .login-container h1 {
          margin-bottom: 20px;
        }

        .login-container form {
          display: flex;
          flex-direction: column;
        }

        .login-container label {
          margin-bottom: 10px;
          text-align: left;
        }

        .login-container input {
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }

        .login-container button {
          padding: 10px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .login-container button:hover {
          background-color: #9932CC;
        }

        .error-message {
          color: red;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;