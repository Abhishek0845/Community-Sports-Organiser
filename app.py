import os
import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Setup base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Initialize database
db = SQLAlchemy(model_class=Base)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///tourney.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Create tables in the database (if they don't exist)
with app.app_context():
    import models
    db.create_all()

# Ensure data directory exists
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

# Initialize data files if they don't exist
data_files = {
    "tournaments": [],
    "teams": [],
    "matches": [],
    "rules": {
        "Cricket": "11 players per team, 20 overs per innings, LBW rules apply.",
        "Football": "11 players per team, 90 minutes match (two 45-minute halves), no offside rule.",
        "Volleyball": "6 players per team, best of 3 sets, rally point scoring system.",
        "Badminton": "Singles or doubles format, 21-point games, best of 3 games.",
        "Kabaddi": "7 players per team, 40-minute match (two 20-minute halves), raid and defense system."
    },
    "organizers": [
        {
            "name": "John Smith",
            "role": "Tournament Director",
            "email": "john.smith@example.com",
            "phone": "+1-555-123-4567"
        },
        {
            "name": "Mary Johnson",
            "role": "Registration Coordinator",
            "email": "mary.johnson@example.com",
            "phone": "+1-555-987-6543"
        }
    ]
}

# Create initial data files if they don't exist
for filename, initial_data in data_files.items():
    file_path = data_dir / f"{filename}.json"
    if not file_path.exists():
        with open(file_path, 'w') as f:
            json.dump(initial_data, f, indent=2)
        logger.info(f"Created initial data file: {file_path}")

# Ensure custom tournaments directory exists
custom_tournaments_dir = data_dir / "custom_tournaments"
custom_tournaments_dir.mkdir(exist_ok=True)

# Helper functions to read/write data
def read_data(filename):
    file_path = data_dir / f"{filename}.json"
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error reading {file_path}: {e}")
        return []

def write_data(filename, data):
    file_path = data_dir / f"{filename}.json"
    try:
        with open(file_path, 'w') as f:
            json.dump(data, indent=2, fp=f)
        return True
    except Exception as e:
        logger.error(f"Error writing to {file_path}: {e}")
        return False

# Intent classification
SPORTS = ["cricket", "football", "volleyball", "badminton", "kabaddi", "kho kho"]

def is_sports_related(query):
    """Check if the query is related to sports tournaments."""
    query = query.lower()
    
    # Check for exact sports names
    for sport in SPORTS:
        if sport in query:
            return True
    
    # Check for tournament-related terms
    tournament_terms = [
        "tournament", "match", "game", "team", "player", "register", 
        "schedule", "venue", "rule", "score", "winner", "organizer", 
        "contact", "time", "date", "registration", "eligibility", "prize",
        "competition", "league", "championship", "cup", "series", "contest"
    ]
    
    for term in tournament_terms:
        if term in query:
            return True
            
    return False

def classify_intent(query):
    """Classify the intent of the user query."""
    query = query.lower()
    
    # Check if it's off-topic first
    if not is_sports_related(query):
        return "off_topic"
    
    # Registration intent
    if any(word in query for word in ["register", "join", "signup", "sign up", "participate"]):
        return "registration"
    
    # Schedule intent
    if any(word in query for word in ["schedule", "when", "time", "date", "calendar", "upcoming"]):
        return "schedule"
    
    # Results intent
    if any(word in query for word in ["result", "score", "winner", "won", "lose", "lost", "win"]):
        return "results"
    
    # Rules intent
    if any(word in query for word in ["rule", "regulation", "how to play", "how do you play"]):
        return "rules"
    
    # Contact intent
    if any(word in query for word in ["contact", "organizer", "call", "email", "phone", "reach"]):
        return "contact"
    
    # Venue intent
    if any(word in query for word in ["where", "venue", "location", "place", "ground", "stadium"]):
        return "venue"
    
    # Fallback to generic
    return "general"

