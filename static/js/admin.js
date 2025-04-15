document.addEventListener('DOMContentLoaded', function() {
    // Initialize the admin interface
    loadTournaments();
    loadMatches();
    loadTeams();
    loadRules();
    loadOrganizers();
    
    // Setup event listeners for forms
    setupFormEventListeners();
    
    // Setup status-dependent fields
    document.getElementById('match-status').addEventListener('change', toggleMatchResultFields);
    
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});

// Tournament Functions
function loadTournaments() {
    fetch('/api/tournaments')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('tournaments-table');
            const selectElement = document.getElementById('match-tournament');
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No tournaments found</td></tr>';
                selectElement.innerHTML = '<option value="">Select Tournament</option>';
                return;
            }
            
            tableBody.innerHTML = '';
            selectElement.innerHTML = '<option value="">Select Tournament</option>';
            
            data.forEach(tournament => {
                // Add row to table
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tournament.id}</td>
                    <td>${tournament.name}</td>
                    <td>${tournament.sport}</td>
                    <td>${tournament.start_date} to ${tournament.end_date}</td>
                    <td>${tournament.venue}</td>
                    <td><span class="badge ${getBadgeClass(tournament.status)}">${tournament.status}</span></td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewTournamentDetails(${tournament.id})" data-bs-toggle="tooltip" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTournament(${tournament.id})" data-bs-toggle="tooltip" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
                
                // Add option to select
                const option = document.createElement('option');
                option.value = tournament.id;
                option.textContent = `${tournament.name} (${tournament.sport})`;
                option.dataset.sport = tournament.sport;
                selectElement.appendChild(option);
            });
            
            // Reinitialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('tournaments-table').innerHTML = 
                '<tr><td colspan="7" class="text-center text-danger">Error loading tournaments</td></tr>';
        });
}

// Match Functions
function loadMatches() {
    fetch('/api/matches')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('matches-table');
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No matches found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            
            data.forEach(match => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${match.id}</td>
                    <td>${match.team1} vs ${match.team2}</td>
                    <td>${match.sport}</td>
                    <td>${match.date} ${match.time}</td>
                    <td>${match.venue}</td>
                    <td><span class="badge ${getBadgeClass(match.status)}">${match.status}</span></td>
                    <td>${match.status === 'completed' ? `Winner: ${match.winner}<br>Score: ${match.score || 'N/A'}` : 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-warning" onclick="updateMatch(${match.id})" data-bs-toggle="tooltip" title="Update Result">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMatch(${match.id})" data-bs-toggle="tooltip" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Reinitialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('matches-table').innerHTML = 
                '<tr><td colspan="8" class="text-center text-danger">Error loading matches</td></tr>';
        });
}

function updateMatch(matchId) {
    fetch('/api/matches')
        .then(response => response.json())
        .then(matches => {
            const match = matches.find(m => m.id === matchId);
            if (!match) {
                alert('Match not found');
                return;
            }
            
            // Fill the update form
            document.getElementById('update-match-id').value = match.id;
            document.getElementById('update-match-teams').value = `${match.team1} vs ${match.team2}`;
            document.getElementById('update-match-status').value = match.status;
            document.getElementById('update-match-score').value = match.score || '';
            document.getElementById('update-match-winner').value = match.winner || '';
            
            // Show the modal
            new bootstrap.Modal(document.getElementById('updateMatchModal')).show();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading match details');
        });
}

