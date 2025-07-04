// Allocation component retrieves and displays a list of students and their projects
// Allows admin to assign supervisors and moderators to each student
// Dropdowns are populated with available staff members
// Sends allocation changes to backend via POST request
// Prevents assigning the same person as both supervisor and moderator
// Updates the UI based on allocation status and fetches staff data on load

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase'; 
import Papa from 'papaparse';
import '../App.css';

const Allocation = () => {
  // State variables to manage data and UI
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffQuotas, setStaffQuotas] = useState({});
  const [staffInterests, setStaffInterests] = useState({});
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [staffQuotaTableVisible, setStaffQuotaTableVisible] = useState(true);
  const [manualAllocationTableVisible, setManualAllocationTableVisible] = useState(true);
  const [interestsFile, setInterestsFile] = useState(null);
  const [selfReportFile, setSelfReportFile] = useState(null);
  const [studentChoiceFile, setStudentChoiceFile] = useState(null);

  // Track which allocation method is being used
  const [allocationMethod, setAllocationMethod] = useState('manual'); // 'manual', 'selfReport', 'studentChoice', 'default'
  
  // Fetch student, staff, quota and interest data on mount
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
          supervisorAllocations: 0,  // Track supervisor allocations separately
          moderatorAllocations: 0,   // Track moderator allocations separately
          currentAllocations: 0      // Keep this for backward compatibility
        }));
        
        // Fetch staff quotas
        const quotasSnapshot = await getDocs(collection(db, 'staffQuotas'));
        const quotasObj = {};
        quotasSnapshot.docs.forEach(doc => {
          quotasObj[doc.data().StaffID] = doc.data().Quota;
        });
        setStaffQuotas(quotasObj);
        
        // Fetch staff interests
        const interestsSnapshot = await getDocs(collection(db, 'staffInterests'));
        const interestsObj = {};
        interestsSnapshot.docs.forEach(doc => {
          interestsObj[doc.data().StaffID] = doc.data().Interests || [];
        });
        setStaffInterests(interestsObj);
        
        // Count current allocations - update to track separate supervisor and moderator counts
        studentsList.forEach(student => {
          // Track supervisor allocation
          if (student.Supervisor) {
            const supervisorIndex = staffList.findIndex(s => s.id === student.Supervisor);
            if (supervisorIndex !== -1) {
              staffList[supervisorIndex].supervisorAllocations++;
              staffList[supervisorIndex].currentAllocations++; // Keep this for backwards compatibility
            }
          }
          
          // Track moderator allocations
          if (student.Moderator) {
            const moderatorIndex = staffList.findIndex(s => s.id === student.Moderator);
            if (moderatorIndex !== -1) {
              staffList[moderatorIndex].moderatorAllocations++;
              staffList[moderatorIndex].currentAllocations++; // Keep this for backwards compatibility
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
  }, []); //Empty dependency array to run only once on mount

  // Function to check if staff member has capacity
  const hasCapacity = (staffId, role = 'supervisor') => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return false;
    
    const quota = staffQuotas[staffId] || 5; // Default quota of 5 if not specified
    
    //Check capacity based on the requested role
    if (role === 'supervisor') {
      return staffMember.supervisorAllocations < quota;
    } else {
      return staffMember.moderatorAllocations < quota;
    }
  };

  // Manual allocation function
  const allocate = async (studentId, staffId, role) => {
    try {
      const studentDoc = doc(db, 'students', studentId);
      // Create update object based on role
      const updateData = role === 'supervisor' ? { Supervisor: staffId } : { Moderator: staffId };
      
      // Update Firestore
      await updateDoc(studentDoc, updateData);
      
      // Re-fetch or manually update local state to reflect the change
      setStudents(students.map(student => 
        student.id === studentId ? { ...student, ...updateData } : student
      ));
      
      // Update staff allocations count for the specific role
      setStaff(staff.map(staffMember => 
        staffMember.id === staffId 
          ? { 
              ...staffMember, 
              [role === 'supervisor' ? 'supervisorAllocations' : 'moderatorAllocations']: 
                staffMember[role === 'supervisor' ? 'supervisorAllocations' : 'moderatorAllocations'] + 1 
            } 
          : staffMember
      ));
      
      return true; // Allocation successful
    } catch (error) {
      console.error(`Error in manual allocation:`, error);
      return false; // Allocation failed
    }
  };

  // Self-report allocation from CSV
  const handleSelfReportAllocation = async (file) => {
    if (!file) return;
    
    setAllocationMethod('selfReport');
    
    Papa.parse(file, {
      header: true, // First row contains headers
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
            
            // Determine if this is a supervisor or moderator assignment
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
              continue;a
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
          
          // Show completion notification
          setNotification({ 
            message: `Self-report allocation complete! ${successCount} successful, ${failCount} failed.`, 
            type: 'success' 
          });        
          setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  
        } catch (error) {
          console.error("Error in self-report allocation:", error);
          alert(`Error in self-report allocation: ${error.message}`);
        } finally {
          setAllocationMethod('manual'); // Reset allocation method to manual mode
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file');
        setAllocationMethod('manual');
      }
    });
  };

  // Upload and process staff interests and project ideas CSV
  const handleUploadInterests = async (file) => {
    if (!file) return;
  
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data;
        const interestsUpdates = {};
  
        // Process each row in the CSV
        data.forEach(row => {
          const fullName = row["Full Name"];
          // Parse comma-separated interests and project ideas
          const interests = row["Interests"] ? row["Interests"].split(',').map(interest => interest.trim()) : [];
          const projectIdeas = row["Project Ideas"] ? row["Project Ideas"].split(',').map(idea => idea.trim()) : [];
  
          // Find the staff member by full name
          const staffMember = staff.find(s => s.fullName === fullName);
          if (staffMember) {
            interestsUpdates[staffMember.id] = { interests, projectIdeas };
          }
        });
  
        try {
          // Use batch update for efficiency
          const batch = writeBatch(db);
          Object.keys(interestsUpdates).forEach(staffID => {
            const staffDoc = doc(db, 'staffInterests', staffID);
            batch.set(staffDoc, { StaffID: staffID, Interests: interestsUpdates[staffID].interests, ProjectIdeas: interestsUpdates[staffID].projectIdeas }, 
              { merge: true }); // Use merge to avoid overwriting existing data
          });
          await batch.commit();
          // Show success notification
          setNotification({ 
            message: `Supervisors interests and project ideas uploaded successfully!`, 
            type: 'success' 
          });            
          setTimeout(() => setNotification({ message: '', type: '' }), 5000);
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
        const handleStudentChoiceAllocation = async (file) => {
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
                  
                  // Try each choice in sequence until one works
                  for (const choice of choices) {
                    if (!choice) continue; // Skip empty choices
                    
                    // Find staff member by name
                    const staffMember = staff.find(s => 
                      s['Full Name'] === choice || 
                      s.fullName === choice
                    );
                    
                    if (!staffMember) {
                      console.warn(`Staff member not found: ${choice}`);
                      continue;
                    }
                    
                    // Check if staff member has capacity and allocate if possible
                    if (hasCapacity(staffMember.id)) {
                      const success = await allocate(student.id, staffMember.id, 'supervisor');
                      if (success) {
                        allocated = true;
                        successCount++;
                        break; // Stop trying further choices if successful
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
                
                // Show completion notification
                setNotification({ 
                  message: `Student choice allocation complete! ${successCount} successful, ${failCount} failed.`, 
                  type: 'success' 
                  });
                        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
                      } catch (error) {
                        console.error("Error in student choice allocation:", error);
                        alert(`Error in student choice allocation: ${error.message}`);
                      } finally {
                        setAllocationMethod('manual'); // Reset to manual mode
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
  const handleDefaultAllocation = async () => {
  setAllocationMethod('default');
  let successCount = 0;
  let failCount = 0;

  try {
    // Create separate lists for students without supervisors and without moderators
    const studentsWithoutSupervisors = students.filter(student => !student.Supervisor);
    const studentsWithoutModerators = students.filter(student => !student.Moderator);

    // Early exit if all students already have supervisors and moderators
    if (studentsWithoutSupervisors.length === 0 && studentsWithoutModerators.length === 0) {
      setNotification({ 
        message: "All students already have supervisors and moderators!", 
        type: 'info' 
      });
      setNotification({ 
        message: "All students already have supervisors and moderators!", 
        type: 'info' 
      });
      setTimeout(() => setNotification({ message: '', type: '' }), 5000);
      setAllocationMethod('manual');
      return;
    }

      // Helper function to group students by course code
      const groupStudentsByCourse = (studentList) => {
        const grouped = {};
        // Replace studentsList with studentList (the parameter)
        studentList.forEach(student => {
          const course = student['Course code'] || 'Unknown';
          if (!grouped[course]) {
            grouped[course] = [];
          }
          grouped[course].push(student);
        });
        
        // Sort course codes - typically higher-level courses (4xxx) should be prioritized
        return Object.keys(grouped)
          .sort((a, b) => {
            // Extract course level if possible
            const levelA = parseInt(a.match(/\d/)?.[0] || '0');
            const levelB = parseInt(b.match(/\d/)?.[0] || '0');
            return levelB - levelA; // Higher level first
          })
          .reduce((obj, key) => {
            obj[key] = grouped[key];
            return obj;
          }, {});
      };

      // Group students by course code
    const supervisorsByCourse = groupStudentsByCourse(studentsWithoutSupervisors);
    const moderatorsByCourse = groupStudentsByCourse(studentsWithoutModerators);

    // Create a local copy of staff with their current allocation counts and quotas
    // This helps us track allocations as we go without refetching from database
    const staffWithQuotas = staff.map(staffMember => {
      return {
        ...staffMember,
        interests: staffInterests[staffMember.id] || [],
        quota: staffQuotas[staffMember.id] || 5, // Default quota of 5 if not specified
        currentAllocations: staffMember.currentAllocations,
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

    // Final report - count remaining unallocated students
    const unallocatedSupervisors = students.filter(student => !student.Supervisor).length;
    const unallocatedModerators = students.filter(student => !student.Moderator).length;
    
    // Show completion notification with statistics
    setNotification({ 
      message: `Default allocation complete! ${successCount} successful, ${failCount} failed. Remaining unallocated: ${unallocatedSupervisors} supervisors, ${unallocatedModerators} moderators.`, 
      type: 'success' 
    });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    
  } catch (error) {
    console.error("Error in default allocation:", error);
    alert(`Error in default allocation: ${error.message}`);
  } finally {
    setAllocationMethod('manual'); // Reset allocation method to manual mode
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

    // Generate and download the CSV File
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'allocations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Error state
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

  // Generate and download the CSV file
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

  // Generate and download the CSV file
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'moderator_allocations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // Component UI rendering 
  return (
    <div className="allocation">
      <h1>Student Allocation Management</h1>
      
      {/* Notification message */}
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Allocation methods selection*/}
      <div className="allocation-methods">
        <h2>Allocation Methods</h2>

        {/* Upload staff interests section*/}
        <div className="upload-interests">
          <h2>Upload Supervisors Interests and Project Ideas</h2>
          <p>Import the CSV file containing supervisors' interests and project ideas.</p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => setInterestsFile(e.target.files[0])}
            disabled={allocationMethod !== 'manual'}
          />
          {interestsFile && (
            <div>
              <p>Selected File: {interestsFile.name}</p>
              <button 
                onClick={() => handleUploadInterests(interestsFile)} 
                className="submit-button"
                disabled={allocationMethod !== 'manual'}
              >
                Submit
              </button>
            </div>
          )}
        </div>

        {/* Different allocation method options */}
        <div className="method-container">
        {/* Method 1 :  Staff Self-Report Allocation*/}
        <div className="method">
            <h3>1. Staff Self-Report Allocation</h3>
            <p>Import the Supervision/Moderation Agreement spreadsheet to allocate based on staff self-reporting.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setSelfReportFile(e.target.files[0])}
              disabled={allocationMethod !== 'manual'}
            />
            {selfReportFile && (
              <div>
                <p>Selected File: {selfReportFile.name}</p>
                <button 
                  onClick={() => handleSelfReportAllocation(selfReportFile)} 
                  className="submit-button"
                  disabled={allocationMethod !== 'manual'}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
          
          {/* Method 2: Student Choice Allocation */}
          <div className="method">
            <h3>2. Student Choice Allocation</h3>
            <p>Import the Student Supervisor Choice form to allocate based on student preferences.</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setStudentChoiceFile(e.target.files[0])}
              disabled={allocationMethod !== 'manual'}
            />
            {studentChoiceFile && (
              <div>
                <p>Selected File: {studentChoiceFile.name}</p>
                <button 
                  onClick={() => handleStudentChoiceAllocation(studentChoiceFile)} 
                  className="submit-button"
                  disabled={allocationMethod !== 'manual'}
                >
                  Submit
                </button>
              </div>
            )}
          </div>

          {/* Method 3: Default Allocation */}
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
      
      {/* Export section - download allocation data */}
      <div className="export-section">
        <h2>Export Allocations</h2>
        <div className="export-buttons">
          <button onClick={exportSupervisorAllocations}>Export Supervisor Allocations</button>
          <button onClick={exportModeratorAllocations}>Export Moderator Allocations</button>
          <button onClick={exportAllocations}>Export Complete Allocations</button>
        </div>
      </div>
      
      {/* Manual allocation section - table for manually assigning staff */}
      <div className="manual-allocation">
        <h2>Manual Allocation</h2>
        <p>Current allocation status: {students.filter(s => s.Supervisor).length}/{students.length} students assigned to supervisors</p>
        <p>Current allocation status: {students.filter(s => s.Moderator).length}/{students.length} students assigned to moderators</p>
        
        {/* Student allocation table */}
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
              {/* Map through students and render a row for each one */}
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.studentID}</td>
                  <td>{student.Surname}, {student['First name']}</td>
                  <td>{student['Course code']}</td>
                  {/* Display supervisor name or 'Unassigned' */}
                  <td>
                      {student.Supervisor 
                        ? staff.find(s => s.id === student.Supervisor)?.['Full Name'] || 'Unknown'
                        : 'Unassigned'
                      }
                    </td>
                    {/* Display moderator name or 'Unassigned' */}
                    <td>
                      {student.Moderator
                        ? staff.find(s => s.id === student.Moderator)?.['Full Name'] || 'Unknown'
                        : 'Unassigned'
                      }
                    </td>
                    {/* Dropdown selectors for supervisor and moderator */}
                    <td>
                      <select 
                        onChange={(e) => allocate(student.id, e.target.value, 'supervisor')}
                        disabled={allocationMethod !== 'manual'}
                        value={student.Supervisor || ''}
                      >
                        <option value="">Select Supervisor</option>
                        {staff
                        .filter(staffMember => hasCapacity(staffMember.id, 'supervisor') || staffMember.id === student.Supervisor)
                        .map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {staffMember['Full Name']} 
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
                          .filter(staffMember => hasCapacity(staffMember.id, 'moderator') || staffMember.id === student.Moderator)
                          .map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember['Full Name']}
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

      {/* Staff quota section - shows remaining capacity for each staff member */}
      <div className="staff-quota-section">
          <div className="section-header">
            <h2>Staff Remaining Quota</h2>

          </div>
          
          {/* Staff quota table */}
          {staffQuotaTableVisible && (
            <div className="table-container">
              <table className="staff-quota-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email</th>
                    <th>Total Quota</th>
                    <th>Supervisor Allocations</th>
                    <th>Remaining Supervisor</th>
                    <th>Moderator Allocations</th>
                    <th>Remaining Moderator</th>
                  </tr>
                </thead>
                <tbody>
                {/* Map through staff and display their allocation quotas */}
                {staff
                  .sort((a, b) => a['Full Name'].localeCompare(b['Full Name']))
                  .map((staffMember) => {
                    const quota = staffQuotas[staffMember.id] || 5; // Default quota
                    // Bug fix: Use quota from staffQuotas, not staffMember.Quota
                    const remainingSupervisor = Math.max(0, staffMember.Quota - (staffMember.supervisorAllocations || 0));
                    const remainingModerator = Math.max(0, staffMember.Quota - (staffMember.moderatorAllocations || 0));
                    return (
                      <tr key={staffMember.id} className={(remainingSupervisor === 0 && remainingModerator === 0) ? 'quota-full' : ''}>
                        <td>{staffMember['Full Name']}</td>
                        <td>{staffMember.Email}</td>
                        <td>{staffMember.Quota}</td>
                        <td>{staffMember.supervisorAllocations || 0}</td>
                        <td className={remainingSupervisor === 0 ? 'quota-depleted' : ''}>{remainingSupervisor}</td>
                        <td>{staffMember.moderatorAllocations || 0}</td>
                        <td className={remainingModerator === 0 ? 'quota-depleted' : ''}>{remainingModerator}</td>
                      </tr>
                    );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}

export default Allocation;