document.addEventListener('DOMContentLoaded', function() {
    // Load tournaments on page load
    loadTournaments();
    
    // Set up event listeners for filter controls
    const sportFilter = document.getElementById('sport-filter');
    const formatFilter = document.getElementById('format-filter');
    
    if (sportFilter) {
        sportFilter.addEventListener('change', function() {
            filterTournaments();
        });
    }
    
    if (formatFilter) {
        formatFilter.addEventListener('change', function() {
            filterTournaments();
        });
    }
    
    // Register team form submission
    const registerTeamForm = document.getElementById('register-team-form');
    if (registerTeamForm) {
        registerTeamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const tournamentId = document.getElementById('team-tournament').value;
            const teamName = document.getElementById('team-name').value;
            const captainName = document.getElementById('team-captain').value;
            const contactNumber = document.getElementById('team-contact').value;
            const email = document.getElementById('team-email').value;
            const players = document.getElementById('team-players').value;
            
            // Validate form
            if (!tournamentId || !teamName || !captainName || !contactNumber || !email || !players) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Submit registration
            const registrationData = {
                tournament_id: tournamentId,
                team_name: teamName,
                captain: captainName,
                contact: contactNumber,
                email: email,
                players: players
            };
            
            fetch('/api/register/tournament', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Team registered successfully! Your registration is pending approval from the tournament organizers.');
                    registerTeamForm.reset();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while registering your team.');
            });
        });
    }
    
    // Check registration status form submission
    const checkRegistrationForm = document.getElementById('check-registration-form');
    if (checkRegistrationForm) {
        checkRegistrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const teamName = document.getElementById('check-team-name').value;
            const email = document.getElementById('check-team-email').value;
            
            // Validate form
            if (!teamName || !email) {
                alert('Please enter team name and email.');
                return;
            }
            
            // Submit request
            fetch(`/api/registrations/status?team=${encodeURIComponent(teamName)}&email=${encodeURIComponent(email)}`)
            .then(response => response.json())
            .then(data => {
                const resultsDiv = document.getElementById('registration-status-results');
                const detailsDiv = document.getElementById('registration-details');
                
                resultsDiv.style.display = 'block';
                
                if (data.success) {
                    let html = '';
                    
                    if (data.registrations.length === 0) {
                        html = '<div class="alert alert-warning">No registrations found for this team and email.</div>';
                    } else {
                        html = '<div class="list-group">';
                        
                        data.registrations.forEach(reg => {
                            const statusClass = getStatusClass(reg.status);
                            
                            html += `
                                <div class="list-group-item">
                                    <div class="d-flex w-100 justify-content-between">
                                        <h5 class="mb-1">${reg.tournament_name}</h5>
                                        <span class="badge ${statusClass}">${reg.status.toUpperCase()}</span>
                                    </div>
                                    <p class="mb-1">Team: ${reg.team_name}</p>
                                    <p class="mb-1">Captain: ${reg.captain}</p>
                                    <p class="mb-1">Registered on: ${formatDate(reg.registration_date)}</p>
                                    ${reg.notes ? `<p class="mb-1">Notes: ${reg.notes}</p>` : ''}
                                    
                                    <div class="mt-2">
                                        <h6>Players:</h6>
                                        <p>${reg.players || 'No players listed'}</p>
                                    </div>
                                </div>
                            `;
                        });
                        
                        html += '</div>';
                    }
                    
                    detailsDiv.innerHTML = html;
                } else {
                    detailsDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while checking registration status.');
            });
        });
    }
    
    // Event listener for tournament select to show min players
    const tournamentSelect = document.getElementById('team-tournament');
    if (tournamentSelect) {
        tournamentSelect.addEventListener('change', function() {
            const tournamentId = this.value;
            
            if (tournamentId) {
                fetch(`/api/tournaments/${tournamentId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const tournament = data.tournament;
                        const minPlayersInfo = document.getElementById('min-players-info');
                        
                        if (tournament.min_players) {
                            minPlayersInfo.textContent = `Minimum players required: ${tournament.min_players}`;
                        } else {
                            minPlayersInfo.textContent = '';
                        }
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        });
    }
    
    // Load tournaments
    function loadTournaments() {
        fetch('/api/tournaments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayTournaments(data.tournaments);
                populateTournamentDropdown(data.tournaments);
            } else {
                console.error('Error loading tournaments:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    // Display tournaments
    function displayTournaments(tournaments) {
        const tournamentsList = document.getElementById('tournaments-list');
        if (!tournamentsList) return;
        
        tournamentsList.innerHTML = '';
        
        if (tournaments.length === 0) {
            tournamentsList.innerHTML = '<div class="alert alert-info">No tournaments found</div>';
            return;
        }
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        tournaments.forEach(tournament => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-6 mb-4';
            
            const card = document.createElement('div');
            card.className = 'card h-100';
            card.dataset.sport = tournament.sport;
            card.dataset.format = tournament.format;
            
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            cardHeader.innerHTML = `
                <h5 class="card-title mb-0">${tournament.name}</h5>
                <small class="text-muted">${tournament.sport} • ${formatTournamentFormat(tournament.format)}</small>
            `;
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            cardBody.innerHTML = `
                <div class="mb-2"><strong>Dates:</strong> ${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}</div>
                <div class="mb-2"><strong>Venue:</strong> ${tournament.venue}</div>
                <div class="mb-2"><strong>Teams:</strong> ${tournament.registered_teams || 0}/${tournament.max_teams}</div>
                <div class="mb-2"><strong>Registration Deadline:</strong> ${formatDate(tournament.registration_deadline) || 'Not specified'}</div>
                <p class="card-text">${truncateText(tournament.description || 'No description available.', 100)}</p>
            `;
            
            const cardFooter = document.createElement('div');
            cardFooter.className = 'card-footer';
            
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn btn-outline-primary';
            detailsBtn.textContent = 'View Details';
            detailsBtn.onclick = () => openTournamentDetails(tournament);
            
            const registerBtn = document.createElement('button');
            registerBtn.className = 'btn btn-success ms-2';
            registerBtn.textContent = 'Register';
            registerBtn.onclick = () => registerForTournament(tournament.id);
            
            cardFooter.appendChild(detailsBtn);
            cardFooter.appendChild(registerBtn);
            
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            card.appendChild(cardFooter);
            
            colDiv.appendChild(card);
            rowDiv.appendChild(colDiv);
        });
        
        tournamentsList.appendChild(rowDiv);
    }
    
    // Filter tournaments based on selected filters
    function filterTournaments() {
        const sportValue = sportFilter ? sportFilter.value : '';
        const formatValue = formatFilter ? formatFilter.value : '';
        
        const cards = document.querySelectorAll('#tournaments-list .card');
        
        cards.forEach(card => {
            const cardSport = card.dataset.sport;
            const cardFormat = card.dataset.format;
            
            const sportMatch = !sportValue || cardSport === sportValue;
            const formatMatch = !formatValue || cardFormat === formatValue;
            
            if (sportMatch && formatMatch) {
                card.closest('.col-md-6').style.display = '';
            } else {
                card.closest('.col-md-6').style.display = 'none';
            }
        });
    }
    
    // Populate tournament dropdown for registration
    function populateTournamentDropdown(tournaments) {
        const tournamentSelect = document.getElementById('team-tournament');
        if (!tournamentSelect) return;
        
        // Clear existing options except the first one
        while (tournamentSelect.options.length > 1) {
            tournamentSelect.remove(1);
        }
        
        // Filter tournaments that are open for registration
        const openTournaments = tournaments.filter(t => 
            t.status === 'upcoming' && 
            (!t.registration_deadline || new Date(t.registration_deadline) >= new Date()) &&
            (!t.max_teams || (t.registered_teams || 0) < t.max_teams)
        );
        
        // Add tournament options
        openTournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament.id;
            option.textContent = `${tournament.name} (${tournament.sport})`;
            tournamentSelect.appendChild(option);
        });
    }
    
    // Open tournament details modal
    function openTournamentDetails(tournament) {
        const modal = new bootstrap.Modal(document.getElementById('tournamentDetailsModal'));
        const detailsDiv = document.getElementById('tournament-details');
        const teamsListDiv = document.getElementById('registered-teams-list');
        const registerBtn = document.querySelector('.register-now-btn');
        
        detailsDiv.innerHTML = `
            <h4>${tournament.name}</h4>
            <div class="badge bg-primary mb-2">${tournament.sport}</div>
            <div class="badge bg-secondary mb-2">${formatTournamentFormat(tournament.format)}</div>
            
            <dl class="row mt-3">
                <dt class="col-sm-4">Dates:</dt>
                <dd class="col-sm-8">${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}</dd>
                
                <dt class="col-sm-4">Venue:</dt>
                <dd class="col-sm-8">${tournament.venue}</dd>
                
                <dt class="col-sm-4">Address:</dt>
                <dd class="col-sm-8">${tournament.address || 'Not specified'}</dd>
                
                <dt class="col-sm-4">Status:</dt>
                <dd class="col-sm-8"><span class="badge ${getStatusBadgeClass(tournament.status)}">${tournament.status.toUpperCase()}</span></dd>
                
                <dt class="col-sm-4">Teams:</dt>
                <dd class="col-sm-8">${tournament.registered_teams || 0}/${tournament.max_teams}</dd>
                
                <dt class="col-sm-4">Registration Deadline:</dt>
                <dd class="col-sm-8">${formatDate(tournament.registration_deadline) || 'Not specified'}</dd>
                
                <dt class="col-sm-4">Eligibility:</dt>
                <dd class="col-sm-8">${tournament.eligibility || 'Open to all'}</dd>
                
                <dt class="col-sm-4">Prize Money:</dt>
                <dd class="col-sm-8">${tournament.prize_money || 'Not specified'}</dd>
            </dl>
            
            <h5 class="mt-3">Description</h5>
            <p>${tournament.description || 'No description available.'}</p>
        `;
        
        // Show registered teams if available
        if (tournament.teams && tournament.teams.length > 0) {
            let teamsHtml = '<ul class="list-group">';
            
            tournament.teams.forEach(team => {
                teamsHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${team.name}
                        <span class="badge bg-primary rounded-pill">${team.players ? team.players.length : 0} players</span>
                    </li>
                `;
            });
            
            teamsHtml += '</ul>';
            teamsListDiv.innerHTML = teamsHtml;
        } else {
            teamsListDiv.innerHTML = '<p>No teams registered yet.</p>';
        }
        
        // Configure the register button
        registerBtn.onclick = () => {
            modal.hide();
            
            // Find the team tournament dropdown and set it to this tournament
            const tournamentSelect = document.getElementById('team-tournament');
            if (tournamentSelect) {
                for (let i = 0; i < tournamentSelect.options.length; i++) {
                    if (tournamentSelect.options[i].value == tournament.id) {
                        tournamentSelect.selectedIndex = i;
                        tournamentSelect.dispatchEvent(new Event('change'));
                        break;
                    }
                }
                
                // Scroll to the registration form
                document.querySelector('.card.mb-4:nth-child(2)').scrollIntoView({ behavior: 'smooth' });
            }
        };
        
        // Disable the register button if tournament is not open for registration
        const isRegistrationOpen = tournament.status === 'upcoming' && 
            (!tournament.registration_deadline || new Date(tournament.registration_deadline) >= new Date()) &&
            (!tournament.max_teams || (tournament.registered_teams || 0) < tournament.max_teams);
            
        registerBtn.disabled = !isRegistrationOpen;
        
        if (!isRegistrationOpen) {
            let reason = "";
            if (tournament.status !== 'upcoming') {
                reason = "Tournament is no longer upcoming";
            } else if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
                reason = "Registration deadline has passed";
            } else if (tournament.max_teams && (tournament.registered_teams || 0) >= tournament.max_teams) {
                reason = "Maximum number of teams reached";
            }
            
            registerBtn.title = `Registration closed: ${reason}`;
        } else {
            registerBtn.title = "";
        }
        
        modal.show();
    }
    
    // Register for tournament - shortcut function to set selected tournament and scroll to form
    function registerForTournament(tournamentId) {
        const tournamentSelect = document.getElementById('team-tournament');
        if (tournamentSelect) {
            for (let i = 0; i < tournamentSelect.options.length; i++) {
                if (tournamentSelect.options[i].value == tournamentId) {
                    tournamentSelect.selectedIndex = i;
                    tournamentSelect.dispatchEvent(new Event('change'));
                    break;
                }
            }
            
            // Scroll to the registration form
            document.querySelector('.card.mb-4:nth-child(2)').scrollIntoView({ behavior: 'smooth' });
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
    
    // Helper function to format tournament format
    function formatTournamentFormat(format) {
        if (!format) return 'N/A';
        
        const formatMap = {
            'knockout': 'Knockout',
            'round-robin': 'Round Robin',
            'league': 'League',
            'groups': 'Groups + Knockout'
        };
        
        return formatMap[format] || format;
    }
    
    // Helper function to truncate text with ellipsis
    function truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
    
    // Helper function to get status badge class
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'upcoming':
                return 'bg-primary';
            case 'ongoing':
                return 'bg-success';
            case 'completed':
                return 'bg-secondary';
            default:
                return 'bg-info';
        }
    }
    
    // Helper function to get registration status class
    function getStatusClass(status) {
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
});