def get_sport_from_query(query):
    """Extract the sport from the query if mentioned."""
    query = query.lower()
    for sport in SPORTS:
        if sport in query:
            return sport.capitalize()
    
    # Check for sports not in our tournament list
    other_sports = ["tennis", "basketball", "hockey", "swimming", "golf", "boxing", 
                    "rugby", "baseball", "cycling", "gymnastics", "running", "martial arts"]
    for sport in other_sports:
        if sport in query:
            return sport.capitalize()
    
    return None

def is_sport_in_tournaments(sport):
    """Check if a sport is currently in our tournament list."""
    if not sport:
        return False
    
    tournaments = read_data("tournaments")
    return any(t.get("sport", "").lower() == sport.lower() for t in tournaments)

def handle_registration_intent(query):
    """Handle registration-related queries."""
    sport = get_sport_from_query(query)
    
    # If no sport is mentioned, ask which sport they want to register for
    if not sport:
        sports_list = ', '.join([s.capitalize() for s in SPORTS])
        return f"Which sport would you like to register for? We currently have tournaments for: {sports_list}."
    
    # Check if the sport has tournaments
    if not is_sport_in_tournaments(sport):
        return f"Sorry, we currently don't have any {sport} tournaments scheduled. Please check back later or register for our other tournaments: Cricket, Football, Volleyball, Badminton, Kabaddi, or Kho Kho."
    
    # If the sport is valid, proceed with registration
    if "team" in query.lower():
        response = f"To register your team for the {sport} tournament, please provide:\n"
        response += "1. Team name\n2. Captain's name\n3. Contact number\n4. Email address\n"
        response += "You can reply with this information or visit our registration desk at the venue."
        response += "\n\nOnce registered, your details will be forwarded to the concerned authority, and your match schedule will be visible in the upcoming matches section. You'll also be notified via your contact information."
    else:
        response = f"To register as a player for the {sport} tournament, please provide:\n"
        response += "1. Your full name\n2. Contact number\n3. Email address\n4. Age\n"
        response += "You can reply with this information or visit our registration desk at the venue."
        response += "\n\nOnce registered, your details will be forwarded to the concerned authority, and your match schedule will be visible in the upcoming matches section. You'll also be notified via your contact information."
    return response

def handle_schedule_intent(query):
    """Handle schedule-related queries."""
    sport = get_sport_from_query(query)
    matches = read_data("matches")
    tournaments = read_data("tournaments")
    
    if not matches or not tournaments:
        return f"Sorry, no {'matches' if not matches else 'tournaments'} are currently scheduled."
    
    if sport:
        # Filter matches for the specific sport
        sport_matches = [m for m in matches if m.get("sport") == sport]
        if not sport_matches:
            return f"There are no {sport} matches scheduled at the moment."
        
        # Get the next match for this sport
        upcoming_matches = [m for m in sport_matches if m.get("status") == "upcoming"]
        if upcoming_matches:
            next_match = min(upcoming_matches, key=lambda x: datetime.fromisoformat(x.get("date", "2099-12-31")))
            return f"Next {sport} match: {next_match.get('team1')} vs {next_match.get('team2')} on {next_match.get('date')} at {next_match.get('time')} at {next_match.get('venue')}."
        else:
            return f"All {sport} matches have been completed. Check the results tab for outcomes."
    else:
        # General schedule information
        response = "Here's the upcoming tournament schedule:\n"
        for tournament in tournaments:
            if tournament.get("status") == "upcoming":
                response += f"- {tournament.get('name')} ({tournament.get('sport')}): {tournament.get('start_date')} to {tournament.get('end_date')}\n"
        
        if response == "Here's the upcoming tournament schedule:\n":
            response = "No upcoming tournaments are scheduled at the moment."
            
        return response

