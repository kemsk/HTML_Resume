document.addEventListener('DOMContentLoaded', function () {
  const timeframeSelect = document.getElementById('timeframe');
  const chartTypeSelect = document.getElementById('chartType');
  const autoRefreshToggle = document.getElementById('autoRefreshToggle');
  const manualRefreshBtn = document.getElementById('manualRefreshBtn');
  const lastUpdated = document.getElementById('last-updated');

  const violatorCount = document.getElementById('violator-count');
  const violationTable = document.getElementById('violation-details-body');
  const userTicket = document.getElementById('my-tickets');
  const userIDs = document.getElementById('my-ids-returned');
  const userTable = document.getElementById('my-violation-details');

  let violationChart = null;
  let autoRefreshInterval = null;

  function renderChart(type, labels, data) {
    const ctx = document.getElementById('violationChart').getContext('2d');
    if (violationChart) violationChart.destroy();
    violationChart = new Chart(ctx, {
      type: type,
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(75, 192, 192, 0.8)'],
          borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const percent = Math.round((val / total) * 100);
                return `${context.label}: ${val} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }

  function updateTimestamp() {
    const now = new Date();
    lastUpdated.textContent = "Last updated at " + now.toLocaleTimeString();
  }

  async function fetchViolationData(timeframe) {
    try {
      // Use the correct URL path based on the project structure
      const response = await fetch(`/admin/xu-entry-violation/violation-types?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching violation data:', error);
      // Return standard violation types with zero counts instead of error message
      return { 
        labels: standardViolationTypes, 
        counts: standardViolationTypes.map(() => 0) 
      };
    }
  }

  async function fetchUserStatistics(timeframe) {
    try {
      // Use the correct URL path based on the project structure
      const response = await fetch(`/admin/xu-entry-violation/my-statistics/data?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      // Return standard violation types with zero counts instead of error message
      const violations = {};
      standardViolationTypes.forEach(type => {
        violations[type] = 0;
      });
      
      return { 
        total_tickets: 0, 
        ids_returned: 0, 
        violations: violations 
      };
    }
  }

  // Standard violation types that should always be displayed
  const standardViolationTypes = [
    'ID Violation',
    'Uniform Violation',
    'Dress Code Violation'
  ];
  
  // ID Not Claimed is handled separately as a counter, not in the tables/charts

  const userIDsNotClaimed = document.getElementById('my-ids-not-claimed');

  // Initialize the tables with standard violation types
  function initializeTables() {
    // Initialize violation table
    violationTable.innerHTML = '';
    standardViolationTypes.forEach(type => {
      violationTable.innerHTML += `<tr><td>${type}</td><td>0</td></tr>`;
    });
    violationTable.innerHTML += `<tr class="table-active fw-bold"><td>Total</td><td>0</td></tr>`;
    
    // Initialize user table
    userTable.innerHTML = '';
    standardViolationTypes.forEach(type => {
      userTable.innerHTML += `<tr><td>${type}</td><td>0</td></tr>`;
    });
    userTable.innerHTML += `<tr class="table-active fw-bold"><td>Total</td><td>0</td></tr>`;
    
    // Initialize counts
    violatorCount.textContent = '0';
    userTicket.textContent = '0';
    userIDsNotClaimed.textContent = '0';
    userIDs.textContent = '0';
  }

  async function refreshData() {
    const tf = timeframeSelect.value;
    const chartType = chartTypeSelect.value;

    // Show loading indicators
    violatorCount.textContent = 'Loading...';
    userTicket.textContent = 'Loading...';
    userIDsNotClaimed.textContent = 'Loading...';
    userIDs.textContent = 'Loading...';

    try {
      // Fetch violation data
      const violationData = await fetchViolationData(tf);
      
      // Create a map of violation types to counts from the API response
      const violationMap = {};
      violationData.labels.forEach((label, idx) => {
        violationMap[label] = violationData.counts[idx];
      });
      
      // Update violation count and table with standard types
      let totalViolations = 0;
      violationTable.innerHTML = '';
      
      // Always show standard violation types, with actual counts if available
      standardViolationTypes.forEach(type => {
        const count = violationMap[type] || 0;
        totalViolations += count;
        violationTable.innerHTML += `<tr><td>${type}</td><td>${count}</td></tr>`;
      });
      
      // Add any additional violation types not in the standard list (except 'ID Not Claimed')
      violationData.labels.forEach((label, idx) => {
        if (!standardViolationTypes.includes(label) && label !== 'ID Not Claimed') {
          const count = violationData.counts[idx];
          totalViolations += count;
          violationTable.innerHTML += `<tr><td>${label}</td><td>${count}</td></tr>`;
        }
      });
      
      // The 3 violation types are separate from the ID Not Claimed tally
      // Do not add ID Not Claimed to the total violations count
      
      // Still show the total number of violations in the table
      violationTable.innerHTML += `<tr class="table-active fw-bold"><td>Total</td><td>${totalViolations}</td></tr>`;
      
      // But use the total_violators count (unique students) for the violator count display
      const totalViolators = violationData.total_violators || 0;
      violatorCount.textContent = totalViolators;
      
      // Prepare data for chart - use standard types first, then any additional types
      const chartLabels = [...standardViolationTypes];
      const chartData = chartLabels.map(label => violationMap[label] || 0);
      
      // Add any non-standard violation types to the chart (except ID Not Claimed)
      violationData.labels.forEach((label, idx) => {
        if (!standardViolationTypes.includes(label) && label !== 'ID Not Claimed') {
          chartLabels.push(label);
          chartData.push(violationData.counts[idx]);
        }
      });
      
      // Render chart
      renderChart(chartType, chartLabels, chartData);

      // Fetch user statistics
      const userData = await fetchUserStatistics(tf);
      
      // Update user statistics - show total tickets issued by all users
      userTicket.textContent = userData.total_tickets;
      
      // Display current user's name
      const currentUserName = document.getElementById('current-user-name');
      currentUserName.textContent = userData.current_user_name || 'Unknown';
      
      // Create a map of violation types to counts for this specific user
      // This should show violations given by this user only
      const userViolationMap = {};
      standardViolationTypes.forEach(type => {
        userViolationMap[type] = userData.user_violations ? userData.user_violations[type] || 0 : 0;
      });
      
      // Use the actual ID Not Claimed count from the API (now a separate value)
      const idsNotClaimed = userData.ids_not_claimed || 0;
      const idsReturned = userData.ids_returned || 0;
      
      userIDsNotClaimed.textContent = idsNotClaimed;
      userIDs.textContent = idsReturned;
      
      // Update user violation table with standard types
      userTable.innerHTML = '';
      let userTotal = 0;
      
      // Always show standard violation types, with actual counts if available
      standardViolationTypes.forEach(type => {
        const count = userViolationMap[type] || 0;
        userTotal += count;
        userTable.innerHTML += `<tr><td>${type}</td><td>${count}</td></tr>`;
      });
      
      // Add any additional violation types not in the standard list (except ID Not Claimed)
      for (const [label, count] of Object.entries(userViolationMap)) {
        if (!standardViolationTypes.includes(label) && label !== 'ID Not Claimed') {
          userTable.innerHTML += `<tr><td>${label}</td><td>${count}</td></tr>`;
          userTotal += count;
        }
      }
      
      userTable.innerHTML += `<tr class="table-active fw-bold"><td>Total</td><td>${userTotal}</td></tr>`;
      
      // Display all users' statistics
      const allUsersTable = document.getElementById('all-users-stats');
      allUsersTable.innerHTML = '';
      
      console.log('All users data:', userData.all_users);
      
      if (userData.all_users && userData.all_users.length > 0) {
        userData.all_users.forEach(user => {
          // Use the username directly as it comes from the backend
          const username = user.user_name || user.user_id;
          
          console.log('User data:', user);
          
          allUsersTable.innerHTML += `
            <tr>
              <td>${username}</td>
              <td>${user.total_tickets}</td>
              <td>${user['ID Violation']}</td>
              <td>${user['Uniform Violation']}</td>
              <td>${user['Dress Code Violation']}</td>
            </tr>
          `;
        });
      } else {
        allUsersTable.innerHTML = '<tr><td colspan="5">No user data available</td></tr>';
      }

      updateTimestamp();
    } catch (error) {
      console.error('Error refreshing data:', error);
      // Instead of showing error text, revert to showing zeros
      violatorCount.textContent = '0';
      userTicket.textContent = '0';
      userIDsNotClaimed.textContent = '0';
      userIDs.textContent = '0';
      
      // Reset tables to show standard violation types with zeros
      initializeTables();
      
      // Still update the timestamp
      updateTimestamp();
    }
  }

  function toggleAutoRefresh(enabled) {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    manualRefreshBtn.disabled = enabled;
    if (enabled) {
      autoRefreshInterval = setInterval(refreshData, 30000); // 30 seconds
    }
  }

  // Events
  timeframeSelect.addEventListener('change', refreshData);
  chartTypeSelect.addEventListener('change', refreshData);
  manualRefreshBtn.addEventListener('click', refreshData);
  autoRefreshToggle.addEventListener('change', () => {
    toggleAutoRefresh(autoRefreshToggle.checked);
  });

  // Initialize tables with standard violation types
  initializeTables();
  
  // Initial load
  refreshData();
  toggleAutoRefresh(autoRefreshToggle.checked);
});