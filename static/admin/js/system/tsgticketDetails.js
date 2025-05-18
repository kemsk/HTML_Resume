const token = sessionStorage.getItem('jwt_token') || '{{ request.session.jwt_token }}' || '';
document.addEventListener('DOMContentLoaded', () => {

  function update_id(ticket_id, status) {
    fetch(`/user/xu-entry-violation/ticket/${ticket_id}/update/id-status`, {
        method: "POST",
        headers: {
            "Content-Type": 'application/json',
            "X-CSRFToken": getCSRFToken(),
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
        window.ModalUtils.showErrorModal("Failed to load ticket data.");
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
        window.ModalUtils.showErrorModal("Could not fetch ticket data.");
    });
  }

  function update_id_status(ticket_id, data){
    fetch(`http://localhost:8001/evs/dev/api/${ticket_id}/update-status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            window.ModalUtils.showSuccessModal('Ticket updated successfully.');
            setTimeout(() => {
                window.ModalUtils.hideAllModals();
                location.reload();
            }, 1500);
        }
    })
    .catch(error => {
        console.error("Failed to submit status to SSIO", error);
        window.ModalUtils.showErrorModal("Could not update ticket status.");
    });
  }

  function getCSRFToken() {
    return document.cookie
      .split(";")
      .find(c => c.trim().startsWith("csrftoken="))
      ?.split("=")[1] || "";
  }

  async function loadImage(ticket_id) { 
    const response = await fetch(`/ts/dev/api/${ticket_id}/get-image-url`); 
    if (!response.ok) { 
        document.getElementById("noPhotoMessage").style.display = "block";
        document.getElementById("ticketPhoto").style.display = "none";
        return;
    } 
    const blob = await response.blob(); 
    const imageUrl = URL.createObjectURL(blob); 
    const imgElement = document.getElementById("ticketPhoto"); 
    imgElement.src = imageUrl; 
    imgElement.style.display = "block"; 
  }

  // Get the ticket ID from the data attribute
  const ticketDetailsContent = document.getElementById('ticket-details-content');
  if (ticketDetailsContent) {
    const ticketId = ticketDetailsContent.dataset.ticketId;
    if (ticketId) {
      loadImage(ticketId);
    }
  }
  
});