// Team Functions
function loadTeams() {
    fetch('/api/tournaments')
        .then(response => response.json())
        .then(tournaments => {
            fetch('/api/matches')
                .then(response => response.json())
                .then(matches => {
                    // This simulates getting team info, which would come from a real API endpoint
                    // In a real app, use the /api/teams endpoint instead
                    const teamData = extractTeamData(tournaments, matches);
                    const tableBody = document.getElementById('teams-table');
                    
                    if (teamData.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No teams registered</td></tr>';
                        return;
                    }
                    
                    tableBody.innerHTML = '';
                    
                    teamData.forEach((team, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${team.name}</td>
                            <td>${team.captain || 'N/A'}</td>
                            <td>${team.sport}</td>
                            <td>${team.contact || 'N/A'}</td>
                            <td>${team.registration_date || 'N/A'}</td>
                            <td class="action-buttons">
                                <button class="btn btn-sm btn-outline-primary" onclick="viewTeamDetails(${index + 1})" data-bs-toggle="tooltip" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteTeam(${index + 1})" data-bs-toggle="tooltip" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                    
                    // Reinitialize tooltips
                    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
                    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                        return new bootstrap.Tooltip(tooltipTriggerEl)
                    });
                });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('teams-table').innerHTML = 
                '<tr><td colspan="7" class="text-center text-danger">Error loading teams</td></tr>';
        });
}

// Rules Functions
function loadRules() {
    fetch('/api/rules')
        .then(response => response.json())
        .then(data => {
            // Set values in the form
            document.getElementById('cricket-rules').value = data.Cricket || '';
            document.getElementById('football-rules').value = data.Football || '';
            document.getElementById('volleyball-rules').value = data.Volleyball || '';
            document.getElementById('badminton-rules').value = data.Badminton || '';
            document.getElementById('kabaddi-rules').value = data.Kabaddi || '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading rules data');
        });
}

// Organizer Functions
function loadOrganizers() {
    fetch('/api/organizers')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('organizers-table');
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No organizers found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            
            data.forEach((organizer, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${organizer.id || index + 1}</td>
                    <td>${organizer.name}</td>
                    <td>${organizer.role}</td>
                    <td>${organizer.email}</td>
                    <td>${organizer.phone}</td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteOrganizer(${organizer.id || index + 1})" data-bs-toggle="tooltip" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Reinitialize tooltips
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('organizers-table').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Error loading organizers</td></tr>';
        });
}

