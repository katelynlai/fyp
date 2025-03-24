import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase'; 
import Papa from 'papaparse';

const Allocation = () => {
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffQuotas, setStaffQuotas] = useState({});
  const [staffInterests, setStaffInterests] = useState({});
  
  // Track which allocation method is being used
  const [allocationMethod, setAllocationMethod] = useState('manual'); // 'manual', 'selfReport', 'studentChoice', 'default'
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students - using exact field names from the database
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsList = studentsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          fullName: `${doc.data()['Surname']}, ${doc.data()['First name']}`
        }));
        setStudents(studentsList);
        
        // Fetch staff - using exact field names from the database
        const staffSnapshot = await getDocs(collection(db, 'staff'));
        const staffList = staffSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          fullName: `${doc.data()['Full Name']}`,
          currentAllocations: 0 // Track current allocation count
        }));
        
        // Fetch staff quotas
        const quotasSnapshot = await getDocs(collection(db, 'staffQuotas'));
        const quotasObj = {};
        quotasSnapshot.docs.forEach(doc => {
          quotasObj[doc.data().iD] = doc.data().Quota;
        });
        setStaffQuotas(quotasObj);
        
        // Fetch staff interests
        const interestsSnapshot = await getDocs(collection(db, 'staffInterests'));
        const interestsObj = {};
        interestsSnapshot.docs.forEach(doc => {
          interestsObj[doc.data().StaffID] = doc.data().Interests || [];
        });
        setStaffInterests(interestsObj);
        
        // Count current allocations
        studentsList.forEach(student => {
          if (student.Supervisor) {
            const supervisorIndex = staffList.findIndex(s => s.id === student.Supervisor);
            if (supervisorIndex !== -1) {
              staffList[supervisorIndex].currentAllocations++;
            }
          }
          
          if (student.Moderator) {
            const moderatorIndex = staffList.findIndex(s => s.id === student.Moderator);
            if (moderatorIndex !== -1) {
              staffList[moderatorIndex].currentAllocations++;
            }
          }
        });
        
        setStaff(staffList);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  // Function to check if staff member has capacity
  const hasCapacity = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    const quota = staffQuotas[staffId] || 10; // Default quota of 10 if not specified
    return staffMember && staffMember.currentAllocations < quota;
  };

  // Manual allocation function
  const allocate = async (studentId, staffId, role) => {
    try {
      const studentDoc = doc(db, 'students', studentId);
      const updateData = role === 'supervisor' ? { Supervisor: staffId } : { Moderator: staffId };
      
      // Update Firestore
      await updateDoc(studentDoc, updateData);
      
      // Update local state
      setStudents(students.map(student => 
        student.id === studentId ? { ...student, ...updateData } : student
      ));
      
      // Update staff allocations count
      setStaff(staff.map(staffMember => 
        staffMember.id === staffId 
          ? { ...staffMember, currentAllocations: staffMember.currentAllocations + 1 } 
          : staffMember
      ));
      
      return true;
    } catch (error) {
      console.error(`Error in manual allocation:`, error);
      return false;
    }
  };

  // Self-report allocation from CSV
  const handleSelfReportAllocation = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setAllocationMethod('selfReport');
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data;
        let successCount = 0;
        let failCount = 0;
        
        try {
          for (const row of data) {
            // Check if this is a valid row with agreement
            if (row["I agree to supervise / moderate this project"] !== "Yes") {
              console.log(`Skipping row: ${JSON.stringify(row)}`);
              continue;
            }
            
            const role = row["Supervisor or Moderator?"].toLowerCase();
            if (role !== "supervisor" && role !== "moderator") {
              console.warn("Unknown role:", role);
              failCount++;
              continue;
            }
            
            // Ensure the student ID field is defined
            const studentIDField = "Student's ID (without 'UP')";
            if (!row[studentIDField]) {
              console.warn("Student ID is missing in row:", row);
              failCount++;
              continue;
            }
            
            // Find the student by ID (removing UP if present)
            const studentID = row[studentIDField].replace(/^UP/i, '');
            const student = students.find(s => 
              s.studentID === studentID || 
              s.studentID === `UP${studentID}`
            );
            
            if (!student) {
              console.warn(`Student not found: ${studentID}`);
              failCount++;
              continue;
            }
            
            // Find the staff member by name
            const staffName = row["Supervisor's / Moderator's name"];
            const staffMember = staff.find(s => 
              s['Full Name'] === staffName || 
              s.fullName === staffName
            );
            
            if (!staffMember) {
              console.warn(`Staff member not found: ${staffName}`);
              failCount++;
              continue;
            }
            
            // Create the update data
            const updateData = role === 'supervisor' 
              ? { Supervisor: staffMember.id } 
              : { Moderator: staffMember.id };
            
            // Update Firestore directly
            try {
              const studentDoc = doc(db, 'students', student.id);
              await updateDoc(studentDoc, updateData);
              
              // Update local state
              setStudents(students.map(s => 
                s.id === student.id ? { ...s, ...updateData } : s
              ));
              
              // Update staff allocations count
              setStaff(staff.map(s => 
                s.id === staffMember.id 
                  ? { ...s, currentAllocations: s.currentAllocations + 1 } 
                  : s
              ));
              
              successCount++;
            } catch (updateError) {
              console.error(`Error updating student ${studentID}:`, updateError);
              failCount++;
            }
          }
          
          alert(`Self-report allocation complete: ${successCount} successful, ${failCount} failed.`);
        } catch (error) {
          console.error("Error in self-report allocation:", error);
          alert(`Error in self-report allocation: ${error.message}`);
        } finally {
          setAllocationMethod('manual');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file');
        setAllocationMethod('manual');
      }
    });
  };
      const handleUploadInterests = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
      
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            const data = results.data;
            const interestsUpdates = {};
      
            data.forEach(row => {
              const fullName = row["Full Name"];
              const interests = row["Interests"] ? row["Interests"].split(',').map(interest => interest.trim()) : [];
              const projectIdeas = row["Project Ideas"] ? row["Project Ideas"].split(',').map(idea => idea.trim()) : [];
      
              // Find the staff member by full name
              const staffMember = staff.find(s => s.fullName === fullName);
              if (staffMember) {
                interestsUpdates[staffMember.id] = { interests, projectIdeas };
              }
            });
      
            try {
              const batch = writeBatch(db);
              Object.keys(interestsUpdates).forEach(staffID => {
                const staffDoc = doc(db, 'staffInterests', staffID);
                batch.set(staffDoc, { StaffID: staffID, Interests: interestsUpdates[staffID].interests, ProjectIdeas: interestsUpdates[staffID].projectIdeas }, { merge: true });
              });
              await batch.commit();
              alert('Supervisors interests and project ideas uploaded successfully.');
            } catch (error) {
              console.error('Error uploading interests:', error);
              alert('Error uploading interests.');
            }
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            alert('Error parsing CSV file');
          }
        });
      };

        // Student choice allocation from CSV
        const handleStudentChoiceAllocation = async (event) => {
          const file = event.target.files[0];
          if (!file) return;
          
          setAllocationMethod('studentChoice');
          
          Papa.parse(file, {
            header: true,
            complete: async (results) => {
              const data = results.data;
              // Sort by submission timestamp if available
              if (data[0] && data[0]["Timestamp"]) {
                data.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
              }
              
              let successCount = 0;
              let failCount = 0;
              
              try {
                for (const row of data) {
                  // Clean student ID (including 'UP')
                  const studentID = row["Student ID number (INCLUDING 'UP')"];
                  const student = students.find(s => s.studentID === studentID);
                  
                  if (!student) {
                    console.warn(`Student not found: ${studentID}`);
                    failCount++;
                    continue;
                  }
                  
                  // Skip if already allocated
                  if (student.Supervisor) {
                    console.log(`Student ${studentID} already has supervisor ${student.Supervisor}, skipping`);
                    continue;
                  }
                  
                  // Try each choice in order
                  const choices = [
                    row["First Supervisor Choice"],
                    row["Second Supervisor Choice"],
                    row["Third Supervisor Choice"]
                  ];
                  
                  let allocated = false;
                  
                  for (const choice of choices) {
                    if (!choice) continue;
                    
                    const staffMember = staff.find(s => 
                      s['Full Name'] === choice || 
                      s.fullName === choice
                    );
                    
                    if (!staffMember) {
                      console.warn(`Staff member not found: ${choice}`);
                      continue;
                    }
                    
                    if (hasCapacity(staffMember.id)) {
                      const success = await allocate(student.id, staffMember.id, 'supervisor');
                      if (success) {
                        allocated = true;
                        successCount++;
                        break;
                      }
                    } else {
                      console.log(`Staff ${choice} has reached capacity`);
                    }
                  }
                  
                  // If none of the choices worked, try to match by topic
                  if (!allocated && row["Project Topic."]) {
                    const topic = row["Project Topic."].toLowerCase();
                    
                    // Find staff with matching interests and capacity
                    const matchingStaff = staff.filter(staffMember => {
                      const interests = staffInterests[staffMember.id] || [];
                      return interests.some(interest => 
                        topic.includes(interest.toLowerCase()) || 
                        interest.toLowerCase().includes(topic)
                      ) && hasCapacity(staffMember.id);
                    });
                    
                    if (matchingStaff.length > 0) {
                      // Sort by current allocations (ascending)
                      matchingStaff.sort((a, b) => a.currentAllocations - b.currentAllocations);
                      
                      const success = await allocate(student.id, matchingStaff[0].id, 'supervisor');
                      if (success) {
                        allocated = true;
                        successCount++;
                      }
                    }
                  }
                  
                  if (!allocated) {
                    failCount++;
                  }
                }
                
                alert(`Student choice allocation complete: ${successCount} successful, ${failCount} failed.`);
              } catch (error) {
                console.error("Error in student choice allocation:", error);
                alert(`Error in student choice allocation: ${error.message}`);
              } finally {
                setAllocationMethod('manual');
              }
            },
            error: (error) => {
              console.error('Error parsing CSV:', error);
              alert('Error parsing CSV file');
              setAllocationMethod('manual');
            }
          });
        };

      // Default allocation for remaining students
