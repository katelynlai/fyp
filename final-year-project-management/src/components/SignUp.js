// React component for admin sign-up.
// Uses Firebase to create a new user account.
// Redirects to login on success, shows error on failure.

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const SignUp = () => {
  // State variables for user input and error message
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const history = useHistory();

  // Handle form submission for sign-up
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // Create new user with Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);
      history.push('/admin-login'); // Redirect to login after successful sign-up
    } catch (err) {
      setError(err.message);// Display error if sign-up fails
    }
  };

  return (
    <div className="sign-up-container">
      <h1>Sign Up</h1>
      {/* Display error message if present */}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSignUp}>
        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Sign Up</button>
      </form>
      {/* Link to login page if user already has an account */}
      <p>
        Already have an account? <a href="/admin-login">Log In</a>
      </p>

      {/* Inline styles for layout and UI */}
      <style>{`
        .sign-up-container {
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
          text-align: center;
        }

        .sign-up-container h1 {
          margin-bottom: 20px;
        }

        .sign-up-container form {
          display: flex;
          flex-direction: column;
        }

        .sign-up-container label {
          margin-bottom: 10px;
          text-align: left;
        }

        .sign-up-container input {
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }

        .sign-up-container button {
          padding: 10px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .sign-up-container button:hover {
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

export default SignUp;