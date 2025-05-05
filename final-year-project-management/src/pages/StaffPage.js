// StaffPage.js - Admin interface for managing staff members
// Key functionality includes:
// 1. Adding, editing, and deleting staff members
// 2. Bulk importing staff data from CSV files
// 3. Maintaining staff quotas for project allocations
// 4. Managing staff preferences (Avoid list)

import React, { useState, useEffect } from 'react'; // React hooks for state and lifecycle management
import { db } from '../firebase'; // Firebase database connection
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'; // Firebase operations
import Papa from 'papaparse'; // Library for CSV parsing/generation
import '../App.css'; // Global styles

const Staff = () => {
  // State variables to manage component data and UI
  const [staff, setStaff] = useState([]); // Main staff data array
  const [loading, setLoading] = useState(true); // Loading state indicator
  const [error, setError] = useState(null); // Error tracking
  const [newStaff, setNewStaff] = useState({ 'Full Name': '', Email: '', Quota: 0, Avoid: [] }); // New staff form data
  const [editingStaff, setEditingStaff] = useState(null); // Currently editing staff member
  const [searchTerm, setSearchTerm] = useState(''); // For filtering staff table
  const [notification, setNotification] = useState({ message: '', type: '' }); // User notifications
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Delete confirmation modal toggle
  const [staffToDelete, setStaffToDelete] = useState(null); // ID of staff member to delete
  const [showAddForm, setShowAddForm] = useState(false); // Toggle for add staff form
  const [staffCsvFile, setStaffCsvFile] = useState(null); // For staff bulk import
  const [quotaCsvFile, setQuotaCsvFile] = useState(null); // For quota bulk import

  // Fetch staff data when component mounts
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        // Retrieve staff collection from Firestore
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
  }, []); // Empty dependency array means this runs once on mount

  // Add a new staff member to the database
  const handleAddStaff = async () => {
    try {
      // Process avoid list from string to array if needed
      const avoidsArray = newStaff.Avoid && typeof newStaff.Avoid === 'string' 
        ? newStaff.Avoid.split(',').map(name => name.trim()) 
        : newStaff.Avoid;
      
      const staffData = { ...newStaff, Avoid: avoidsArray };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'staff'), staffData);
      // Update local state
      setStaff([...staff, { id: docRef.id, ...staffData }]);
      // Reset form
      setNewStaff({ 'Full Name': '', Email: '', Quota: 0, Avoid: [] });
      // Show success notification
      setNotification({ message: 'Staff added successfully!', type: 'success' });
    } catch (error) {
      // Show error notification
      setNotification({ message: 'Error adding staff: ' + error.message, type: 'error' });
    }
  };

  // Update an existing staff member's information
  const handleUpdateStaff = async () => {
    if (!editingStaff) {
      setNotification({ message: 'No staff selected for editing', type: 'error' });
      return;
    }

    try {
      // Process avoid list from string to array if needed
      const avoidsArray = editingStaff.Avoid && typeof editingStaff.Avoid === 'string' 
        ? editingStaff.Avoid.split(',').map(name => name.trim()) 
        : editingStaff.Avoid;
      
      const updatedStaff = { ...editingStaff, Avoid: avoidsArray };
      
      // Update in Firestore
      const staffDoc = doc(db, 'staff', editingStaff.id);
      await updateDoc(staffDoc, updatedStaff);
      // Update local state
      setStaff(staff.map(staffMember => (staffMember.id === editingStaff.id ? updatedStaff : staffMember)));
      // Exit edit mode
      setEditingStaff(null);
      // Show success notification
      setNotification({ message: 'Staff updated successfully!', type: 'success' });
    } catch (error) {
      // Show error notification
      setNotification({ message: 'Error updating staff: ' + error.message, type: 'error' });
    }
  };

  // Prepare for deletion by setting up modal confirmation
  const confirmDeleteStaff = (id) => {
    setStaffToDelete(id);
    setShowDeleteModal(true);
  };
  
  // Delete a staff member after confirmation
  const handleDeleteConfirmed = async () => {
    try {
      // Delete from Firestore
      const staffDoc = doc(db, 'staff', staffToDelete);
      await deleteDoc(staffDoc);
      // Update local state
      setStaff(staff.filter(staffMember => staffMember.id !== staffToDelete));
      // Show success notification
      setNotification({ message: 'Staff deleted successfully!', type: 'success' });
    } catch (error) {
      // Show error notification
      setNotification({ message: 'Error deleting staff: ' + error.message, type: 'error' });
    } finally {
      // Clean up UI state
      setShowDeleteModal(false);
      setStaffToDelete(null);
    }
  };

  // Delete all staff members after confirmation
  const handleDeleteAllStaff = async () => {
    try {
      // Use batch operation for better performance
      const batch = writeBatch(db);
      staff.forEach(staffMember => {
        const staffDoc = doc(db, 'staff', staffMember.id);
        batch.delete(staffDoc);
      });
      await batch.commit();
      // Update local state
      setStaff([]);
      // Show success notification
      setNotification({ message: 'All staff deleted successfully!', type: 'success' });
    } catch (error) {
      // Show error notification
      setNotification({ message: 'Error deleting all staff: ' + error.message, type: 'error' });
    } finally {
      // Hide modal
      setShowDeleteModal(false);
    }
  };

  // Handle selecting staff CSV file for bulk import
  const handleStaffFileChange = (event) => {
    const file = event.target.files[0];
    setStaffCsvFile(file);
  };
  
  // Handle selecting quota CSV file for bulk import
  const handleQuotaFileChange = (event) => {
    const file = event.target.files[0];
    setQuotaCsvFile(file);
  };

  // Process bulk staff import from CSV file
  const handleBulkImport = async (file) => {
    if (!file) {
      setNotification({ message: 'No file selected!', type: 'error' });
      return;
    }
    
    // Parse CSV file with PapaParse library
    Papa.parse(file, {
      header: true, // First row contains headers
      complete: async (results) => {
        const data = results.data;
        try {
          // Track new staff to update state after all imports
          const newStaffMembers = [];
          
          for (const row of data) {
            // Skip empty rows
            if (!row['Full Name'] || !row.Email) continue;
            
            // Check if staff member already exists (by email)
            const existingStaff = staff.find(staffMember => staffMember.Email === row.Email);
            if (!existingStaff) {
              // Parse the Avoid field into an array
              const avoidsArray = row.Avoid ? row.Avoid.split(',').map(name => name.trim()) : [];
              const newStaffData = { 
                'Full Name': row['Full Name'],
                Email: row.Email,
                Quota: parseInt(row.Quota || '0'),
                Avoid: avoidsArray
              };
  
              console.log('Adding staff to database:', newStaffData);
  
              // Add to Firestore
              const docRef = await addDoc(collection(db, 'staff'), newStaffData);
              newStaffMembers.push({ id: docRef.id, ...newStaffData });
            }
          }
          
          // Update state with all new staff members
          if (newStaffMembers.length > 0) {
            setStaff([...staff, ...newStaffMembers]);
          }
          
          // Show success notification
          setNotification({ 
            message: `Staff data imported successfully! Added ${newStaffMembers.length} new staff members.`, 
            type: 'success' 
          });
          setStaffCsvFile(null); // Clear file input
        } catch (error) {
          // Show error notification
          setNotification({ message: 'Error importing staff data: ' + error.message, type: 'error' });
          console.error('Error adding staff:', error);
        }
      },
      error: (error) => {
        // Handle CSV parsing errors
        setNotification({ message: 'Error parsing CSV: ' + error.message, type: 'error' });
        console.error('Error parsing CSV:', error);
      }
    });
  };
  
  // Process bulk quota import from CSV file
  const handleBulkImportQuota = async (file) => {
    if (!file) {
      setNotification({ message: 'No file selected!', type: 'error' });
      return;
    }
  
    // Parse CSV file with PapaParse library
    Papa.parse(file, {
      header: true, // First row contains headers
      complete: async (results) => {
        const data = results.data;
        try {
          let updatedCount = 0;
          const updatedStaffList = [...staff];
          
          for (const row of data) {
            // Skip invalid rows
            if (!row['Full Name'] || !row.Quota) continue;
            
            // Find matching staff member by name
            const staffIndex = updatedStaffList.findIndex(
              staffMember => staffMember['Full Name'] === row['Full Name']
            );
            
            if (staffIndex !== -1) {
              // Create updated staff object with new quota
              const updatedStaff = { 
                ...updatedStaffList[staffIndex], 
                Quota: parseInt(row.Quota) 
              };
              
              // Update in Firestore
              await updateDoc(doc(db, 'staff', updatedStaffList[staffIndex].id), updatedStaff);
              // Update local state
              updatedStaffList[staffIndex] = updatedStaff;
              updatedCount++;
            }
          }
          
          // Update staff state with all changes
          setStaff(updatedStaffList);
          // Show success notification
          setNotification({ 
            message: `Quota data imported successfully! Updated ${updatedCount} staff members.`, 
            type: 'success' 
          });
          setQuotaCsvFile(null); // Clear file input
        } catch (error) {
          // Show error notification
          setNotification({ message: 'Error importing quota data: ' + error.message, type: 'error' });
        }
      },
      error: (error) => {
        // Handle CSV parsing errors
        setNotification({ message: 'Error parsing CSV: ' + error.message, type: 'error' });
      }
    });
  };
  
  // Filter staff list based on search term
  const filteredStaff = staff.filter(staffMember => {
    const searchLower = searchTerm.toLowerCase();
    
    // Normalize data for searching
    const fullName = staffMember['Full Name'] ? staffMember['Full Name'].toLowerCase() : '';
    const email = staffMember.Email ? staffMember.Email.toLowerCase() : '';
    const quota = staffMember.Quota ? staffMember.Quota.toString() : '';
    
    // Handle Avoid field which could be array or string
    const avoidText = Array.isArray(staffMember.Avoid) 
      ? staffMember.Avoid.join(', ').toLowerCase() 
      : typeof staffMember.Avoid === 'string' 
        ? staffMember.Avoid.toLowerCase() 
        : '';
    
    // Return true if any field contains the search term
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           quota.includes(searchLower) || 
           avoidText.includes(searchLower);
  });

  // Show loading indicator while data is being fetched
  if (loading) {
    return <div>Loading...</div>;
  }

  // Show error message if data fetch failed
  if (error) {
    return <div>Error: {error}</div>;
  }

  // Render the staff management interface
  return (
    <div className="staff">
      <h1>Manage Staff</h1>

      {/* Notification Banner - Shows messages to the user */}
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Bulk Import Staff Section - Import staff data from CSV */}
      <div className="bulk-import">
        <h2>Import Staff CSV File</h2>
        <input type="file" accept=".csv" onChange={handleStaffFileChange} />
        {staffCsvFile && (
          <div>
            <p>Selected File: {staffCsvFile.name}</p>
            <button onClick={() => handleBulkImport(staffCsvFile)} className="submit-button">Submit</button>
          </div>
        )}
      </div>

      {/* Bulk Import Quota Section - Update staff quota values from CSV */}
      <div className="bulk-import">
        <h2>Import Quota CSV File</h2>
        <input type="file" accept=".csv" onChange={handleQuotaFileChange} />
        {quotaCsvFile && (
          <div>
            <p>Selected File: {quotaCsvFile.name}</p>
            <button onClick={() => handleBulkImportQuota(quotaCsvFile)} className="submit-button">Submit</button>
          </div>
        )}
      </div>

      {/* Add New Staff Section - Form for adding individual staff members */}
      <div className="add-staff-section">
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="add-staff-button">
            Manually Add A New Staff Member
          </button>
        ) : (
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
              onChange={(e) => setNewStaff({ ...newStaff, Quota: parseInt(e.target.value) || 0 })}
            />
            <input
              type="text"
              placeholder="Avoid (comma separated names)"
              value={Array.isArray(newStaff.Avoid) ? newStaff.Avoid.join(', ') : newStaff.Avoid}
              onChange={(e) => setNewStaff({ ...newStaff, Avoid: e.target.value })}
            />
            <button onClick={handleAddStaff}>Submit</button>
            <button onClick={() => setShowAddForm(false)} className="cancel-button">Cancel</button>
          </div>
        )}
      </div>

      {/* Edit Staff Form - Appears when editing a staff member */}
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
            onChange={(e) => setEditingStaff({ ...editingStaff, Quota: parseInt(e.target.value) || 0 })}
          />
          <input
            type="text"
            placeholder="Avoid (comma separated names)"
            value={Array.isArray(editingStaff.Avoid) ? editingStaff.Avoid.join(', ') : editingStaff.Avoid}
            onChange={(e) => setEditingStaff({ ...editingStaff, Avoid: e.target.value })}
          />
          <button onClick={handleUpdateStaff}>Update Staff</button>
          <button onClick={() => setEditingStaff(null)}>Cancel</button>
        </div>
      )}

      {/* Delete All Staff Button - Dangerous operation with confirmation */}
      <div className="delete-all-staff">
        <button onClick={() => setShowDeleteModal(true)}>Delete All Staff</button>
      </div>

      {/* Delete Confirmation Modal - Prevents accidental deletion */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete {staffToDelete ? 'this staff member' : 'all staff members'}? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button onClick={staffToDelete ? handleDeleteConfirmed : handleDeleteAllStaff} className="confirm-button">
                Yes, Delete
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="cancel-button">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search Section - Filter staff list by various criteria */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name, email, quota, or avoid..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Staff Table - Main view of all staff data */}
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
              <td>
                {Array.isArray(staffMember.Avoid) 
                  ? staffMember.Avoid.join(', ') 
                  : typeof staffMember.Avoid === 'string' 
                    ? staffMember.Avoid 
                    : ''}
              </td>
              <td>
                <button onClick={() => setEditingStaff(staffMember)}>Edit</button>
                <button onClick={() => confirmDeleteStaff(staffMember.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Staff;