import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';

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
      alert('Student added successfully!');
    } catch (error) {
      setError(error.message);
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
      alert('Student updated successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  // Delete a student from Firestore
  const handleDeleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      console.log('Deleted Student:', id);
      setStudents(students.filter(student => student.id !== id));
      alert('Student deleted successfully!');
    } catch (error) {
      setError(error.message);
    }
  };

  // Handle bulk import of CSV data
  const handleBulkImport = async (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
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
            alert('Data imported successfully!');
            await fetchStudents(); // Re-fetch after import
          } catch (error) {
            console.error('Error importing data:', error);
            alert('Error importing data');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV');
        }
      });
    }
  };

  // Delete all students from Firestore
  const handleDeleteAllStudents = async () => {
    if (window.confirm('Are you sure you want to delete all students? This action cannot be undone.')) {
      try {
        const querySnapshot = await getDocs(collection(db, 'students'));
        const batch = writeBatch(db); // Corrected to use writeBatch
        querySnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('Deleted all students');
        setStudents([]);
        alert('All students deleted successfully!');
      } catch (error) {
        console.error('Error deleting all students:', error);
        alert('Error deleting all students');
      }
    }
  };

  const filteredStudents = students.filter(student =>
    student['studentID'].toLowerCase().includes(searchTerm.toLowerCase()) ||
    student['First name'].toLowerCase().includes(searchTerm.toLowerCase()) ||
    student['Surname'].toLowerCase().includes(searchTerm.toLowerCase()) ||
    student['Course code'].toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Students:', students);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="students">
      <h1>Manage Students</h1>
  
      {/* Bulk Import Section */}
      <div className="import-section">
        <h2>Bulk Import</h2>
        <input type="file" accept=".csv" onChange={handleBulkImport} className="file-input" />
      </div>

  
      {/* Add New Student Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleAddStudent(); }} className="add-student-form">
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
        <button type="submit" className="add-button">Add Student</button>
      </form>
  
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

      {/* Delete All Students Button */}
        <div className="delete-all-section">
        <button onClick={handleDeleteAllStudents} className="delete-all-button">Delete All Students</button>
      </div>
  
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
            <th>Actions</th>
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
                  <button onClick={() => handleDeleteStudent(student.id)} className="delete-button">Delete</button>
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
  
      {/* Styles */}
      <style>{`
        .students {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
  
        .import-section, .delete-all-section, .search-section, .add-student-form, .edit-student-form {
          margin-bottom: 20px;
        }
  
        .file-input, .search-input, .form-input {
          padding: 10px;
          margin-right: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
  
        .add-button, .update-button, .cancel-button, .edit-button, .delete-button, .delete-all-button {
          padding: 10px 20px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
  
        .add-button:hover, .update-button:hover, .edit-button:hover, .delete-button:hover, .delete-all-button:hover {
          background-color: #500d50;
        }
  
        .cancel-button {
          background-color: #ccc;
          color: black;
        }
  
        .cancel-button:hover {
          background-color: #999;
        }
  
        .students-table {
          width: 100%;
          border-collapse: collapse;
        }
  
        .students-table th, .students-table td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
  
        .students-table th {
          background-color: #500d50;
        }
      `}</style>
    </div>
  );
};

export default Students;