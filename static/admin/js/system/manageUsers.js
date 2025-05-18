// Define global functions first so they're available immediately
function openEditProfileModal(ssio_id, fname, lname, email, password, userpin) {
  // Set form field values
  document.getElementById('modal-edit-self-id').value = ssio_id;
  document.getElementById('modal-edit-self-fname').value = fname;
  document.getElementById('modal-edit-self-lname').value = lname;
  document.getElementById('modal-edit-self-email').value = email;
  document.getElementById('modal-edit-self-password').value = password;
  document.getElementById('modal-edit-self-userpin').value = userpin;

  // Set the form's action URL dynamically
  const editForm = document.getElementById('manage-profile-edit-form');
  if (editForm) {
    editForm.action = `/admin/xu-entry-violation/profile/update/${ssio_id}`;
    console.log("Form action set to:", editForm.action);
  }
}

// Function for the static (non-modal) edit profile functionality
function showManageUsers() {
  // Update navigation buttons
  document.getElementById('manage-users-btn').classList.add('active');
  document.getElementById('edit-profile-btn').classList.remove('active');
  
  // Show/hide containers
  document.getElementById('user-management-container').style.display = 'block';
  document.getElementById('edit-profile-container').style.display = 'none';
}

function showEditProfile(userId, firstName, lastName, email) {
  // Update navigation buttons
  document.getElementById('manage-users-btn').classList.remove('active');
  document.getElementById('edit-profile-btn').classList.add('active');
  
  // Show/hide containers
  document.getElementById('user-management-container').style.display = 'none';
  document.getElementById('edit-profile-container').style.display = 'block';
  
  // Populate form fields
  document.getElementById('static-profile-id').value = userId;
  document.getElementById('static-profile-fname').value = firstName;
  document.getElementById('static-profile-lname').value = lastName;
  document.getElementById('static-profile-email').value = email;
  document.getElementById('static-profile-password').value = '';
  document.getElementById('static-profile-pin').value = '';
  
  // Set form action dynamically
  const editForm = document.getElementById('static-edit-profile-form');
  if (editForm) {
    editForm.action = `/admin/xu-entry-violation/profile/update/${userId}`;
    console.log("Static form action set to:", editForm.action);
  }
}

function updateProfile() {
  const form = document.getElementById('static-edit-profile-form');
  const userId = document.getElementById('static-profile-id').value;
  
  // If we're using a regular form submission
  if (form.action) {
    form.submit();
    return;
  }
  
  // Otherwise use fetch API
  const formData = new FormData(form);
  
  fetch(`/admin/xu-entry-violation/profile/update/${userId}`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-CSRFToken': getCookie('csrftoken')
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    if (data.status === 'success') {
      const fname = document.getElementById('static-profile-fname').value;
      const lname = document.getElementById('static-profile-lname').value;
      const fullName = `${fname} ${lname}`;
      window.ModalUtils.showSuccessModal(`Profile for ${fullName} updated successfully!`);
      showManageUsers();
    } else {
      window.ModalUtils.showErrorModal('Error: ' + (data.message || 'Unknown error'));
    }
  })
  .catch(error => {
    console.error('Error updating profile:', error);
    window.ModalUtils.showErrorModal('Error updating profile. Please try again.');
  });
}

// Helper function to get CSRF token
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Open User View Modal
function openViewUserModal(button) {
  const dataset = button.dataset;
  console.log("View User Modal opened for:", dataset);

  document.getElementById('modal-user-id').textContent = dataset.id || '';
  document.getElementById('modal-user-fname').textContent = dataset.fname || '';
  document.getElementById('modal-user-lname').textContent = dataset.lname || '';
  document.getElementById('modal-user-username').textContent = dataset.username || '';
  document.getElementById('modal-user-email').textContent = dataset.email || '';
  document.getElementById('modal-user-access-type').textContent = dataset.accessType || '';
}

// Open Edit User Modal
function openEditUserModal(button) {
  const dataset = button.dataset;
  console.log("Edit User Modal opened for:", dataset);
  
  document.getElementById('modal-edit-user-id').value = dataset.id || '';
  document.getElementById('modal-edit-user-fname').value = dataset.fname || '';
  document.getElementById('modal-edit-user-lname').value = dataset.lname || '';
  document.getElementById('modal-edit-user-email').value = dataset.email || '';
  
  // Set select dropdown value
  const accessTypeSelect = document.getElementById('modal-edit-user-accesstype');
  const accessType = dataset.accessType || '';
  
  // Match access type to option value
  for (let i = 0; i < accessTypeSelect.options.length; i++) {
    if (accessTypeSelect.options[i].text === accessType) {
      accessTypeSelect.selectedIndex = i;
      break;
    }
  }
}

// Confirm Delete User Modal
function confirmDeleteUser(userData) {
  document.getElementById('delete-user-id').textContent = userData.id;
  document.getElementById('delete-username').textContent = userData.username;
  document.getElementById('delete-user-email').textContent = userData.email;
  document.getElementById('delete-user-id-input').value = userData.id;
}

