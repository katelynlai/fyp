import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AdminDashboard = () => {
  const history = useHistory();
  const [showFileInput, setShowFileInput] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        history.push('/admin-login');
      }
    });

    return () => unsubscribe();
  }, [history]);

  const handleNavigation = (path) => {
    history.push(path);
  };

  const handleAllocation = () => {
    history.push('/allocation');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('admin');
      history.push('/admin-login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-options">
        <button onClick={() => handleNavigation('/students')}>
          Manage Students
        </button>
        <button onClick={() => handleNavigation('/staff')}>
          Manage Staff
        </button>
        <button onClick={() => handleNavigation('/view-data')}>
          View Data
        </button>
        <button onClick={handleAllocation}>
          Allocate Supervisors/Moderators
        </button>
        <button onClick={handleLogout}>
          Logout
        </button>
      </div>

      <style jsx>{`
        .admin-dashboard {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .dashboard-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        button {
          padding: 15px;
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

export default AdminDashboard;