// Enhanced default allocation for remaining students with strict quota enforcement
const handleDefaultAllocation = async () => {
  setAllocationMethod('default');
  let successCount = 0;
  let failCount = 0;

  try {
    // Create separate lists for students without supervisors and without moderators
    const studentsWithoutSupervisors = students.filter(student => !student.Supervisor);
    const studentsWithoutModerators = students.filter(student => !student.Moderator);

    if (studentsWithoutSupervisors.length === 0 && studentsWithoutModerators.length === 0) {
      alert("All students already have supervisors and moderators!");
      setAllocationMethod('manual');
      return;
    }

    // Group by course and prioritize by course year (assuming course code contains year info)
    const groupStudentsByCourse = (studentList) => {
      const grouped = {};
      studentList.forEach(student => {
        const courseCode = student['Course code'];
        if (!grouped[courseCode]) {
          grouped[courseCode] = [];
        }
        grouped[courseCode].push(student);
      });
      
      // Sort course codes - typically higher-level courses (4xxx) should be prioritized
      return Object.keys(grouped)
        .sort((a, b) => {
          // Extract course level if possible (assuming format like "CS4xxx")
          const levelA = parseInt(a.match(/\d/)?.[0] || '0');
          const levelB = parseInt(b.match(/\d/)?.[0] || '0');
          return levelB - levelA; // Higher level first
        })
        .reduce((obj, key) => {
          obj[key] = grouped[key];
          return obj;
        }, {});
    };

    const supervisorsByCourse = groupStudentsByCourse(studentsWithoutSupervisors);
    const moderatorsByCourse = groupStudentsByCourse(studentsWithoutModerators);

    // Create a local copy of staff with their current allocation counts and quotas
    // This helps us track allocations as we go without refetching from database
    const staffWithQuotas = staff.map(staffMember => {
      return {
        ...staffMember,
        interests: staffInterests[staffMember.id] || [],
        quota: staffQuotas[staffMember.id] || 10, // Default quota of 10 if not specified
        currentAllocations: staffMember.currentAllocations, // Start with current allocation count
      };
    });

    // Helper function to check if staff member has capacity based on our local tracking
    const hasRemainingCapacity = (staffMember) => {
      return staffMember.currentAllocations < staffMember.quota;
    };

    // Helper function to update our local allocation counts after successful allocation
    const updateLocalAllocationCount = (staffId) => {
      const staffIndex = staffWithQuotas.findIndex(s => s.id === staffId);
      if (staffIndex !== -1) {
        staffWithQuotas[staffIndex].currentAllocations++;
      }
    };

    // First pass: Allocate supervisors (prioritize interest matching)
    for (const course in supervisorsByCourse) {
      const studentsInCourse = supervisorsByCourse[course];
      
      for (const student of studentsInCourse) {
        // Try to find staff with interests matching the course subject
        const departmentMatch = course.match(/^[A-Z]+/)?.[0] || '';
        
        // Find suitable supervisors with interest in this field and capacity
        const suitableSupervisors = staffWithQuotas
          .filter(staffMember => 
            hasRemainingCapacity(staffMember) && 
            (staffMember.interests.some(interest => 
              interest.toLowerCase().includes(departmentMatch.toLowerCase())
            ))
          )
          .sort((a, b) => {
            // Sort by remaining capacity percentage (staff with most remaining % first)
            const remainingPercentA = (a.quota - a.currentAllocations) / a.quota;
            const remainingPercentB = (b.quota - b.currentAllocations) / b.quota;
            return remainingPercentB - remainingPercentA;
          });
          
        // If no suitable supervisors with matching interests, fall back to any available supervisor
        const availableSupervisors = suitableSupervisors.length > 0 ? 
          suitableSupervisors : 
          staffWithQuotas
            .filter(staffMember => hasRemainingCapacity(staffMember))
            .sort((a, b) => {
              // Sort by remaining capacity percentage
              const remainingPercentA = (a.quota - a.currentAllocations) / a.quota;
              const remainingPercentB = (b.quota - b.currentAllocations) / b.quota;
              return remainingPercentB - remainingPercentA;
            });

        if (availableSupervisors.length > 0) {
          const supervisor = availableSupervisors[0];
          
          // Double-check against quota before allocation
          if (hasRemainingCapacity(supervisor)) {
            const success = await allocate(student.id, supervisor.id, 'supervisor');
            
            if (success) {
              // Update our local tracking
              updateLocalAllocationCount(supervisor.id);
              successCount++;
            } else {
              failCount++;
            }
          } else {
            console.warn(`Staff ${supervisor.fullName} has reached quota limit. Skipping allocation.`);
            failCount++;
          }
        } else {
          console.warn(`No available supervisor with capacity for student: ${student.studentID} in course: ${course}`);
          failCount++;
        }
      }
    }

    // Second pass: Allocate moderators 
    // (ensure moderator is different from supervisor if possible)
    for (const course in moderatorsByCourse) {
      const studentsInCourse = moderatorsByCourse[course];
      
      for (const student of studentsInCourse) {
        // Find suitable moderators (excluding student's supervisor if possible)
        const availableModerators = staffWithQuotas
          .filter(staffMember => 
            hasRemainingCapacity(staffMember) && 
            staffMember.id !== student.Supervisor // Avoid same person as supervisor
          )
          .sort((a, b) => {
            // Sort by remaining capacity percentage
            const remainingPercentA = (a.quota - a.currentAllocations) / a.quota;
            const remainingPercentB = (b.quota - b.currentAllocations) / b.quota;
            return remainingPercentB - remainingPercentA;
          });

        // If no other staff available, allow same person as supervisor if they have capacity
        const finalModerators = availableModerators.length > 0 ? 
          availableModerators : 
          staffWithQuotas
            .filter(staffMember => hasRemainingCapacity(staffMember))
            .sort((a, b) => {
              // Sort by remaining capacity percentage
              const remainingPercentA = (a.quota - a.currentAllocations) / a.quota;
              const remainingPercentB = (b.quota - b.currentAllocations) / b.quota;
              return remainingPercentB - remainingPercentA;
            });

        if (finalModerators.length > 0) {
          const moderator = finalModerators[0];
          
          // Double-check against quota before allocation
          if (hasRemainingCapacity(moderator)) {
            const success = await allocate(student.id, moderator.id, 'moderator');
            
            if (success) {
              // Update our local tracking
              updateLocalAllocationCount(moderator.id);
              successCount++;
            } else {
              failCount++;
            }
          } else {
            console.warn(`Staff ${moderator.fullName} has reached quota limit. Skipping allocation.`);
            failCount++;
          }
        } else {
          console.warn(`No available moderator with capacity for student: ${student.studentID} in course: ${course}`);
          failCount++;
        }
      }
    }

    // Final report
    const unallocatedSupervisors = students.filter(student => !student.Supervisor).length;
    const unallocatedModerators = students.filter(student => !student.Moderator).length;
    
    alert(
      `Default allocation complete: ${successCount} successful, ${failCount} failed.\n` +
      `Remaining unallocated: ${unallocatedSupervisors} supervisors, ${unallocatedModerators} moderators.`
    );
    
  } catch (error) {
    console.error("Error in default allocation:", error);
    alert(`Error in default allocation: ${error.message}`);
  } finally {
    setAllocationMethod('manual');
  }
};
  // Export allocation spreadsheet
  const exportAllocations = () => {
    const csvData = students.map(student => ({
      StudentID: student.studentID,
      StudentName: `${student.Surname}, ${student['First name']}`,
      SupervisorName: student.Supervisor ? staff.find(s => s.id === student.Supervisor)?.['Full Name'] || 'Unassigned' : 'Unassigned',
      SupervisorEmail: student.Supervisor ? staff.find(s => s.id === student.Supervisor)?.Email || 'Unassigned' : 'Unassigned',
      ModeratorName: student.Moderator ? staff.find(s => s.id === student.Moderator)?.['Full Name'] || 'Unassigned' : 'Unassigned',
      ModeratorEmail: student.Moderator ? staff.find(s => s.id === student.Moderator)?.Email || 'Unassigned' : 'Unassigned',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'allocations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Export supervisor allocation spreadsheet
const exportSupervisorAllocations = () => {
  const csvData = students.map(student => ({
    StudentID: student.studentID,
    StudentName: `${student.Surname}, ${student['First name']}`,
    SupervisorName: student.Supervisor ? staff.find(s => s.id === student.Supervisor)?.['Full Name'] || 'Unassigned' : 'Unassigned',
    SupervisorEmail: student.Supervisor ? staff.find(s => s.id === student.Supervisor)?.Email || 'Unassigned' : 'Unassigned'
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'supervisor_allocations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export moderator allocation spreadsheet
const exportModeratorAllocations = () => {
  const csvData = students.map(student => ({
    StudentID: student.studentID,
    ModeratorName: student.Moderator ? staff.find(s => s.id === student.Moderator)?.['Full Name'] || 'Unassigned' : 'Unassigned'
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'moderator_allocations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  return (
    <div className="allocation">
      <h1>Student Allocation Management</h1>
      
      <div className="allocation-methods">
        <h2>Allocation Methods</h2>

        <div className="upload-interests">
            <h2>Upload Supervisors Interests and Project Ideas</h2>
            <p>Import the CSV file containing supervisors' interests and project ideas.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleUploadInterests} 
              disabled={allocationMethod !== 'manual'}
            />
          </div>

        <div className="method-container">
          <div className="method">
            <h3>1. Staff Self-Report Allocation</h3>
            <p>Import the Supervision/Moderation Agreement spreadsheet to allocate based on staff self-reporting.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleSelfReportAllocation} 
              disabled={allocationMethod !== 'manual'}
            />
          </div>
          
          <div className="method">
            <h3>2. Student Choice Allocation</h3>
            <p>Import the Student Supervisor Choice form to allocate based on student preferences.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleStudentChoiceAllocation} 
              disabled={allocationMethod !== 'manual'}
            />
          </div>

          
          <div className="method">
            <h3>3. Default Allocation</h3>
            <p>Allocate remaining students automatically based on course and staff capacity.</p>
            <button 
              onClick={handleDefaultAllocation} 
              disabled={allocationMethod !== 'manual'}
            >
              Run Default Allocation
            </button>
          </div>
        </div>
      </div>
      
      <div className="export-section">
        <h2>Export Allocations</h2>
        <div className="export-buttons">
          <button onClick={exportSupervisorAllocations}>Export Supervisor Allocations</button>
          <button onClick={exportModeratorAllocations}>Export Moderator Allocations</button>
          <button onClick={exportAllocations}>Export Complete Allocations</button>
        </div>
      </div>
      
      <div className="manual-allocation">
        <h2>Manual Allocation</h2>
        <p>Current allocation status: {students.filter(s => s.Supervisor).length}/{students.length} students assigned to supervisors</p>
        <p>Current allocation status: {students.filter(s => s.Moderator).length}/{students.length} students assigned to moderators</p>
        
        <div className="table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Course</th>
                <th>Supervisor</th>
                <th>Moderator</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.studentID}</td>
                  <td>{student.Surname}, {student['First name']}</td>
                  <td>{student['Course code']}</td>
                  <td>
                      {student.Supervisor 
                        ? staff.find(s => s.id === student.Supervisor)?.['Full Name'] || 'Unknown'
                        : 'Unassigned'
                      }
                    </td>
                    <td>
                      {student.Moderator
                        ? staff.find(s => s.id === student.Moderator)?.['Full Name'] || 'Unknown'
                        : 'Unassigned'
                      }
                    </td>
                    <td>
                      <select 
                        onChange={(e) => allocate(student.id, e.target.value, 'supervisor')}
                        disabled={allocationMethod !== 'manual'}
                        value={student.Supervisor || ''}
                      >
                        <option value="">Select Supervisor</option>
                        {staff
                          .filter(staffMember => hasCapacity(staffMember.id) || staffMember.id === student.Supervisor)
                          .map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember['Full Name']} 
                              ({staffMember.currentAllocations}/{staffQuotas[staffMember.id] || 10})
                            </option>
                          ))
                        }
                      </select>
                      <select 
                        onChange={(e) => allocate(student.id, e.target.value, 'moderator')}
                        disabled={allocationMethod !== 'manual'}
                        value={student.Moderator || ''}
                      >
                        <option value="">Select Moderator</option>
                        {staff
                          .filter(staffMember => hasCapacity(staffMember.id) || staffMember.id === student.Moderator)
                          .map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember['Full Name']}
                              ({staffMember.currentAllocations}/{staffQuotas[staffMember.id] || 10})
                            </option>
                          ))
                        }
                      </select>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx>{`
        .allocation {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        h1, h2, h3 {
          color: #621362;
          margin: 15px 0;
        }

        .method-container {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 20px;
          justify-content: center;
          width: 100%;
        }

        .method {
          flex: 1;
          min-width: 300px;
          max-width: 100%;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
          box-sizing: border-box;
          overflow: hidden;
          margin: 5px;
        }

        .upload-interests {
          margin-bottom: 20px;
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        .export-section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        .export-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .export-buttons button {
          flex: 1;
          min-width: 200px;
        }

        .table-container {
          overflow-x: auto;
          margin-top: 20px;
          box-sizing: border-box;
          width: 100%;
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
        }

        .students-table th, .students-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }

        .students-table th {
          background-color: #621362;
          color: white;
          padding: 12px 10px;
        }

        .students-table tr:nth-child(even) {
          background-color: #f2f2f2;
        }

        .students-table select {
          margin-right: 5px;
          padding: 5px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 100%;
          margin-bottom: 5px;
        }

        /* Updated button and file input styling with more horizontal padding */
        button, input[type="file"] {
          padding: 10px 15px;
          background-color: #621362;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 10px;
        }

        /* This targets the purple file input areas */
        input[type="file"], 
        .choose-file-container,
        .file-upload-container {
          display: block;
          width: calc(100% - 40px); /* Reduce width to create horizontal space */
          margin: 10px 20px; /* 20px horizontal margins */
        }

        /* Create more space around the purple background for file inputs */
        .method > div,
        .upload-interests > div,
        .file-selection-area,
        .purple-background-area {
          padding: 15px;
          border-radius: 4px;
          margin: 10px 20px; /* 20px horizontal margins */
          width: calc(100% - 40px); /* Width accounting for margins */
        }

        button:hover {
          background-color: #500d50;
        }

        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        /* Additional responsive adjustments */
        @media (max-width: 768px) {
          .method {
            min-width: 100%;
          }
        }
    `}</style>
    </div>
  );
}

export default Allocation;