document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const upcomingMatchesContainer = document.getElementById('upcoming-matches');
    const latestResultsContainer = document.getElementById('latest-results');
    const quickQueryButtons = document.querySelectorAll('.quick-query');
    const sportIcons = document.querySelectorAll('.sport-icon');
    
    // Load initial data
    loadUpcomingMatches();
    loadLatestResults();
    
    // Event listener for chat form submission
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message !== '') {
            addUserMessage(message);
            sendChatMessage(message);
            userInput.value = '';
        }
    });
    
    // Event listeners for quick query buttons
    quickQueryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const query = this.getAttribute('data-query');
            addUserMessage(query);
            sendChatMessage(query);
        });
    });
    
    // Event listeners for sport icons
    sportIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const sport = this.getAttribute('data-sport');
            const query = `Tell me about the ${sport} tournament`;
            addUserMessage(query);
            sendChatMessage(query);
        });
    });
    
    // Function to add user message to chat
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }
    
    // Function to add bot message to chat
    function addBotMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message bot-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${formatMessage(message)}</p>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }
    
    // Function to send chat message to API
    function sendChatMessage(message) {
        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot-message typing-indicator';
        typingIndicator.innerHTML = '<div class="message-content"><p>Typing...</p></div>';
        chatMessages.appendChild(typingIndicator);
        scrollToBottom();
        
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add the bot's response
            addBotMessage(data.response);
            
            // Reload upcoming matches and results
            loadUpcomingMatches();
            loadLatestResults();
        })
        .catch(error => {
            console.error('Error:', error);
            chatMessages.removeChild(typingIndicator);
            addBotMessage('Sorry, there was an error processing your request. Please try again later.');
        });
    }
    
    // Function to load upcoming matches
    function loadUpcomingMatches() {
        upcomingMatchesContainer.innerHTML = '<p class="loading">Loading matches...</p>';
        
        fetch('/api/matches')
        .then(response => response.json())
        .then(matches => {
            const upcomingMatches = matches
                .filter(match => match.status === 'upcoming')
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 3);
            
            if (upcomingMatches.length === 0) {
                upcomingMatchesContainer.innerHTML = '<p>No upcoming matches scheduled.</p>';
                return;
            }
            
            upcomingMatchesContainer.innerHTML = '';
            upcomingMatches.forEach(match => {
                const matchElement = document.createElement('div');
                matchElement.className = 'match-card';
                matchElement.innerHTML = `
                    <div class="teams">${match.team1} vs ${match.team2}<span class="sport-tag">${match.sport}</span></div>
                    <div class="details">📅 ${formatDate(match.date)} at ${match.time}</div>
                    <div class="details">📍 ${match.venue}</div>
                `;
                upcomingMatchesContainer.appendChild(matchElement);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            upcomingMatchesContainer.innerHTML = '<p>Error loading matches.</p>';
        });
    }
    
    // Function to load latest results
    function loadLatestResults() {
        latestResultsContainer.innerHTML = '<p class="loading">Loading results...</p>';
        
        fetch('/api/matches')
        .then(response => response.json())
        .then(matches => {
            const completedMatches = matches
                .filter(match => match.status === 'completed')
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Latest first
                .slice(0, 3);
            
            if (completedMatches.length === 0) {
                latestResultsContainer.innerHTML = '<p>No match results available yet.</p>';
                return;
            }
            
            latestResultsContainer.innerHTML = '';
            completedMatches.forEach(match => {
                const matchElement = document.createElement('div');
                matchElement.className = 'match-card';
                matchElement.innerHTML = `
                    <div class="teams">${match.team1} vs ${match.team2}<span class="sport-tag">${match.sport}</span></div>
                    <div class="details">🏆 Winner: ${match.winner}</div>
                    <div class="details">📊 Score: ${match.score || 'N/A'}</div>
                `;
                latestResultsContainer.appendChild(matchElement);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            latestResultsContainer.innerHTML = '<p>Error loading results.</p>';
        });
    }
    
    // Helper function to format message with line breaks
    function formatMessage(message) {
        return message.replace(/\n/g, '<br>');
    }
    
    // Helper function to scroll chat to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
