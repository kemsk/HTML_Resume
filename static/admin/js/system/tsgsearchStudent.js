document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("student-search-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevent form submission
    searchStudents();
  });

  document.getElementById("clear-btn").addEventListener("click", clearForm);
});

async function searchStudents() {
  console.log('Starting student search...');
  const firstName = document.getElementById("search-first-name").value.trim();
  const lastName = document.getElementById("search-last-name").value.trim();
  const studentId = document.getElementById("search-student-id").value.trim();

  // Validate at least one search parameter is provided
  if (!firstName && !lastName && !studentId) {
    window.ModalUtils.showErrorModal("Please provide at least one search parameter.");
    return;
  }

  // Construct query parameters manually to ensure correct URL encoding
  const queryParams = [];
  if (firstName) queryParams.push(`first_name=${encodeURIComponent(firstName)}`);
  if (lastName) queryParams.push(`last_name=${encodeURIComponent(lastName)}`);
  if (studentId) queryParams.push(`student_id=${encodeURIComponent(studentId)}`);

  const url = `http://localhost:8003/xu-directory/dev/api/student?${queryParams.join('&')}`;
  console.log('Fetch URL:', url);

  try {
    console.log('Sending fetch request...');
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch Error:', {
        status: response.status,
        statusText: response.statusText,
        errorDetails: errorText
      });
      throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
    }

    const data = await response.json();
    console.log("Received students:", data);

    const tableBody = document.getElementById("results-table-body");
    tableBody.innerHTML = "";

    if (!data.students || data.students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No results found.</td></tr>`;
      return;
    }

    data.students.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><span class="clickable-student-id">${student.student_id}</span></td>
        <td>${student.last_name}, ${student.first_name}</td>
        <td>
          <button class="btn btn-sm btn-primary add-violation" 
                  data-student-id="${student.student_id}"
                  data-first-name="${student.first_name}"
                  data-last-name="${student.last_name}">
            Add Violation
          </button>
        </td>
      `;

      // Make student ID clickable to show details
      const studentIdCell = row.querySelector('.clickable-student-id');
      studentIdCell.addEventListener('click', () => showStudentDetails(student));

      // Add violation button functionality
      const addViolationBtn = row.querySelector('.add-violation');
      addViolationBtn.addEventListener('click', () => {
        // Store student details in localStorage for the add violation page
        console.log('Storing student data:', {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name
        });
        localStorage.setItem('selectedStudent', JSON.stringify({
          student_id: student.student_id,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name,
          college: student.college,
          course: student.course,
          year_level: student.year_level,
          photo: student.photo
        }));
        // Redirect to add violation page
        window.location.href = 'http://localhost:8002/user/xu-entry-violation/create-ticket';
      });

      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error("Error fetching student data:", error);
    window.ModalUtils.showErrorModal("An error occurred while fetching student data. Please try again later.");
  }
}

function clearForm() {
  document.getElementById("search-student-id").value = "";
  document.getElementById("search-first-name").value = "";
  document.getElementById("search-last-name").value = "";

  const tableBody = document.getElementById("results-table-body");
  tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No results found.</td></tr>`;

  // Clear student details section
  const nameSpan = document.querySelector(".ticket-details .student-name");
  if (nameSpan) nameSpan.textContent = "";
  
  const idSpan = document.querySelector(".ticket-details .student-id");
  if (idSpan) idSpan.textContent = "";
  
  const collegeSpan = document.querySelector(".ticket-details .student-college");
  if (collegeSpan) collegeSpan.textContent = "";
  
  const courseYearSpan = document.querySelector(".ticket-details .student-course-year");
  if (courseYearSpan) courseYearSpan.textContent = "";

  // Reset student image
  const imgElement = document.querySelector(".student-details img");
  if (imgElement) {
    imgElement.src = "http://127.0.0.1:8003/media/student_photos/placeholder.jpg";
  }
}

function showStudentDetails(student) {
  // Update the student details in the spans
  const nameSpan = document.querySelector(".ticket-details .student-name");
  if (nameSpan) nameSpan.textContent = `${student.last_name}, ${student.first_name} ${(student.middle_name ? student.middle_name.charAt(0) + '.' : '')}`;
  
  const idSpan = document.querySelector(".ticket-details .student-id");
  if (idSpan) idSpan.textContent = student.student_id;
  
  const collegeSpan = document.querySelector(".ticket-details .student-college");
  if (collegeSpan) collegeSpan.textContent = student.college || 'Not specified';
  
  const courseYearSpan = document.querySelector(".ticket-details .student-course-year");
  if (courseYearSpan) courseYearSpan.textContent = `${student.course || 'Not specified'} - ${student.year_level || 'N/A'}`;

  // If student image URL is provided
  const imgElement = document.querySelector(".student-details img");
  if (imgElement) {
    imgElement.src = `http://localhost:8003/media/student_photos/${student.photo || 'placeholder.jpg'}`;
    console.log('Updated student photo:', imgElement.src);
  }
}