// Success and Error modals
function showSuccessModal(message) {
  document.getElementById('successModalBody').textContent = message;
  const modal = new bootstrap.Modal(document.getElementById('successModal'));
  modal.show();
}

function showErrorModal(message) {
  document.getElementById('errorModalBody').textContent = message;
  const modal = new bootstrap.Modal(document.getElementById('errorModal'));
  modal.show();
}

function hideAllModals() {
  document.querySelectorAll('.modal').forEach(modalEl => {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  });
}

// User create
function user_create() {
  const fname = document.getElementById('ssio_fname').value;
  const lname = document.getElementById('ssio_lname').value;
  const email = document.getElementById('ssio_email').value;
  const username = document.getElementById('ssio_username').value;
  const password = document.getElementById('password').value;
  const confPassword = document.getElementById('confirm_password').value;
  const role = document.querySelector('#access_type').value;
  const pin = document.getElementById('ssio_userpin').value;

  if (password !== confPassword) {
    alert('Password Mismatch.');
    return;
  }

  if (!fname || !lname || !email || !username || !password || !role || !pin) {
    alert('Fill all required fields.');
    return;
  }

  const data = { fname, lname, email, username, password, role, pin };

  fetch(`/admin/xu-entry-violation/user/create`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw new Error(err.message || 'Failed to create user.'); });
    }
    return response.json();
  })
  .then(result => {
    hideAllModals();
    showSuccessModal(result.message || 'User created successfully!');
    document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
  })
  .catch(error => {
    console.error('Error:', error);
    hideAllModals();
    showErrorModal('User creation error.');
  });
}

// User edit
function user_edit() {
  const userId = document.getElementById('modal-edit-user-id').value;
  const fname = document.getElementById('modal-edit-user-fname').value;
  const lname = document.getElementById('modal-edit-user-lname').value;
  const email = document.getElementById('modal-edit-user-email').value;
  const role = document.querySelector('#modal-edit-user-accesstype').value;

  if (!fname || !lname || !email || !role) {
    alert('Fill all required fields.');
    return;
  }

  const data = { user_id: userId, fname, lname, email, role };

  fetch(`/admin/xu-entry-violation/user/update/${userId}`, {
    method: "PATCH",
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  })
  .then(data => {
    hideAllModals();
    if (data.success) {
      showSuccessModal('User updated successfully!');
      document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
    } else {
      showErrorModal(data.message || 'Something went wrong while updating.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    hideAllModals();
    showErrorModal('Failed to update user. Please try again.');
  });
}

// User delete
function user_delete() {
  const userId = document.getElementById('delete-user-id-input').value;

  fetch(`/admin/xu-entry-violation/user/delete/${userId}`, {
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => { throw new Error(data.message || 'Failed to delete user.'); });
    }
    return response.json();
  })
  .then(result => {
    hideAllModals();
    showSuccessModal(result.message || 'User deleted successfully!');
    document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
  })
  .catch(error => {
    console.error('Error:', error);
    hideAllModals();
    showErrorModal('Failed to delete user. Please try again.');
  });
}

// Helper to get CSRF token from cookie
function getCSRFToken() {
  return document.cookie
    .split(";")
    .find(c => c.trim().startsWith("csrftoken="))
    ?.split("=")[1] || "";
}

