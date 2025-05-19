const token = sessionStorage.getItem('jwt_token') || '{{ request.session.jwt_token }}' || '';
    document.addEventListener('DOMContentLoaded', function () {
      const table = document.getElementById('violations-table');
      const headers = table.querySelectorAll('th');
      let sortDirection = 1; // 1 = asc, -1 = desc
      let currentSortedColumn = -1;
  
      headers.forEach((header, index) => {
          header.style.cursor = 'pointer';
          header.addEventListener('click', () => {
              if (currentSortedColumn === index) {
                  sortDirection *= -1; // Toggle direction
              } else {
                  sortDirection = 1; // Default to ascending
                  currentSortedColumn = index;
              }
  
              const tbody = table.querySelector('tbody');
              const rows = Array.from(tbody.querySelectorAll('tr'))
                  .filter(row => row.querySelectorAll('td').length > 0); // Ignore empty or no-data rows
  
              rows.sort((a, b) => {
                  const cellA = a.querySelectorAll('td')[index].innerText.trim().toLowerCase();
                  const cellB = b.querySelectorAll('td')[index].innerText.trim().toLowerCase();
  
                  // Try to compare as numbers first
                  const numA = parseFloat(cellA);
                  const numB = parseFloat(cellB);
  
                  if (!isNaN(numA) && !isNaN(numB)) {
                      return (numA - numB) * sortDirection;
                  }
  
                  return cellA.localeCompare(cellB) * sortDirection;
              });
  
              // Clear existing rows
              rows.forEach(row => tbody.appendChild(row));
          });
      });
  });

  function update_id(ticket_id, status) {
    fetch(`/admin/xu-entry-violation/ticket/${ticket_id}/update/id-status`, {
        method: "POST",
        headers: {
            "Content-Type": 'application/json',
            "X-CSRFToken": getCSRFToken(),
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            status: status
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("Server error or invalid response");
        }
        return res.json();
        })
        .then(data => {
            get_status(ticket_id)
        })
        .catch(error => {
            console.error("Error fetching ticket data:", error);
            alert("Failed to load ticket data.");
        });
    }

  function get_status(ticket_id){
    fetch(`/ts/dev/api/${ticket_id}/get-status`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
        },
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("Failed to fetch ticket data");
          }
          return res.json();
    })
    .then(data => {
        update_id_status(ticket_id, data)
      })
      .catch(error => {
        console.error("Error fetching ticket data:", error);
        alert("Could not fetch ticket data.");
      });
  }

  function update_id_status(ticket_id, data){
    fetch(`http://localhost:8001/evs/dev/api/${ticket_id}/update-status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok)
        {
          alert('Ticket updated.');
          location.reload();
        }
      })
      .catch(error => {
        console.error("Failed to submit status to SSIO", error);
        alert("Could not fetch ticket data.");
      });
  }

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
      alert("Could not fetch ticket data.");
    });
  }

  function check_ticket(ticket_id){
    fetch(`http://localhost:8001/evs/dev/api/${ticket_id}/check_ticket`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            get_ticket_data(ticket_id); 
        } else {
            alert("Ticket already sent to OSA.");
            location.reload();
        }
    })
    .catch(err => {
        console.error("Error posting to external system:", err);
    });
  }
      
  function send_ticket(ticket, student){
    fetch(`http://localhost:8001/evs/dev/api/ticket-submission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        ticket: ticket,
        student: student
      })
    })
    .then(response => {
      if (response.ok)
      {
        alert('Ticket Submitted Successfully.');
        location.reload();
      }
    })
    .catch(error => {
      console.error("Failed to submit ticket to OSA", error);
      alert("Could not fetch ticket data.");
    });
  }
  
  function getCSRFToken() {
    return document.cookie
      .split(";")
      .find(c => c.trim().startsWith("csrftoken="))
      ?.split("=")[1] || "";
  }