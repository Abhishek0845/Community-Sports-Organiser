document.addEventListener('DOMContentLoaded', function() {
    // Form submission for creating a new tournament
    const createTournamentForm = document.getElementById('create-tournament-form');
    if (createTournamentForm) {
        createTournamentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const tournamentData = {
                name: document.getElementById('tournament-name').value,
                sport: document.getElementById('tournament-sport').value,
                format: document.getElementById('tournament-format').value,
                start_date: document.getElementById('tournament-start-date').value,
                end_date: document.getElementById('tournament-end-date').value,
                venue: document.getElementById('tournament-venue').value,
                address: document.getElementById('tournament-address').value,
                max_teams: parseInt(document.getElementById('tournament-max-teams').value, 10),
                description: document.getElementById('tournament-description').value,
                registration_deadline: document.getElementById('tournament-registration-deadline').value,
                eligibility: document.getElementById('tournament-eligibility').value,
                prize_money: document.getElementById('tournament-prize').value,
                notify: document.getElementById('tournament-notify').checked
            };
            
            fetch('/api/tournaments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tournamentData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Tournament created successfully!');
                    createTournamentForm.reset();
                    loadRegistrations();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while creating the tournament.');
            });
        });
    }
    
    // Load tournament registrations
    function loadRegistrations() {
        fetch('/api/registrations')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayRegistrations(data.registrations);
                populateTournamentFilter(data.tournaments);
            } else {
                console.error('Error loading registrations:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    // Display registrations in the table
    function displayRegistrations(registrations) {
        const registrationsList = document.getElementById('registrations-list');
        if (!registrationsList) return;
        
        registrationsList.innerHTML = '';
        
        if (registrations.length === 0) {
            registrationsList.innerHTML = '<tr><td colspan="5" class="text-center">No registrations found</td></tr>';
            return;
        }
        
        registrations.forEach(reg => {
            const row = document.createElement('tr');
            
            const tournamentCell = document.createElement('td');
            tournamentCell.textContent = reg.tournament_name;
            
            const teamCell = document.createElement('td');
            teamCell.textContent = reg.team_name;
            
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(reg.registration_date);
            
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge ${getBadgeClass(reg.status)}`;
            statusBadge.textContent = reg.status.charAt(0).toUpperCase() + reg.status.slice(1);
            statusCell.appendChild(statusBadge);
            
            const actionsCell = document.createElement('td');
            
            if (reg.status === 'pending') {
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn btn-sm btn-success';
                approveBtn.textContent = 'Approve';
                approveBtn.onclick = () => openApproveModal(reg);
                
                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-sm btn-danger ms-1';
                rejectBtn.textContent = 'Reject';
                rejectBtn.onclick = () => rejectRegistration(reg.id);
                
                actionsCell.appendChild(approveBtn);
                actionsCell.appendChild(rejectBtn);
            } else {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'btn btn-sm btn-info';
                viewBtn.textContent = 'View Details';
                viewBtn.onclick = () => viewRegistrationDetails(reg);
                
                actionsCell.appendChild(viewBtn);
            }
            
            row.appendChild(tournamentCell);
            row.appendChild(teamCell);
            row.appendChild(dateCell);
            row.appendChild(statusCell);
            row.appendChild(actionsCell);
            
            registrationsList.appendChild(row);
        });
    }
    
    // Populate tournament filter dropdown
    function populateTournamentFilter(tournaments) {
        const filterSelect = document.getElementById('registration-tournament-filter');
        if (!filterSelect) return;
        
        // Clear existing options except the first one
        while (filterSelect.options.length > 1) {
            filterSelect.remove(1);
        }
        
        // Add tournament options
        tournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament.id;
            option.textContent = tournament.name;
            filterSelect.appendChild(option);
        });
        
        // Add event listener for filter change
        filterSelect.addEventListener('change', function() {
            const tournamentId = this.value;
            
            if (tournamentId) {
                fetch(`/api/registrations?tournament_id=${tournamentId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        displayRegistrations(data.registrations);
                    }
                })
                .catch(error => console.error('Error:', error));
            } else {
                loadRegistrations();
            }
        });
    }
    
    // Open modal for approving registration
    function openApproveModal(registration) {
        const modal = new bootstrap.Modal(document.getElementById('approveRegistrationModal'));
        const detailsDiv = document.getElementById('team-registration-details');
        const registrationIdInput = document.getElementById('registration-id');
        
        registrationIdInput.value = registration.id;
        
        detailsDiv.innerHTML = `
            <dl class="row mt-3">
                <dt class="col-sm-4">Tournament:</dt>
                <dd class="col-sm-8">${registration.tournament_name}</dd>
                
                <dt class="col-sm-4">Team:</dt>
                <dd class="col-sm-8">${registration.team_name}</dd>
                
                <dt class="col-sm-4">Captain:</dt>
                <dd class="col-sm-8">${registration.captain}</dd>
                
                <dt class="col-sm-4">Contact:</dt>
                <dd class="col-sm-8">${registration.contact}</dd>
                
                <dt class="col-sm-4">Email:</dt>
                <dd class="col-sm-8">${registration.email}</dd>
                
                <dt class="col-sm-4">Registration Date:</dt>
                <dd class="col-sm-8">${formatDate(registration.registration_date)}</dd>
                
                <dt class="col-sm-4">Players:</dt>
                <dd class="col-sm-8">${registration.players || 'No players listed'}</dd>
            </dl>
        `;
        
        modal.show();
    }
    
    // Approve registration form submission
    const approveRegistrationForm = document.getElementById('approve-registration-form');
    if (approveRegistrationForm) {
        approveRegistrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const registrationId = document.getElementById('registration-id').value;
            const notes = document.getElementById('registration-notes').value;
            
            fetch('/api/registrations/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    registration_id: registrationId,
                    notes: notes
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('approveRegistrationModal')).hide();
                    alert('Registration approved successfully!');
                    loadRegistrations();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while approving the registration.');
            });
        });
    }
    
    // Reject registration
    function rejectRegistration(registrationId) {
        if (confirm('Are you sure you want to reject this registration?')) {
            fetch('/api/registrations/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    registration_id: registrationId
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Registration rejected successfully!');
                    loadRegistrations();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while rejecting the registration.');
            });
        }
    }
    
    // View registration details
    function viewRegistrationDetails(registration) {
        alert(`
            Tournament: ${registration.tournament_name}
            Team: ${registration.team_name}
            Captain: ${registration.captain}
            Contact: ${registration.contact}
            Email: ${registration.email}
            Status: ${registration.status}
            Registration Date: ${formatDate(registration.registration_date)}
            Notes: ${registration.notes || 'None'}
            Players: ${registration.players || 'No players listed'}
        `);
    }
    
    // Helper function to get badge class based on status
    function getBadgeClass(status) {
        switch (status) {
            case 'pending':
                return 'bg-warning text-dark';
            case 'approved':
                return 'bg-success';
            case 'rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Load registrations on page load
    loadRegistrations();
});