// Assign all functions to window so they're globally accessible
window.openEditProfileModal = openEditProfileModal;
window.openViewUserModal = openViewUserModal;
window.openEditUserModal = openEditUserModal;
window.confirmDeleteUser = confirmDeleteUser;
window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;
window.hideAllModals = hideAllModals;
window.user_create = user_create;
window.user_edit = user_edit;
window.user_delete = user_delete;
window.getCSRFToken = getCSRFToken;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Sort users table descending by ID on page load
  const table = document.getElementById('users-table');
  if (table) {
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);

    rows.sort((a, b) => {
      const idA = parseInt(a.cells[0].textContent.trim(), 10);
      const idB = parseInt(b.cells[0].textContent.trim(), 10);
      return idB - idA; // descending order
    });

    rows.forEach(row => tbody.appendChild(row));

    // Enable column header sorting
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
          .filter(row => row.querySelectorAll('td').length > 0);

        rows.sort((a, b) => {
          const cellA = a.querySelectorAll('td')[index].innerText.trim().toLowerCase();
          const cellB = b.querySelectorAll('td')[index].innerText.trim().toLowerCase();

          const numA = parseFloat(cellA);
          const numB = parseFloat(cellB);

          if (!isNaN(numA) && !isNaN(numB)) {
            return (numA - numB) * sortDirection;
          }
          return cellA.localeCompare(cellB) * sortDirection;
        });

        rows.forEach(row => tbody.appendChild(row));
      });
    });
  }

  // Expose modal helpers globally (for calls outside this scope)
  window.showSuccessModal = showSuccessModal;
  window.showErrorModal = showErrorModal;
  window.hideAllModals = hideAllModals;

  // Open User View Modal
  window.openViewUserModal = function(button) {
    const dataset = button.dataset;

    document.getElementById('modal-user-id').textContent = dataset.id || '';
    document.getElementById('modal-user-fname').textContent = dataset.fname || '';
    document.getElementById('modal-user-lname').textContent = dataset.lname || '';
    document.getElementById('modal-user-username').textContent = dataset.username || '';
    document.getElementById('modal-user-email').textContent = dataset.email || '';
    document.getElementById('modal-user-access-type').textContent = dataset.accessType || '';
  };

  // Confirm Delete User Modal
  window.confirmDeleteUser = function(userData) {
    document.getElementById('delete-user-id').textContent = userData.id;
    document.getElementById('delete-username').textContent = userData.username;
    document.getElementById('delete-user-email').textContent = userData.email;
    document.getElementById('delete-user-id-input').value = userData.id;

    const deleteModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    deleteModal.show();
  };

  // Open Edit User Modal
  window.openEditUserModal = function(button) {
    const dataset = button.dataset;

    document.getElementById('modal-edit-user-id').value = dataset.id || '';
    document.getElementById('modal-edit-user-fname').value = dataset.fname || '';
    document.getElementById('modal-edit-user-lname').value = dataset.lname || '';
    document.getElementById('modal-edit-user-email').value = dataset.email || '';
    document.getElementById('modal-edit-user-accesstype').value = dataset.accessType || '';

    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editModal.show();
  };

  // User create
  window.user_create = function() {
    const fname = document.getElementById('ssio_fname').value;
    const lname = document.getElementById('ssio_lname').value;
    const email = document.getElementById('ssio_email').value;
    const username = document.getElementById('ssio_username').value;
    const password = document.getElementById('password').value;
    const confPassword = document.getElementById('confirm-password').value;
    const role = document.querySelector('#access_type').value;
    const pin = document.getElementById('ssio_userpin').value;

    if (password !== confPassword) {
      window.ModalUtils.showErrorModal('Password Mismatch.');
      return;
    }

    if (!fname || !lname || !email || !username || !password || !role || !pin) {
      window.ModalUtils.showErrorModal('Fill all required fields.');
      return;
    }

    const data = { fname, lname, email, username, password, role, pin };

    fetch(`/admin/xu-entry-violation/user/create`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => { throw new Error(err.message || 'Failed to create user.'); });
      }
      return response.json();
    })
    .then(result => {
      hideAllModals();
      const message = `User ${username} created successfully!`;
      showSuccessModal(message);
      document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
    })
    .catch(error => {
      console.error('Error:', error);
      hideAllModals();
      showErrorModal('User creation error.');
    });
  };

  // User edit
  window.user_edit = function() {
    const userId = document.getElementById('modal-edit-user-id').value;
    const fname = document.getElementById('modal-edit-user-fname').value;
    const lname = document.getElementById('modal-edit-user-lname').value;
    const email = document.getElementById('modal-edit-user-email').value;
    const role = document.querySelector('#modal-edit-user-accesstype').value;

    if (!fname || !lname || !email || !role) {
      window.ModalUtils.showErrorModal('Fill all required fields.');
      return;
    }

    const data = { user_id: userId, fname, lname, email, role };

    fetch(`/admin/xu-entry-violation/user/update/${userId}`, {
      method: "PATCH",
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    })
    .then(data => {
      hideAllModals();
      if (data.success) {
        const fullName = `${fname} ${lname}`;
        showSuccessModal(`User ${fullName} updated successfully!`);
        document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
      } else {
        showErrorModal(data.message || 'Something went wrong while updating.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      hideAllModals();
      showErrorModal('Failed to update user. Please try again.');
    });
  };

  // User delete
  window.user_delete = function() {
    const userId = document.getElementById('delete-user-id-input').value;

    fetch(`/admin/xu-entry-violation/user/delete/${userId}`, {
      method: "DELETE",
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({ user_id: userId })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => { throw new Error(data.message || 'Failed to delete user.'); });
      }
      return response.json();
    })
    .then(result => {
      hideAllModals();
      // Get the username from the delete confirmation modal title or content
      const deleteModalTitle = document.querySelector('#deleteUserModal .modal-title');
      const username = deleteModalTitle ? deleteModalTitle.textContent.replace('Delete User: ', '') : 'User';
      showSuccessModal(`User ${username} deleted successfully!`);
      document.getElementById('successModal').addEventListener('hidden.bs.modal', () => location.reload(), { once: true });
    })
    .catch(error => {
      console.error('Error:', error);
      hideAllModals();
      showErrorModal('Failed to delete user. Please try again.');
    });
  };

  // Helper to get CSRF token from cookie
  function getCSRFToken() {
    return document.cookie
      .split(";")
      .find(c => c.trim().startsWith("csrftoken="))
      ?.split("=")[1] || "";
  }
  // Additional initialization code if needed
  console.log('ManageUsers.js initialized');
});

