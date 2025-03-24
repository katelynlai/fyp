import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      login();
      history.push('/');
    } catch (error) {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login">
        <h1>Admin Login</h1>
        <form onSubmit={handleLogin}>
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
          <button type="submit">Login</button>
        </form>
      </div>

      <style>{`
        .admin-login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f0f0f0;
        }

        .admin-login {
          padding: 20px;
          max-width: 400px;
          width: 100%;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        form {
          display: flex;
          flex-direction: column;
        }

        label {
          margin-bottom: 10px;
        }

        input {
          padding: 10px;
          margin-top: 5px;
          font-size: 16px;
        }

        button {
          padding: 10px;
          font-size: 16px;
          cursor: pointer;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 4px;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: #500d50;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;