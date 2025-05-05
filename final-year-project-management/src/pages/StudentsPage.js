import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import '../App.css';


const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStudent, setNewStudent] = useState({
    StudentID: '',
    FirstName: '',
    LastName: '',
    Course: '',
    Notes: '',
    ModuleCode: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' }); // Notification state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState(null); // 'single' or 'all'

  // Fetch students from Firestore
  const fetchStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Fetched Students:', studentsList); // Check the fetched data
      setStudents(studentsList);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(); // Fetch students when the component mounts
  }, []);

  // Add a new student to Firestore
  const handleAddStudent = async () => {
    try {
      await addDoc(collection(db, 'students'), newStudent);
      console.log('Uploaded New Student:', newStudent);
      setStudents([...students, newStudent]);
      setNewStudent({
        StudentID: '',
        FirstName: '',
        LastName: '',
        Course: '',
        Notes: '',
        ModuleCode: ''
      });
      setNotification({ message: 'Student added successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error adding student: ' + error.message, type: 'error' });
    }
  };

  // Update an existing student in Firestore
  const handleUpdateStudent = async () => {
    try {
      const studentDoc = doc(db, 'students', editingStudent.id);
      await updateDoc(studentDoc, editingStudent);
      console.log('Updated Student:', editingStudent);
      setStudents(students.map(student => (student.id === editingStudent.id ? editingStudent : student)));
      setEditingStudent(null);
      setNotification({ message: 'Student updated successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error updating student: ' + error.message, type: 'error' });
    }
  };

        // Delete a student from Firestore
        const confirmDeleteStudent = (id) => {
          setStudentToDelete(id);
          setDeleteMode('single');
          setShowDeleteModal(true);
        };

      // Confirm deleting all students
      const confirmDeleteAllStudents = () => {
        setDeleteMode('all');
        setShowDeleteModal(true);
      };
      
      // Fix the handleDeleteConfirmed function
      const handleDeleteConfirmed = async () => {
        try {
          if (deleteMode === 'single' && studentToDelete) {
            // Delete a single student
            await deleteDoc(doc(db, 'students', studentToDelete));
            console.log('Deleted Student:', studentToDelete);
            setStudents(students.filter(student => student.id !== studentToDelete));
            setNotification({ message: 'Student deleted successfully!', type: 'success' });
          } else if (deleteMode === 'all') {
            // Delete all students
            const querySnapshot = await getDocs(collection(db, 'students'));
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            console.log('Deleted all students');
            setStudents([]);
            setNotification({ message: 'All students deleted successfully!', type: 'success' });
          } else {
            setNotification({ message: 'Invalid delete operation', type: 'error' });
          }
        } catch (error) {
          setNotification({ message: 'Error deleting student: ' + error.message, type: 'error' });
        } finally {
          setShowDeleteModal(false);
          setStudentToDelete(null);
          setDeleteMode(null);
        }
      };

  // Handle bulk import of CSV data
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file); // Store the selected file in state
  };
  
  const handleBulkImport = async () => {
    if (!selectedFile) {
      setNotification({ message: 'No file selected!', type: 'error' });
      return;
    }
  
    Papa.parse(selectedFile, {
      header: true,
      complete: async (results) => {
        const data = results.data;
        console.log('Parsed CSV Data:', data);
        try {
          for (const row of data) {
            console.log('Processing row:', row);
            const existingStudent = students.find(student => student.StudentID === row.StudentID);
            if (!existingStudent) {
              await addDoc(collection(db, 'students'), row);
              console.log('Uploaded to Firestore:', row);
            }
          }
          setNotification({ message: 'Data imported successfully!', type: 'success' });
          await fetchStudents(); // Re-fetch after import
        } catch (error) {
          console.error('Error importing data:', error);
          setNotification({ message: 'Error importing data', type: 'error' });
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setNotification({ message: 'Error parsing CSV', type: 'error' });
      }
    });
  
    setSelectedFile(null); // Clear the selected file after processing
  };

  // Delete all students from Firestore
  const handleDeleteAllStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const batch = writeBatch(db);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('Deleted all students');
      setStudents([]);
      setNotification({ message: 'All students deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('Error deleting all students:', error);
      setNotification({ message: 'Error deleting all students', type: 'error' });
      throw error; // Rethrow so the calling function can handle it
    }
  };

  const filteredStudents = students.filter(student =>
    (student['studentID']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student['First name']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student['Surname']?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student['Course code']?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="students">
      <h1>Manage Students</h1>

      {/* Notification Section */}
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
  
      {/* Bulk Import Section */}
      <div className="bulk-import">
        <h2>Import Student CSV File</h2>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        {selectedFile && (
          <div>
            <p>Selected File: {selectedFile.name}</p>
            <button onClick={handleBulkImport} className="submit-button">Submit</button>
          </div>
        )}
      </div>

      {/* Delete All Students Button */}
      <div className="delete-all-section">
        <button onClick={confirmDeleteAllStudents} className="delete-all-button">Delete All Students</button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirm Deletion</h2>
            <p>
              {deleteMode === 'single' 
                ? 'Are you sure you want to delete this student? This action cannot be undone.'
                : 'Are you sure you want to delete ALL students? This action cannot be undone.'}
            </p>
            <div className="modal-buttons">
              <button onClick={handleDeleteConfirmed} className="confirm-button">Yes, Delete</button>
              <button onClick={() => setShowDeleteModal(false)} className="cancel-button">Cancel</button>
            </div>
          </div>
        </div>
      )}  
  
  

      {/* Add New Student Section */}
      <div className="add-student-section">
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="add-student-button">
            Manually Add A New Student
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddStudent();
              setShowAddForm(false); // Hide the form after submission
            }}
            className="add-student-form"
          >
            <input
              type="text"
              placeholder="Student ID"
              value={newStudent['studentID']}
              onChange={(e) => setNewStudent({ ...newStudent, ['studentID']: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="First Name"
              value={newStudent['First name']}
              onChange={(e) => setNewStudent({ ...newStudent, ['First name']: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={newStudent['Surname']}
              onChange={(e) => setNewStudent({ ...newStudent, ['Surname']: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Course"
              value={newStudent['Course code']}
              onChange={(e) => setNewStudent({ ...newStudent, ['Course code']: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Module Code"
              value={newStudent['Module code']}
              onChange={(e) => setNewStudent({ ...newStudent, ['Module code']: e.target.value })}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Notes"
              value={newStudent.Notes}
              onChange={(e) => setNewStudent({ ...newStudent, Notes: e.target.value })}
              className="form-input"
            />
            <button type="submit" className="add-button">Submit</button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
  
      {/* Edit Student Form */}
      {editingStudent && (
        <form onSubmit={(e) => { e.preventDefault(); handleUpdateStudent(); }} className="edit-student-form">
          <input
            type="text"
            placeholder="Student ID"
            value={editingStudent['studentID']}
            onChange={(e) => setEditingStudent({ ...editingStudent, ['studentID']: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="First Name"
            value={editingStudent['First name']}
            onChange={(e) => setEditingStudent({ ...editingStudent, ['First name']: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={editingStudent['Surname']}
            onChange={(e) => setEditingStudent({ ...editingStudent, ['Surname']: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Course"
            value={editingStudent['Course code']}
            onChange={(e) => setEditingStudent({ ...editingStudent, ['Course code']: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Module Code"
            value={editingStudent['Module code']}
            onChange={(e) => setEditingStudent({ ...editingStudent, ['Module code']: e.target.value })}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Notes"
            value={editingStudent.Notes}
            onChange={(e) => setEditingStudent({ ...editingStudent, Notes: e.target.value })}
            className="form-input"
          />
          <button type="submit" className="update-button">Update Student</button>
          <button type="button" onClick={() => setEditingStudent(null)} className="cancel-button">Cancel</button>
        </form>
      )}
  
      {/* Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by ID, name, or course..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
  
      {/* Students Table */}
      <table className="students-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Course</th>
            <th>Module Code</th>
            <th>Notes</th>
            <th>Actions</th> {/* Removed Quota column */}
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>{student['studentID'] || ''}</td>
                <td>{student['First name'] || ''}</td>
                <td>{student['Surname'] || ''}</td>
                <td>{student['Course code'] || ''}</td>
                <td>{student['Module code'] || ''}</td>
                <td>{student.Notes || ''}</td>
                <td>
                  <button onClick={() => setEditingStudent(student)} className="edit-button">Edit</button>
                  <button onClick={() => confirmDeleteStudent(student.id)} className="delete-button">Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No students found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Students;