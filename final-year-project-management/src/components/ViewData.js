import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const ViewData = () => {
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="view-data">
      <h1>View Data</h1>

      <h2>Students</h2>
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
          {students.map((student) => (
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

      <h2>Staff</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((staffMember) => (
            <tr key={staffMember.id}>
              <td>{staffMember['Full Name'].split(' ')[0]}</td>
              <td>{staffMember['Full Name'].split(' ')[1]}</td>
              <td>{staffMember.Department}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .view-data {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
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
      `}</style>
    </div>
  );
};

export default ViewData;