def handle_results_intent(query):
    """Handle results-related queries."""
    sport = get_sport_from_query(query)
    matches = read_data("matches")
    
    if not matches:
        return "No match results are available yet."
    
    completed_matches = [m for m in matches if m.get("status") == "completed"]
    if not completed_matches:
        return "No matches have been completed yet."
    
    if sport:
        # Filter for specific sport
        sport_matches = [m for m in completed_matches if m.get("sport") == sport]
        if not sport_matches:
            return f"No {sport} matches have been completed yet."
        
        # Get the most recent match
        recent_match = max(sport_matches, key=lambda x: datetime.fromisoformat(x.get("date", "1900-01-01")))
        winner = recent_match.get("winner")
        score = recent_match.get("score", "No score available")
        return f"Recent {sport} result: {recent_match.get('team1')} vs {recent_match.get('team2')} - Winner: {winner}, Score: {score}."
    else:
        # General results
        response = "Recent match results:\n"
        for match in sorted(completed_matches, key=lambda x: datetime.fromisoformat(x.get("date", "1900-01-01")), reverse=True)[:3]:
            response += f"- {match.get('sport')}: {match.get('team1')} vs {match.get('team2')} - Winner: {match.get('winner')}, Score: {match.get('score', 'NA')}\n"
        return response

def handle_rules_intent(query):
    """Handle rules-related queries."""
    sport = get_sport_from_query(query)
    rules = read_data("rules")
    
    if isinstance(rules, list) and not rules:
        return "Sorry, the rules information is not available at the moment."
    
    if sport:
        if isinstance(rules, dict) and sport in rules:
            return f"{sport} Rules: {rules[sport]}"
        else:
            return f"Sorry, rules for {sport} are not available at the moment."
    else:
        response = "Which sport's rules would you like to know? We cover:\n"
        if isinstance(rules, dict):
            for sport in rules.keys():
                response += f"- {sport}\n"
        else:
            response += "Cricket, Football, Volleyball, Badminton, Kabaddi"
        return response

def handle_contact_intent(query):
    """Handle contact-related queries."""
    organizers = read_data("organizers")
    
    if not organizers:
        return "Sorry, organizer contact information is not available at the moment."
    
    response = "Tournament Organizer Contacts:\n"
    for organizer in organizers:
        response += f"- {organizer.get('name')} ({organizer.get('role')}): {organizer.get('email')} | {organizer.get('phone')}\n"
    return response

def handle_venue_intent(query):
    """Handle venue-related queries."""
    sport = get_sport_from_query(query)
    tournaments = read_data("tournaments")
    
    if not tournaments:
        return "Sorry, tournament venue information is not available at the moment."
    
    if sport:
        sport_tournaments = [t for t in tournaments if t.get("sport") == sport]
        if not sport_tournaments:
            return f"No {sport} tournaments are currently scheduled."
        
        tournament = sport_tournaments[0]  # Take the first one as an example
        return f"The {sport} tournament will be held at {tournament.get('venue')}. Address: {tournament.get('address', 'Contact organizers for exact location.')}."
    else:
        response = "Tournament Venues:\n"
        for tournament in tournaments:
            response += f"- {tournament.get('sport')}: {tournament.get('venue')}\n"
        return response

def handle_general_intent():
    """Handle general queries about the tournament."""
    response = "Welcome to the Community Sports Tournament! I can help you with:\n"
    response += "1. Registration information\n"
    response += "2. Tournament schedules\n"
    response += "3. Match results\n"
    response += "4. Sports rules\n"
    response += "5. Organizer contacts\n"
    response += "6. Venue details\n"
    response += "\nWhat would you like to know about?"
    return response

def generate_chatbot_response(query):
    """Generate a response to the user query."""
    # Check for sport-only queries first (like just "basketball" or "tennis")
    sport = get_sport_from_query(query)
    
    # If query is just a sport name
    if sport and len(query.strip().split()) <= 2:  # Just the sport name or "about sport"
        if is_sport_in_tournaments(sport):
            return f"We have {sport} tournaments scheduled. What would you like to know about {sport}? You can ask about schedules, rules, venue, or registration."
        else:
            return f"Sorry, we don't have any {sport} tournaments scheduled this year. We currently offer: Cricket, Football, Volleyball, Badminton, and Kabaddi tournaments."
    
    # Regular intent classification
    intent = classify_intent(query)
    
    # Handle off-topic queries
    if intent == "off_topic":
        return "I can only help with community sports tournament-related queries. Please ask about registrations, schedules, results, rules, or contact information for our tournaments."
    
    # Handle sport-specific but not in our tournaments
    if sport and not is_sport_in_tournaments(sport):
        if any(word in query.lower() for word in ["tournament", "match", "schedule", "when", "where"]):
            return f"Sorry, we don't have any {sport} tournaments scheduled this year. We currently offer: Cricket, Football, Volleyball, Badminton, and Kabaddi tournaments."
    
    intent_handlers = {
        "registration": handle_registration_intent,
        "schedule": handle_schedule_intent,
        "results": handle_results_intent,
        "rules": handle_rules_intent,
        "contact": handle_contact_intent,
        "venue": handle_venue_intent,
        "general": lambda _: handle_general_intent()
    }
    
    handler = intent_handlers.get(intent)
    if handler:
        return handler(query)
    else:
        return handle_general_intent()

