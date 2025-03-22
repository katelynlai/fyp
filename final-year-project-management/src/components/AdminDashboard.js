import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { db } from '../firebase';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';

const AdminDashboard = () => {
  const history = useHistory();
  const [showFileInput, setShowFileInput] = useState(false);

  const handleNavigation = (path) => {
    history.push(path);
  };


  const handleAllocation = () => {
    history.push('/allocation');
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
          background-color: #621362; /* Change button color to purple */
          color: white;
          border: none;
          border-radius: 4px;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: #500d50; /* Darker purple on hover */
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;