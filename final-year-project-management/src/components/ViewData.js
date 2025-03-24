import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const ViewData = () => {
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStudents, setShowStudents] = useState(true);
  const [showStaff, setShowStaff] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const staffSnapshot = await getDocs(collection(db, 'staff'));

        const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setStudents(studentsList);
        setStaff(staffList);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Create a mapping of staff IDs to their full names
  const staffIdToName = staff.reduce((acc, staffMember) => {
    acc[staffMember.id] = staffMember['Full Name'];
    return acc;
  }, {});

  // Filter students and staff based on the search query
  const filteredStudents = students.filter(student =>
    (student['studentID'] && student['studentID'].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student['First name'] && student['First name'].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student['Surname'] && student['Surname'].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student['Course code'] && student['Course code'].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (staffIdToName[student['Supervisor']] && staffIdToName[student['Supervisor']].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (staffIdToName[student['Moderator']] && staffIdToName[student['Moderator']].toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStaff = staff.filter(staffMember =>
    (staffMember['Full Name'] && staffMember['Full Name'].toLowerCase().includes(searchQuery.toLowerCase())) ||
    (staffMember.Department && staffMember.Department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="view-data">
      <h1>View Data</h1>

      <input
        type="text"
        placeholder="Search..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <h2>
        Students
        <button onClick={() => setShowStudents(!showStudents)} className="toggle-button">
          {showStudents ? 'Minimise' : 'Maximise'}
        </button>
      </h2>
      {showStudents && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Course</th>
              <th>Supervisor</th>
              <th>Moderator</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td>{student['studentID']}</td>
                <td>{student['First name']}</td>
                <td>{student['Surname']}</td>
                <td>{student['Course code']}</td>
                <td>{staffIdToName[student['Supervisor']] || 'Unassigned'}</td>
                <td>{staffIdToName[student['Moderator']] || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>
        Staff
        <button onClick={() => setShowStaff(!showStaff)} className="toggle-button">
          {showStaff ? 'Minimise' : 'Maximise'}
        </button>
      </h2>
      {showStaff && (
        <table className="data-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((staffMember) => (
              <tr key={staffMember.id}>
                <td>{staffMember['Full Name'] ? staffMember['Full Name'].split(' ')[0] : ''}</td>
                <td>{staffMember['Full Name'] ? staffMember['Full Name'].split(' ')[1] : ''}</td>
                <td>{staffMember.Department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .view-data {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .search-input {
          padding: 10px;
          margin-bottom: 20px;
          width: 100%;
          font-size: 16px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }

        .data-table th, .data-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }

        .data-table th {
          background-color: #621362;
          color: white;
        }

        .toggle-button {
          margin-left: 10px;
          padding: 5px 10px;
          font-size: 14px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .toggle-button:hover {
          background-color: #9932CC;
        }
      `}</style>
    </div>
  );
};

export default ViewData;