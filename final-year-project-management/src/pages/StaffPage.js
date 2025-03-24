import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStaff, setNewStaff] = useState({ 'Full Name': '', Email: '', Quota: 0, Avoid: '' });
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'staff'));
        const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaff(staffList);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const handleAddStaff = async () => {
    try {
      const docRef = await addDoc(collection(db, 'staff'), newStaff);
      setStaff([...staff, { id: docRef.id, ...newStaff }]);
      setNewStaff({ 'Full Name': '', Email: '', Quota: 0, Avoid: '' });
      alert('Staff added successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) {
      alert('No staff selected for editing');
      return;
    }

    try {
      const staffDoc = doc(db, 'staff', editingStaff.id);
      await updateDoc(staffDoc, editingStaff);
      setStaff(staff.map(staffMember => (staffMember.id === editingStaff.id ? editingStaff : staffMember)));
      setEditingStaff(null);
      alert('Staff updated successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      const staffDoc = doc(db, 'staff', id);
      await deleteDoc(staffDoc);
      setStaff(staff.filter(staffMember => staffMember.id !== id));
      alert('Staff deleted successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteAllStaff = async () => {
    if (window.confirm('Are you sure you want to delete all staff? This action cannot be undone.')) {
      try {
        const batch = writeBatch(db);
        staff.forEach(staffMember => {
          const staffDoc = doc(db, 'staff', staffMember.id);
          batch.delete(staffDoc);
        });
        await batch.commit();
        setStaff([]);
        alert('All staff deleted successfully!');
      } catch (error) {
        console.error('Error deleting all staff:', error);
        alert('Error deleting all staff');
      }
    }
  };

  const handleBulkImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const data = results.data;
          try {
            for (const row of data) {
              const existingStaff = staff.find(staffMember => staffMember.Email === row.Email);
              if (!existingStaff) {
                await addDoc(collection(db, 'staff'), row);
              }
            }
            alert('Staff data imported successfully!');
          } catch (error) {
            console.error('Error importing staff data:', error);
            alert('Error importing staff data');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV');
        }
      });
    }
  };

  const handleBulkImportQuota = async (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const data = results.data;
          try {
            for (const row of data) {
              const existingStaff = staff.find(staffMember => staffMember['Full Name'] === row['Full Name']);
              if (existingStaff) {
                const updatedStaff = { ...existingStaff, Quota: parseInt(row.Quota) };
                await updateDoc(doc(db, 'staff', existingStaff.id), updatedStaff); // Update the quota
                setStaff(staff.map(staffMember => (staffMember.id === existingStaff.id ? updatedStaff : staffMember)));
              }
            }
            alert('Quota data imported successfully!');
          } catch (error) {
            console.error('Error importing quota data:', error);
            alert('Error importing quota data');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV');
        }
      });
    }
  };

  const filteredStaff = staff.filter(staffMember =>
    (staffMember['Full Name'] && staffMember['Full Name'].toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staffMember.Email && staffMember.Email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staffMember.Quota && staffMember.Quota.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
    (staffMember.Avoid && staffMember.Avoid.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="staff">
      <h1>Manage Staff</h1>

      {/* Add New Staff */}
      <div className="add-staff">
        <h2>Add New Staff</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={newStaff['Full Name']}
          onChange={(e) => setNewStaff({ ...newStaff, 'Full Name': e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newStaff.Email}
          onChange={(e) => setNewStaff({ ...newStaff, Email: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quota"
          value={newStaff.Quota}
          onChange={(e) => setNewStaff({ ...newStaff, Quota: parseInt(e.target.value) })}
        />
        <input
          type="text"
          placeholder="Avoid"
          value={newStaff.Avoid}
          onChange={(e) => setNewStaff({ ...newStaff, Avoid: e.target.value })}
        />
        <button onClick={handleAddStaff}>Add Staff</button>
      </div>

      {/* Edit Staff Form */}
      {editingStaff && (
        <div className="edit-staff">
          <h2>Edit Staff</h2>
          <input
            type="text"
            placeholder="Full Name"
            value={editingStaff['Full Name']}
            onChange={(e) => setEditingStaff({ ...editingStaff, 'Full Name': e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            value={editingStaff.Email}
            onChange={(e) => setEditingStaff({ ...editingStaff, Email: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quota"
            value={editingStaff.Quota}
            onChange={(e) => setEditingStaff({ ...editingStaff, Quota: parseInt(e.target.value) })}
          />
          <input
            type="text"
            placeholder="Avoid"
            value={editingStaff.Avoid}
            onChange={(e) => setEditingStaff({ ...editingStaff, Avoid: e.target.value })}
          />
          <button onClick={handleUpdateStaff}>Update Staff</button>
          <button onClick={() => setEditingStaff(null)}>Cancel</button>
        </div>
      )}

      {/* Bulk Import Staff */}
      <div className="bulk-import">
        <h2>Bulk Import Staff</h2>
        <input type="file" accept=".csv" onChange={handleBulkImport} />
      </div>

      {/* Bulk Import Quota */}
      <div className="bulk-import">
        <h2>Bulk Import Quota</h2>
        <input type="file" accept=".csv" onChange={handleBulkImportQuota} />
      </div>

      {/* Delete All Staff Button */}
      <div className="delete-all-staff">
        <button onClick={handleDeleteAllStaff}>Delete All Staff</button>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name, email, quota, or avoid..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Staff Table */}
      <table className="staff-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Quota</th>
            <th>Avoid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaff.map((staffMember) => (
            <tr key={staffMember.id}>
              <td>{staffMember['Full Name']}</td>
              <td>{staffMember.Email}</td>
              <td>{staffMember.Quota}</td>
              <td>{staffMember.Avoid}</td>
              <td>
                <button onClick={() => setEditingStaff(staffMember)}>Edit</button>
                <button onClick={() => handleDeleteStaff(staffMember.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Styles */}
      <style jsx>{`
        .staff {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .add-staff, .edit-staff, .bulk-import, .search-section, .delete-all-staff {
          margin-bottom: 20px;
        }
        .add-staff input, .edit-staff input, .bulk-import input, .search-input {
          margin: 5px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .add-staff button, .edit-staff button, .bulk-import button, .delete-all-staff button {
          padding: 10px 20px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .add-staff button:hover, .edit-staff button:hover, .bulk-import button:hover, .delete-all-staff button:hover {
          background-color: #500d50;
        }
        .staff-table {
          width: 100%;
          border-collapse: collapse;
        }
        .staff-table th, .staff-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        .staff-table th {
          background-color: #621362;
          color: white;
        }
        .staff-table button {
          margin-right: 5px;
          padding: 5px 10px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .staff-table button:hover {
          background-color: #500d50;
        }
      `}</style>
    </div>
  );
};

export default Staff;