// Form handling
function setupFormEventListeners() {
    // Tournament form
    document.getElementById('add-tournament-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tournamentData = {
            name: document.getElementById('tournament-name').value,
            sport: document.getElementById('tournament-sport').value,
            start_date: document.getElementById('tournament-start-date').value,
            end_date: document.getElementById('tournament-end-date').value,
            venue: document.getElementById('tournament-venue').value,
            address: document.getElementById('tournament-address').value,
            status: document.getElementById('tournament-status').value,
            description: document.getElementById('tournament-description').value
        };
        
        fetch('/api/tournaments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tournamentData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Tournament added successfully!');
                bootstrap.Modal.getInstance(document.getElementById('addTournamentModal')).hide();
                loadTournaments();
                this.reset();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding tournament');
        });
    });
    
    // Match form
    document.getElementById('add-match-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const matchData = {
            tournament_id: document.getElementById('match-tournament').value,
            team1: document.getElementById('match-team1').value,
            team2: document.getElementById('match-team2').value,
            date: document.getElementById('match-date').value,
            time: document.getElementById('match-time').value,
            venue: document.getElementById('match-venue').value,
            sport: document.getElementById('match-sport').value,
            status: document.getElementById('match-status').value
        };
        
        // Add result fields if status is completed
        if (matchData.status === 'completed') {
            matchData.score = document.getElementById('match-score').value;
            matchData.winner = document.getElementById('match-winner').value;
        }
        
        fetch('/api/matches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(matchData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Match added successfully!');
                bootstrap.Modal.getInstance(document.getElementById('addMatchModal')).hide();
                loadMatches();
                this.reset();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding match');
        });
    });
    
    // Update match form
    document.getElementById('update-match-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const matchId = document.getElementById('update-match-id').value;
        const matchData = {
            status: document.getElementById('update-match-status').value,
            score: document.getElementById('update-match-score').value,
            winner: document.getElementById('update-match-winner').value
        };
        
        fetch(`/api/matches/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(matchData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Match updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('updateMatchModal')).hide();
                loadMatches();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error updating match');
        });
    });
    
    // Team form
    document.getElementById('add-team-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const playersText = document.getElementById('team-players').value;
        const playersList = playersText.split(',').map(player => player.trim()).filter(player => player);
        
        const teamData = {
            name: document.getElementById('team-name').value,
            captain: document.getElementById('team-captain').value,
            sport: document.getElementById('team-sport').value,
            contact: document.getElementById('team-contact').value,
            email: document.getElementById('team-email').value,
            players: playersList,
            type: 'team'
        };
        
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teamData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Team registered successfully!');
                bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
                loadTeams();
                this.reset();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error registering team');
        });
    });
    
    // Rules form
    document.getElementById('rules-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const rulesData = {
            Cricket: document.getElementById('cricket-rules').value,
            Football: document.getElementById('football-rules').value,
            Volleyball: document.getElementById('volleyball-rules').value,
            Badminton: document.getElementById('badminton-rules').value,
            Kabaddi: document.getElementById('kabaddi-rules').value
        };
        
        fetch('/api/rules', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rulesData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Rules updated successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error updating rules');
        });
    });
    
    // Organizer form
    document.getElementById('add-organizer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const organizerData = {
            name: document.getElementById('organizer-name').value,
            role: document.getElementById('organizer-role').value,
            email: document.getElementById('organizer-email').value,
            phone: document.getElementById('organizer-phone').value
        };
        
        fetch('/api/organizers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(organizerData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Organizer added successfully!');
                bootstrap.Modal.getInstance(document.getElementById('addOrganizerModal')).hide();
                loadOrganizers();
                this.reset();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding organizer');
        });
    });
}

// Helper functions
function getBadgeClass(status) {
    switch(status) {
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

function toggleMatchResultFields() {
    const status = document.getElementById('match-status').value;
    const resultFields = document.querySelectorAll('.match-result-fields');
    
    resultFields.forEach(field => {
        if (status === 'completed') {
            field.style.display = 'block';
        } else {
            field.style.display = 'none';
        }
    });
}

// Function to extract team data from tournaments and matches
// This is a placeholder for the real API endpoint
function extractTeamData(tournaments, matches) {
    const teams = [];
    const teamSet = new Set();
    
    // Extract teams from matches
    matches.forEach(match => {
        if (!teamSet.has(match.team1)) {
            teamSet.add(match.team1);
            teams.push({
                name: match.team1,
                sport: match.sport,
                registration_date: formatDate(new Date())
            });
        }
        
        if (!teamSet.has(match.team2)) {
            teamSet.add(match.team2);
            teams.push({
                name: match.team2,
                sport: match.sport,
                registration_date: formatDate(new Date())
            });
        }
    });
    
    return teams;
}

// Format date helper
function formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
}

// Placeholder for delete functions - these would be API calls in a real app
function deleteTournament(id) {
    if (confirm('Are you sure you want to delete this tournament?')) {
        alert('Tournament deleted (simulation only - no real deletion is happening in this demo)');
        loadTournaments();
    }
}

function deleteMatch(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        alert('Match deleted (simulation only - no real deletion is happening in this demo)');
        loadMatches();
    }
}

function deleteTeam(id) {
    if (confirm('Are you sure you want to delete this team?')) {
        alert('Team deleted (simulation only - no real deletion is happening in this demo)');
        loadTeams();
    }
}

function deleteOrganizer(id) {
    if (confirm('Are you sure you want to delete this organizer?')) {
        alert('Organizer deleted (simulation only - no real deletion is happening in this demo)');
        loadOrganizers();
    }
}

function viewTournamentDetails(id) {
    alert('View tournament details - Feature would show detailed information about the tournament');
}

function viewTeamDetails(id) {
    alert('View team details - Feature would show detailed information about the team and its players');
}
