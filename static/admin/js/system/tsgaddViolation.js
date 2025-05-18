  // JWT Authentication Functions
function getJWTToken() {
    return sessionStorage.getItem('jwt_token') || '{{ request.session.jwt_token|default:"" }}' || '';
}

function storeJWTToken(token) {
    if (token) {
        sessionStorage.setItem('jwt_token', token);
    }
}

function getAuthHeaders() {
    const token = getJWTToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function fetchWithAuth(url, options = {}) {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        console.error('Authentication failed. Token may be expired.');
    }

    return response;
}
document.addEventListener('DOMContentLoaded', function() {
    const selectedStudent = localStorage.getItem('selectedStudent');
    if (selectedStudent) {
        // Wait for DOM to fully load the input fields
        setTimeout(() => {
            const student = JSON.parse(selectedStudent);
            console.log('Retrieved student:', student);

            // Optional: Add hidden inputs for form submission
            const form = document.getElementById('add-violation-form');
            form.innerHTML += `
                <input type="hidden" name="student_id" value="${student.student_id}">
                <input type="hidden" name="student_first_name" value="${student.first_name}">
                <input type="hidden" name="student_last_name" value="${student.last_name}">
            `;

            // Fill the form fields with student data
            document.getElementById('student-first-name').value = student.first_name || '';
            document.getElementById('student-middle-name').value = student.middle_name || '';
            document.getElementById('student-last-name').value = student.last_name || '';
            document.getElementById('student-id').value = student.student_id || '';
            document.getElementById('student-college').value = student.college || '';
            document.getElementById('student-course-year').value = (student.course || '') + ' - ' + (student.year_level || '');

            // Set student photo if available
            document.getElementById('student-photo').src = `http://127.0.0.1:8003/media/student_photos/${student.photo || 'placeholder.jpg'}`;

            // Clear localStorage after retrieving
            localStorage.removeItem('selectedStudent');
        }, 100);
    } else {
        console.warn('No student data found in localStorage');
    }

    // Define the form variable here AFTER DOM content is loaded
    const form = document.getElementById('add-violation-form');

    form.addEventListener("submit", async function(event) {
        event.preventDefault(); // stop default form post

        // Check if at least one violation is selected
        const violationCheckboxes = document.querySelectorAll('input[name="violation_types"]:checked');
        if (violationCheckboxes.length === 0) {
            window.ModalUtils.showErrorModal("Please select at least one violation type before submitting.");
            return false; // Stop form submission
        }

        // Gather all fields
        const ticket_id = document.getElementById("ticket_id").value;
        const remarks = document.getElementById("description").value;
        const student_id = document.getElementById("student-id").value;
        const fname = document.getElementById("student-first-name").value;
        const mname = document.getElementById("student-middle-name").value;
        const lname = document.getElementById("student-last-name").value;
        const college = document.getElementById("student-college").value;
        const course_year = document.getElementById("student-course-year").value;

        // Gather violations
        const violations = [];
        document.querySelectorAll('input[name="violation_types"]:checked').forEach(cb => {
            violations.push(cb.value);
        });

        // Handle photo file as base64
        const photoInput = document.getElementById("photo-proof");
        let photoBase64 = null;
        let photoName = null;
        if (photoInput && photoInput.files.length > 0) {
            const file = photoInput.files[0];
            photoName = file.name;
            // Read file as base64
            photoBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]); // remove data:mime/type;base64,
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        // Construct payload
        const payload = {
            ticket_id,
            violations,
            remarks,
            student_id,
            fname,
            mname,
            lname,
            college,
            course_year,
            photo: photoBase64,
            photo_name: photoName
        };

        fetch("/user/xu-entry-violation/create-ticket", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken()
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            const contentType = response.headers.get("content-type") || "";
            if (!response.ok) {
                const errorMessage = contentType.includes("application/json")
                    ? (await response.json()).error
                    : await response.text();
                throw new Error(errorMessage);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                setTimeout(() => get_ticket_data(ticket_id), 300);
            } else {
                window.ModalUtils.showErrorModal("Ticket not created: " + data.error);
            }
        })
        .catch(error => {
            window.ModalUtils.showErrorModal("Error: " + error.message);
        });
    });
});

function get_ticket_data(ticketId) {
  fetch(`/ts/dev/api/${ticketId}/get-ticket`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken() // optional for GET, but safe to include
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Failed to fetch ticket data");
    }
    return response.json();
  })
  .then(data => {
    const ticket = data.ticket;
    const student = data.student;
    send_ticket(ticket, student)
  })
  .catch(error => {
    console.error("Error fetching ticket data:", error);
    window.ModalUtils.showErrorModal("Could not fetch ticket data.");
  });
}
    
function send_ticket(ticket, student){
  fetch(`http://localhost:8001/evs/dev/api/ticket-submission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticket: ticket,
      student: student
    })
  })
  .then(response => {
    if (response.ok)
    {
      window.ModalUtils.showSuccessModal('Ticket Submitted Successfully.');
      setTimeout(() => {
        window.ModalUtils.hideAllModals();
        window.location.href='{% url "ts_guard:SearchStudent" %}';
      }, 1500);
    }
  })
  .catch(error => {
    console.error("Failed to submit ticket to OSA", error);
    window.ModalUtils.showErrorModal("Could not submit ticket data.");
  });
}

function getCSRFToken() {
  // Try to get from cookie (Django default)
  let token = '';
  const cookieString = document.cookie;
  if (cookieString) {
    const csrfCookie = cookieString
      .split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith('csrftoken='));
    if (csrfCookie) {
      token = csrfCookie.split('=')[1];
    }
  }
  // Fallback: try to get from hidden input (for forms rendered by Django)
  if (!token) {
    const input = document.querySelector('[name=csrfmiddlewaretoken]');
    if (input) token = input.value;
  }
  return token;
}

// Read query parameters and localStorage on page load
window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedStudent = JSON.parse(localStorage.getItem('selectedStudent') || '{}');

    // Prioritize localStorage data over URL parameters
    const studentId = selectedStudent.student_id || urlParams.get('student_id');
    const firstName = selectedStudent.first_name || urlParams.get('fname');
    const lastName = selectedStudent.last_name || urlParams.get('lname');
    const college = selectedStudent.college || urlParams.get('college');
    const course_year = selectedStudent.course_year || urlParams.get('course_year');

    if (studentId) {
      document.getElementById('student-id').value = studentId;
    }
    if (firstName) {
      document.getElementById('student-first-name').value = firstName;
    }
    if (lastName) {
      document.getElementById('student-last-name').value = lastName;
    }
    if (college) {
      document.getElementById('student-college').value = college;
    }
    if (course_year) {
      document.getElementById('student-course-year').value = course_year;
    }

    // Clear localStorage after populating fields
    localStorage.removeItem('selectedStudent');
    if (urlParams.has('mname')) {
      document.getElementById("student-middle-name").value = urlParams.get("mname");
    }
    if (urlParams.has('lname')) {
      document.getElementById("student-last-name").value = urlParams.get("lname");
    }
  };
  