# Routes
@app.route('/')
def index():
    """Render the main chatbot interface."""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Render the admin interface."""
    # In a production app, this would have proper authentication
    return render_template('admin.html')

@app.route('/admin-scheduler')
def admin_scheduler():
    """Render the admin tournament scheduler interface."""
    # In a production app, this would have proper authentication
    return render_template('admin-scheduler.html')

@app.route('/scheduler')
def scheduler():
    """Render the user tournament scheduler interface."""
    return render_template('scheduler.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """API endpoint for chatbot interactions."""
    data = request.json
    query = data.get('message', '')
    
    if not query:
        return jsonify({'error': 'No message provided'}), 400
    
    response = generate_chatbot_response(query)
    return jsonify({'response': response})

@app.route('/api/register', methods=['POST'])
def register():
    """API endpoint for team/player registration."""
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'contact', 'email', 'type']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    if data['type'] == 'team':
        # Add team to database
        team_id = None
        try:
            # Check if sport is valid
            if 'sport' in data and data['sport']:
                sport = models.Sport.query.filter_by(name=data['sport']).first()
                if not sport:
                    return jsonify({'error': f'Sport {data["sport"]} not found'}), 400
                
                # Check if players meet minimum requirements
                players_list = []
                if 'players' in data and data['players']:
                    if isinstance(data['players'], str):
                        players_list = [p.strip() for p in data['players'].split(',') if p.strip()]
                    elif isinstance(data['players'], list):
                        players_list = data['players']
                    
                    if len(players_list) < sport.min_players:
                        return jsonify({
                            'error': f'Team must have at least {sport.min_players} players for {data["sport"]}',
                            'min_players': sport.min_players,
                            'current_players': len(players_list)
                        }), 400
                
                # Check if team already exists
                existing_team = models.Team.query.filter_by(name=data['name']).first()
                if existing_team:
                    return jsonify({'error': 'Team already registered', 'team_id': existing_team.id}), 400
                
                # Create new team
                team = models.Team(
                    name=data['name'],
                    captain=data.get('captain', ''),
                    contact=data['contact'],
                    email=data['email'],
                    sport_id=sport.id if sport else None,
                    registration_date=datetime.now(),
                    approved=False  # Require admin approval
                )
                db.session.add(team)
                db.session.commit()
                team_id = team.id
                
                # Add players if provided
                for player_name in players_list:
                    player = models.Player(
                        name=player_name,
                        team_id=team.id
                    )
                    db.session.add(player)
                
                db.session.commit()
                
                # Register for tournament if specified
                if 'tournament_id' in data and data['tournament_id']:
                    tournament = models.Tournament.query.get(data['tournament_id'])
                    if tournament:
                        # Check if already registered
                        existing_reg = models.TournamentRegistration.query.filter_by(
                            tournament_id=tournament.id, 
                            team_id=team.id
                        ).first()
                        
                        if not existing_reg:
                            reg = models.TournamentRegistration(
                                tournament_id=tournament.id,
                                team_id=team.id,
                                registration_date=datetime.now(),
                                status='pending'
                            )
                            db.session.add(reg)
                            db.session.commit()
                
                return jsonify({
                    'success': True, 
                    'message': 'Team registered successfully', 
                    'team_id': team.id
                })
            else:
                return jsonify({'error': 'Sport is required for team registration'}), 400
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error registering team: {e}")
            # Continue to legacy JSON registration below
        
        # Legacy JSON-based registration (fallback)
        teams = read_data('teams')
        # Check if team already exists
        if any(team['name'] == data['name'] for team in teams):
            return jsonify({'error': 'Team already registered'}), 400
        
        # Add team
        team_data = {
            'id': len(teams) + 1,
            'name': data['name'],
            'captain': data.get('captain', ''),
            'contact': data['contact'],
            'email': data['email'],
            'sport': data.get('sport', ''),
            'players': data.get('players', []),
            'registration_date': datetime.now().isoformat()
        }
        teams.append(team_data)
        write_data('teams', teams)
        return jsonify({'success': True, 'message': 'Team registered successfully', 'team_id': team_data['id']})
    else:
        # TODO: Handle player registration if needed
        return jsonify({'error': 'Player registration not implemented yet'}), 501

@app.route('/api/tournaments', methods=['GET'])
def get_tournaments():
    """API endpoint to get all tournaments."""
    tournaments = read_data('tournaments')
    return jsonify(tournaments)

@app.route('/api/tournaments', methods=['POST'])
def add_tournament():
    """API endpoint to add a new tournament."""
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'sport', 'start_date', 'end_date', 'venue']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    tournaments = read_data('tournaments')
    tournament_data = {
        'id': len(tournaments) + 1,
        'name': data['name'],
        'sport': data['sport'],
        'start_date': data['start_date'],
        'end_date': data['end_date'],
        'venue': data['venue'],
        'address': data.get('address', ''),
        'status': data.get('status', 'upcoming'),
        'description': data.get('description', '')
    }
    tournaments.append(tournament_data)
    write_data('tournaments', tournaments)
    return jsonify({'success': True, 'message': 'Tournament added successfully', 'tournament_id': tournament_data['id']})

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """API endpoint to get all matches."""
    matches = read_data('matches')
    return jsonify(matches)

@app.route('/api/matches', methods=['POST'])
def add_match():
    """API endpoint to add a new match."""
    data = request.json
    
    # Validate required fields
    required_fields = ['tournament_id', 'team1', 'team2', 'date', 'time', 'venue', 'sport']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    matches = read_data('matches')
    match_data = {
        'id': len(matches) + 1,
        'tournament_id': data['tournament_id'],
        'team1': data['team1'],
        'team2': data['team2'],
        'date': data['date'],
        'time': data['time'],
        'venue': data['venue'],
        'sport': data['sport'],
        'status': data.get('status', 'upcoming'),
        'score': data.get('score', ''),
        'winner': data.get('winner', '')
    }
    matches.append(match_data)
    write_data('matches', matches)
    return jsonify({'success': True, 'message': 'Match added successfully', 'match_id': match_data['id']})

@app.route('/api/matches/<int:match_id>', methods=['PUT'])
def update_match(match_id):
    """API endpoint to update match details (especially results)."""
    data = request.json
    matches = read_data('matches')
    
    # Find the match
    for i, match in enumerate(matches):
        if match.get('id') == match_id:
            # Update match fields
            for key, value in data.items():
                matches[i][key] = value
            write_data('matches', matches)
            return jsonify({'success': True, 'message': 'Match updated successfully'})
    
    return jsonify({'error': f'Match with ID {match_id} not found'}), 404

@app.route('/api/rules', methods=['GET'])
def get_rules():
    """API endpoint to get sport rules."""
    rules = read_data('rules')
    return jsonify(rules)

@app.route('/api/rules', methods=['PUT'])
def update_rules():
    """API endpoint to update sport rules."""
    data = request.json
    rules = read_data('rules')
    
    # Update rules
    if isinstance(rules, dict):
        for sport, rule in data.items():
            rules[sport] = rule
    else:
        rules = data  # Replace completely if not a dict
        
    write_data('rules', rules)
    return jsonify({'success': True, 'message': 'Rules updated successfully'})

@app.route('/api/rules/add', methods=['POST'])
def add_game_rule():
    """API endpoint to add a new sport rule."""
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'rules', 'min_players']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    # Get existing rules
    rules = read_data('rules')
    if not isinstance(rules, dict):
        rules = {}
    
    # Check if sport already exists
    sport_name = data['name']
    if sport_name in rules:
        return jsonify({'error': f'Rules for {sport_name} already exist. Use the update endpoint instead.'}), 400
    
    # Add new sport rule
    rules[sport_name] = data['rules']
    
    # Save to database
    sport = None
    try:
        with app.app_context():
            # Check if sport already exists in database
            sport = models.Sport.query.filter_by(name=sport_name).first()
            if not sport:
                sport = models.Sport(
                    name=sport_name,
                    icon=data.get('icon', ''),
                    min_players=data.get('min_players', 1),
                    rules=data['rules']
                )
                db.session.add(sport)
                db.session.commit()
            else:
                sport.rules = data['rules']
                sport.min_players = data.get('min_players', 1)
                if 'icon' in data:
                    sport.icon = data['icon']
                db.session.commit()
    except Exception as e:
        logger.error(f"Error saving sport to database: {e}")
        # Continue to save to JSON even if database fails
    
    # Write to data file as well (legacy support)
    write_data('rules', rules)
    
    return jsonify({
        'success': True, 
        'message': f'Rules for {sport_name} added successfully',
        'sport_id': sport.id if sport else None
    })

@app.route('/api/organizers', methods=['GET'])
def get_organizers():
    """API endpoint to get organizer contact information."""
    organizers = read_data('organizers')
    return jsonify(organizers)

@app.route('/api/organizers', methods=['POST'])
def add_organizer():
    """API endpoint to add a new organizer."""
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'role', 'email', 'phone']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
    
    organizers = read_data('organizers')
    organizer_data = {
        'id': len(organizers) + 1,
        'name': data['name'],
        'role': data['role'],
        'email': data['email'],
        'phone': data['phone']
    }
    organizers.append(organizer_data)
    write_data('organizers', organizers)
    return jsonify({'success': True, 'message': 'Organizer added successfully', 'organizer_id': organizer_data['id']})

# Tournament Scheduler Functions
def generate_tournament_schedule(data):
    """Generate a schedule for a tournament based on input data."""
    try:
        # Extract data
        tournament_name = data.get('name', 'Custom Tournament')
        sport = data.get('sport', 'Generic')
        teams = data.get('teams', [])
        start_date = datetime.fromisoformat(data.get('start_date', datetime.now().isoformat()[:10]))
        days = int(data.get('days', 3))
        matches_per_day = int(data.get('matches_per_day', 3))
        venue = data.get('venue', 'Community Sports Center')
        
        # Need at least 2 teams to create a schedule
        if len(teams) < 2:
            return {"error": "At least 2 teams are required to create a schedule"}
        
        # Generate unique ID for this tournament
        tournament_id = f"{sport.lower()}-{int(datetime.now().timestamp())}"
        
        # Create tournament info
        tournament_info = {
            "id": tournament_id,
            "name": tournament_name,
            "sport": sport,
            "start_date": start_date.isoformat()[:10],
            "end_date": (start_date + timedelta(days=days-1)).isoformat()[:10],
            "venue": venue,
            "teams": teams,
            "prize_money": data.get('prize_money', ''),
            "eligibility": data.get('eligibility', ''),
            "registration_deadline": data.get('registration_deadline', ''),
            "rules": data.get('rules', ''),
            "created_at": datetime.now().isoformat()
        }
        
        # Generate matches based on scheduling algorithm
        all_matches = []
        match_id = 1
        
        # Simple round-robin algorithm
        if data.get('algorithm', 'round_robin') == 'round_robin':
            # Create all possible pairs of teams
            pairs = []
            for i in range(len(teams)):
                for j in range(i+1, len(teams)):
                    pairs.append((teams[i], teams[j]))
            
            # Schedule matches across available days
            current_date = start_date
            day_num = 1
            matches_today = 0
            
            for team1, team2 in pairs:
                # If we've reached max matches per day, move to next day
                if matches_today >= matches_per_day:
                    day_num += 1
                    matches_today = 0
                    current_date = start_date + timedelta(days=day_num-1)
                    
                    # If we've used all days, stop scheduling
                    if day_num > days:
                        break
                
                # Generate match time (9am to 5pm)
                hour = 9 + (matches_today * 8 // matches_per_day)
                match_time = f"{hour:02d}:00"
                
                match = {
                    "id": match_id,
                    "day": day_num,
                    "date": current_date.isoformat()[:10],
                    "time": match_time,
                    "team1": team1,
                    "team2": team2,
                    "venue": venue,
                    "status": "scheduled"
                }
                
                all_matches.append(match)
                match_id += 1
                matches_today += 1
        
        # Create the complete schedule
        schedule = {
            "tournament": tournament_info,
            "matches": all_matches
        }
        
        # Save schedule to file
        file_path = custom_tournaments_dir / f"{tournament_id}.json"
        with open(file_path, 'w') as f:
            json.dump(schedule, f, indent=2)
        
        return schedule
    except Exception as e:
        logger.error(f"Error generating tournament schedule: {e}")
        return {"error": str(e)}

# Tournament Scheduler Routes
@app.route('/scheduler', methods=['GET'])
def scheduler_page():
    """Render the tournament scheduler page."""
    return render_template('scheduler.html')
    
@app.route('/admin-scheduler', methods=['GET'])
def admin_scheduler_page():
    """Render the admin tournament scheduler page."""
    return render_template('admin-scheduler.html')

@app.route('/api/scheduler/tournaments', methods=['GET'])
def get_custom_tournaments():
    """Get all custom tournaments."""
    tournaments = []
    for file_path in custom_tournaments_dir.glob('*.json'):
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                if 'tournament' in data:
                    tournaments.append(data['tournament'])
        except Exception as e:
            logger.error(f"Error reading tournament file {file_path}: {e}")
    
    return jsonify(tournaments)

@app.route('/api/scheduler/tournaments/<tournament_id>', methods=['GET'])
def get_custom_tournament(tournament_id):
    """Get a specific custom tournament."""
    file_path = custom_tournaments_dir / f"{tournament_id}.json"
    
    if not file_path.exists():
        return jsonify({"error": "Tournament not found"}), 404
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error reading tournament file {file_path}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/teams/<int:team_id>', methods=['GET'])
def get_team_details(team_id):
    """API endpoint to get team details and registration status."""
    try:
        team = models.Team.query.get(team_id)
        if not team:
            return jsonify({"error": "Team not found"}), 404
        
        # Get players
        players = [{"id": p.id, "name": p.name, "position": p.position, "jersey_number": p.jersey_number} 
                  for p in team.players]
        
        # Get tournament registrations
        registrations = [
            {
                "id": reg.id,
                "tournament_id": reg.tournament_id,
                "tournament_name": reg.tournament.name if reg.tournament else "Unknown Tournament",
                "registration_date": reg.registration_date.isoformat(),
                "status": reg.status,
                "notes": reg.notes
            }
            for reg in team.tournament_registrations
        ]
        
        # Get sport
        sport = None
        if team.sport:
            sport = {
                "id": team.sport.id,
                "name": team.sport.name,
                "icon": team.sport.icon,
                "min_players": team.sport.min_players
            }
        
        team_data = {
            "id": team.id,
            "name": team.name,
            "captain": team.captain,
            "contact": team.contact,
            "email": team.email,
            "sport": sport,
            "registration_date": team.registration_date.isoformat(),
            "approved": team.approved,
            "players": players,
            "tournament_registrations": registrations
        }
        
        return jsonify(team_data)
    except Exception as e:
        logger.error(f"Error getting team details: {e}")
        
        # Fallback to JSON data
        teams = read_data('teams')
        for team in teams:
            if team.get('id') == team_id:
                return jsonify(team)
        
        return jsonify({"error": f"Team with ID {team_id} not found"}), 404

@app.route('/api/registrations', methods=['GET'])
def get_registrations():
    """API endpoint to get team registrations for tournaments."""
    try:
        tournament_id = request.args.get('tournament_id')
        
        registrations = []
        tournaments = []
        
        # Get tournament registrations from database
        query = models.TournamentRegistration.query
        
        if tournament_id:
            query = query.filter_by(tournament_id=tournament_id)
        
        reg_records = query.all()
        
        for reg in reg_records:
            if reg.team and reg.tournament:
                registration = {
                    'id': reg.id,
                    'tournament_id': reg.tournament_id,
                    'tournament_name': reg.tournament.name,
                    'team_id': reg.team_id,
                    'team_name': reg.team.name,
                    'captain': reg.team.captain,
                    'contact': reg.team.contact,
                    'email': reg.team.email,
                    'registration_date': reg.registration_date.isoformat(),
                    'status': reg.status,
                    'notes': reg.notes,
                    'players': [p.name for p in reg.team.players] if reg.team.players else []
                }
                registrations.append(registration)
        
        # Get all tournaments for filter
        all_tournaments = models.Tournament.query.all()
        tournaments = [
            {
                'id': t.id,
                'name': t.name,
                'sport': t.sport.name if t.sport else ''
            }
            for t in all_tournaments
        ]
        
        return jsonify({
            'success': True,
            'registrations': registrations,
            'tournaments': tournaments
        })
    except Exception as e:
        logger.error(f"Error getting registrations: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/registrations/approve', methods=['POST'])
def approve_registration():
    """API endpoint to approve a team registration for a tournament."""
    try:
        data = request.json
        registration_id = data.get('registration_id')
        notes = data.get('notes', '')
        
        if not registration_id:
            return jsonify({'error': 'Registration ID is required'}), 400
        
        # Get registration from database
        registration = models.TournamentRegistration.query.get(registration_id)
        
        if not registration:
            return jsonify({'error': 'Registration not found'}), 404
        
        # Update registration status
        registration.status = 'approved'
        registration.notes = notes
        
        # Also approve the team itself
        if registration.team:
            registration.team.approved = True
        
        db.session.commit()
        
        # Create notification
        notification = models.Notification(
            title=f"Team Registration Approved",
            message=f"Your team '{registration.team.name}' has been approved for the tournament '{registration.tournament.name}'.",
            type="success",
            related_to="registration",
            related_id=registration.id,
            is_read=False
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration approved successfully',
            'registration_id': registration.id
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error approving registration: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/registrations/reject', methods=['POST'])
def reject_registration():
    """API endpoint to reject a team registration for a tournament."""
    try:
        data = request.json
        registration_id = data.get('registration_id')
        reason = data.get('reason', 'No reason provided')
        
        if not registration_id:
            return jsonify({'error': 'Registration ID is required'}), 400
        
        # Get registration from database
        registration = models.TournamentRegistration.query.get(registration_id)
        
        if not registration:
            return jsonify({'error': 'Registration not found'}), 404
        
        # Update registration status
        registration.status = 'rejected'
        registration.notes = reason
        db.session.commit()
        
        # Create notification
        notification = models.Notification(
            title=f"Team Registration Rejected",
            message=f"Your team '{registration.team.name}' registration for the tournament '{registration.tournament.name}' has been rejected. Reason: {reason}",
            type="error",
            related_to="registration",
            related_id=registration.id,
            is_read=False
        )
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration rejected successfully',
            'registration_id': registration.id
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error rejecting registration: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """API endpoint to get notifications."""
    try:
        notifications = models.Notification.query.order_by(models.Notification.created_at.desc()).limit(10).all()
        
        notifications_data = [
            {
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type,
                'related_to': notification.related_to,
                'related_id': notification.related_id,
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat()
            }
            for notification in notifications
        ]
        
        return jsonify({
            'success': True,
            'notifications': notifications_data
        })
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/scheduler/tournaments', methods=['POST'])
def create_custom_tournament():
    """Create a new custom tournament with generated schedule."""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'sport', 'teams', 'start_date', 'days', 'venue']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        
        # Generate the tournament schedule
        schedule = generate_tournament_schedule(data)
        
        if "error" in schedule:
            return jsonify(schedule), 400
        
        return jsonify({
            "success": True, 
            "message": "Tournament schedule created successfully",
            "tournament_id": schedule["tournament"]["id"]
        })
    
    except Exception as e:
        logger.error(f"Error creating custom tournament: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
