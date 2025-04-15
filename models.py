from app import db
from datetime import datetime

class Sport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    icon = db.Column(db.String(100))
    min_players = db.Column(db.Integer, default=1)
    rules = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    tournaments = db.relationship('Tournament', backref='sport', lazy=True)
    teams = db.relationship('Team', backref='sport', lazy=True)

class Tournament(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sport_id = db.Column(db.Integer, db.ForeignKey('sport.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text)
    status = db.Column(db.String(50), default='upcoming')  # upcoming, ongoing, completed
    description = db.Column(db.Text)
    max_teams = db.Column(db.Integer, default=8)
    format = db.Column(db.String(50), default='knockout')  # knockout, round-robin, league, groups
    registration_deadline = db.Column(db.Date)
    eligibility = db.Column(db.Text)
    prize_money = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    matches = db.relationship('Match', backref='tournament', lazy=True)
    team_registrations = db.relationship('TournamentRegistration', backref='tournament', lazy=True)

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    captain = db.Column(db.String(100))
    contact = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    sport_id = db.Column(db.Integer, db.ForeignKey('sport.id'))
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    approved = db.Column(db.Boolean, default=False)
    
    players = db.relationship('Player', backref='team', lazy=True)
    tournament_registrations = db.relationship('TournamentRegistration', backref='team', lazy=True)
    
    # Virtual fields for matches
    home_matches = db.relationship('Match', foreign_keys='Match.team1_id', backref='team1', lazy=True)
    away_matches = db.relationship('Match', foreign_keys='Match.team2_id', backref='team2', lazy=True)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    age = db.Column(db.Integer)
    position = db.Column(db.String(100))
    jersey_number = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    team1_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    team2_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    venue = db.Column(db.String(200), nullable=False)
    sport_id = db.Column(db.Integer, db.ForeignKey('sport.id'), nullable=False)
    status = db.Column(db.String(50), default='upcoming')  # upcoming, ongoing, completed, cancelled
    score = db.Column(db.String(50))
    winner_id = db.Column(db.Integer, db.ForeignKey('team.id'))
    day = db.Column(db.Integer)  # Day number in tournament (1, 2, 3, ...)
    round = db.Column(db.String(50))  # quarter-final, semi-final, final, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    sport = db.relationship('Sport', backref='matches', lazy=True)
    winner = db.relationship('Team', foreign_keys=[winner_id], backref='won_matches', lazy=True)

class Organizer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class TournamentRegistration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournament.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='pending')  # pending, approved, rejected
    notes = db.Column(db.Text)
    
    __table_args__ = (db.UniqueConstraint('tournament_id', 'team_id', name='unique_team_tournament'),)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info')  # info, success, warning, error
    related_to = db.Column(db.String(50))  # tournament, team, match, etc.
    related_id = db.Column(db.Integer)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)