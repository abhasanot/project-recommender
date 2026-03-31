# backend/app.py (updated with fixed paths)
"""
Main Flask application for the Student Project Recommendation System
Integrates with the existing RecommenderSystem and matches the Figma design
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_session import Session
import os
import sys
import json
from datetime import timedelta
from functools import wraps

# Add the parent directory to path to import recommender system
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from recommender_system import RecommenderSystem
from database import Database
from models import User, StudentData, GroupData, StudentProfile

# Get base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

CORS(app, origins=['http://localhost:3000'], supports_credentials=True)
bcrypt = Bcrypt(app)
Session(app)

# Initialize database and recommender system
db = Database()
recommender_system = RecommenderSystem()

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Register a new user"""
    data = request.json
    
    required_fields = ['email', 'password', 'name', 'user_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    existing_user = db.get_user_by_email(data['email'])
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 409
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    
    user = User(
        email=data['email'],
        password_hash=hashed_password,
        name=data['name'],
        user_type=data['user_type'],
        student_id=data.get('student_id', ''),
        academic_year=data.get('academic_year', ''),
        major=data.get('major', 'Computer Science')
    )
    
    user_id = db.create_user(user)
    
    session['user_id'] = user_id
    session['user_email'] = user.email
    session['user_name'] = user.name
    session['user_type'] = user.user_type
    
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': user_id,
            'email': user.email,
            'name': user.name,
            'user_type': user.user_type
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user and create session"""
    data = request.json
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    user = db.get_user_by_email(data['email'])
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not bcrypt.check_password_hash(user['password_hash'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['user_name'] = user['name']
    session['user_type'] = user['user_type']
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'user_type': user['user_type']
        }
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    user = db.get_user_by_id(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['id'],
        'email': user['email'],
        'name': user['name'],
        'user_type': user['user_type'],
        'student_id': user.get('student_id', ''),
        'academic_year': user.get('academic_year', ''),
        'major': user.get('major', '')
    }), 200

# ==================== STUDENT PROFILE ROUTES ====================

@app.route('/api/profile', methods=['POST'])
@login_required
def save_profile():
    """Save student's academic profile"""
    data = request.json
    
    if 'courses' not in data or 'interests' not in data or 'applications' not in data or 'rdia' not in data:
        return jsonify({'error': 'Missing required data sections'}), 400
    
    for course in data.get('courses', []):
        if 'course_code' not in course or 'grade' not in course:
            return jsonify({'error': 'Each course must have course_code and grade'}), 400
    
    profile = StudentProfile(
        user_id=session['user_id'],
        required_courses=data.get('required_courses', []),
        elective_courses=data.get('elective_courses', []),
        courses=data.get('courses', []),
        interests=data.get('interests', []),
        applications=data.get('applications', []),
        rdia=data.get('rdia', ''),
        weighting_mode=data.get('weighting_mode', 'balanced')
    )
    
    db.save_profile(profile)
    
    return jsonify({'message': 'Profile saved successfully'}), 200

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    """Get student's saved profile"""
    profile = db.get_profile(session['user_id'])
    
    if not profile:
        return jsonify({
            'required_courses': [],
            'elective_courses': [],
            'courses': [],
            'interests': [],
            'applications': [],
            'rdia': '',
            'weighting_mode': 'balanced'
        }), 200
    
    return jsonify(profile), 200

@app.route('/api/profile/completion', methods=['GET'])
@login_required
def get_profile_completion():
    """Calculate profile completion percentage"""
    profile = db.get_profile(session['user_id'])
    
    if not profile:
        return jsonify({'completion': 0}), 200
    
    total_weight = 4
    completed = 0
    
    courses_count = len(profile.get('courses', []))
    if courses_count >= 5:
        completed += 1
    
    interests_count = len(profile.get('interests', []))
    if interests_count >= 2:
        completed += 1
    
    if profile.get('rdia'):
        completed += 1
    
    apps_count = len(profile.get('applications', []))
    if apps_count >= 1:
        completed += 1
    
    completion_percentage = (completed / total_weight) * 100
    
    return jsonify({'completion': completion_percentage}), 200

# ==================== GROUP ROUTES ====================

@app.route('/api/group/create', methods=['POST'])
@login_required
def create_group():
    """Create a new group"""
    data = request.json
    
    if not data.get('group_name'):
        return jsonify({'error': 'Group name required'}), 400
    
    import random
    import string
    group_id = 'GP-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    group = GroupData(
        group_id=group_id,
        group_name=data['group_name'],
        created_by=session['user_id'],
        members=[session['user_id']],
        is_finalized=False
    )
    
    db.create_group(group)
    
    return jsonify({
        'message': 'Group created successfully',
        'group': {
            'id': group_id,
            'name': data['group_name'],
            'members': [session['user_id']],
            'is_finalized': False
        }
    }), 201

@app.route('/api/group/join', methods=['POST'])
@login_required
def join_group():
    """Join an existing group"""
    data = request.json
    
    if not data.get('group_id'):
        return jsonify({'error': 'Group ID required'}), 400
    
    group = db.get_group(data['group_id'])
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    if group['is_finalized']:
        return jsonify({'error': 'Cannot join finalized group'}), 400
    
    if session['user_id'] in group['members']:
        return jsonify({'error': 'Already a member of this group'}), 400
    
    # Add user to members
    group['members'].append(session['user_id'])
    db.update_group_members(data['group_id'], group['members'])
    
    # Get updated group with member details
    updated_group = db.get_group(data['group_id'])
    
    # Get member details
    members = []
    for member_id in updated_group['members']:
        user = db.get_user_by_id(member_id)
        if user:
            members.append({
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': 'Leader' if member_id == updated_group['created_by'] else 'Member'
            })
    
    return jsonify({
        'message': 'Joined group successfully',
        'group': {
            'id': updated_group['group_id'],
            'name': updated_group['group_name'],
            'members': members,
            'is_finalized': updated_group['is_finalized']
        }
    }), 200
@app.route('/api/group', methods=['GET'])
@login_required
def get_group():
    """Get current user's group"""
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'has_group': False}), 200
    
    members = []
    for member_id in group['members']:
        user = db.get_user_by_id(member_id)
        if user:
            members.append({
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': 'Leader' if member_id == group['created_by'] else 'Member'
            })
    
    return jsonify({
        'has_group': True,
        'group': {
            'id': group['group_id'],
            'name': group['group_name'],
            'members': members,
            'is_finalized': group['is_finalized']
        }
    }), 200

@app.route('/api/group/finalize', methods=['POST'])
@login_required
def finalize_group():
    """Finalize the group"""
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'error': 'No group found'}), 404
    
    if len(group['members']) < 2:
        return jsonify({'error': 'Group must have at least 2 members to finalize'}), 400
    
    db.finalize_group(group['group_id'])
    
    group_recommendations = generate_group_recommendations(group['group_id'])
    if group_recommendations:
        db.save_group_recommendations(group['group_id'], group_recommendations)
    
    return jsonify({
        'message': 'Group finalized successfully',
        'recommendations_ready': True
    }), 200

@app.route('/api/group/leave', methods=['POST'])
@login_required
def leave_group():
    """Leave current group"""
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'error': 'No group found'}), 404
    
    if group['is_finalized']:
        return jsonify({'error': 'Cannot leave finalized group'}), 400
    
    group['members'].remove(session['user_id'])
    
    if len(group['members']) == 0:
        db.delete_group(group['group_id'])
    else:
        db.update_group_members(group['group_id'], group['members'])
    
    return jsonify({'message': 'Left group successfully'}), 200

# ==================== RECOMMENDATION ROUTES ====================

def generate_group_recommendations(group_id):
    """Generate recommendations for a group using the existing system"""
    group = db.get_group(group_id)
    if not group:
        return None
    
    members_profiles = []
    for member_id in group['members']:
        profile = db.get_profile(member_id)
        if profile:
            user = db.get_user_by_id(member_id)
            members_profiles.append({
                'student_id': member_id,
                'name': user['name'],
                'courses': profile.get('courses', []),
                'interests': profile.get('interests', []),
                'applications': profile.get('applications', []),
                'rdia': profile.get('rdia', '')
            })
    
    if not members_profiles:
        return None
    
    group_json = {
        'group_id': group_id,
        'weighting_mode': 'balanced',
        'students': members_profiles
    }
    
    try:
        results = recommender_system.recommend_all(group_json)
        return results
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        return None

@app.route('/api/recommendations', methods=['GET'])
@login_required
def get_recommendations():
    """Get group recommendations"""
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'error': 'No group found'}), 404
    
    if not group['is_finalized']:
        return jsonify({'error': 'Group not finalized yet'}), 400
    
    recommendations = db.get_group_recommendations(group['group_id'])
    
    if not recommendations:
        recommendations = generate_group_recommendations(group['group_id'])
        if recommendations:
            db.save_group_recommendations(group['group_id'], recommendations)
    
    if not recommendations:
        return jsonify({'error': 'Unable to generate recommendations'}), 500
    
    formatted_results = {
        'group_id': recommendations.get('group_id', group['group_id']),
        'group_profile': recommendations.get('group_profile', {}),
        'projects': recommendations.get('recommended_projects', []),
        'interests': recommendations.get('recommended_interests', []),
        'applications': recommendations.get('recommended_applications', []),
        'rdia': recommendations.get('recommended_rdia', [])
    }
    
    return jsonify(formatted_results), 200

# ==================== TRENDS AND ANALYTICS ====================

@app.route('/api/trends/domains', methods=['GET'])
def get_domain_trends():
    """Get domain trends - Coming soon"""
    return jsonify({'message': 'Coming soon', 'data': []}), 200

@app.route('/api/trends/methodologies', methods=['GET'])
def get_methodology_trends():
    """Get methodology trends - Coming soon"""
    return jsonify({'message': 'Coming soon', 'data': []}), 200

@app.route('/api/trends/tools', methods=['GET'])
def get_tool_trends():
    """Get popular tools trends - Coming soon"""
    return jsonify({'message': 'Coming soon', 'data': []}), 200

# ==================== PROJECT DATA ====================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get all past projects"""
    project_index_path = os.path.join(BASE_DIR, 'embeddings', 'project_index.json')
    
    try:
        with open(project_index_path, 'r', encoding='utf-8') as f:
            projects = json.load(f)
        
        formatted_projects = []
        for pid, project in projects.items():
            formatted_projects.append({
                'id': pid,
                'title': project.get('title', ''),
                'abstract': project.get('abstract', ''),
                'supervisor': project.get('supervisor_name', ''),
                'semester': project.get('semester', ''),
                'academic_year': project.get('academic_year', ''),
                'domain_of_interest': project.get('interest', []),
                'domain_of_application': project.get('application', []),
                'rdia_priority': project.get('rdia', []),
                'keywords': project.get('keywords', [])
            })
        
        return jsonify(formatted_projects), 200
    except FileNotFoundError:
        return jsonify({'message': 'Projects data not available yet. Run phase2_embed.py first.', 'projects': []}), 200
    except Exception as e:
        print(f"Error loading projects: {e}")
        return jsonify([]), 200

# ==================== SUPERVISOR DATA ====================

@app.route('/api/supervisors', methods=['GET'])
def get_supervisors():
    """Get supervisors from projects"""
    project_index_path = os.path.join(BASE_DIR, 'embeddings', 'project_index.json')
    
    try:
        with open(project_index_path, 'r', encoding='utf-8') as f:
            projects = json.load(f)
        
        supervisors = {}
        for pid, project in projects.items():
            supervisor_name = project.get('supervisor_name', '')
            if supervisor_name and supervisor_name not in supervisors:
                supervisors[supervisor_name] = {
                    'name': supervisor_name,
                    'projects': 1,
                    'domains': list(set(project.get('interest', []))),
                    'applications': list(set(project.get('application', [])))
                }
            elif supervisor_name in supervisors:
                supervisors[supervisor_name]['projects'] += 1
                supervisors[supervisor_name]['domains'].extend(project.get('interest', []))
        
        for sup in supervisors.values():
            sup['domains'] = list(set(sup['domains']))
            sup['applications'] = list(set(sup['applications']))
        
        return jsonify(list(supervisors.values())), 200
    except FileNotFoundError:
        return jsonify({'message': 'Supervisors data not available yet.', 'supervisors': []}), 200
    except Exception as e:
        print(f"Error loading supervisors: {e}")
        return jsonify([]), 200

# ==================== GROUP WEIGHT SETTINGS ====================

@app.route('/api/group/weights', methods=['GET'])
@login_required
def get_group_weights():
    """Get current weight settings for the group"""
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'error': 'No group found'}), 404
    
    # Get weights from database or use defaults
    weights = db.get_group_weights(group['group_id'])
    
    return jsonify({
        'weighting_mode': weights.get('weighting_mode', 'balanced'),
        'competency_weight': weights.get('competency_weight', 0.5),
        'interests_weight': weights.get('interests_weight', 0.5)
    }), 200

@app.route('/api/group/weights', methods=['PUT'])
@login_required
def update_group_weights():
    """Update weight settings for the group (leader only)"""
    data = request.json
    group = db.get_user_group(session['user_id'])
    
    if not group:
        return jsonify({'error': 'No group found'}), 404
    
    # Check if user is group leader
    if session['user_id'] != group['created_by']:
        return jsonify({'error': 'Only group leader can adjust weights'}), 403
    
    if not group['is_finalized']:
        return jsonify({'error': 'Group must be finalized before adjusting weights'}), 400
    
    weighting_mode = data.get('weighting_mode', 'balanced')
    
    if weighting_mode == 'courses_heavy':
        comp_w, int_w = 0.75, 0.25
    elif weighting_mode == 'interests_heavy':
        comp_w, int_w = 0.25, 0.75
    else:  # balanced
        comp_w, int_w = 0.50, 0.50
    
    # Save weights to database
    db.save_group_weights(group['group_id'], {
        'weighting_mode': weighting_mode,
        'competency_weight': comp_w,
        'interests_weight': int_w
    })
    
    # Regenerate recommendations with new weights
    group_json = build_group_json_from_db(group['group_id'])
    if group_json:
        results = recommender_system.recommend_all(group_json)
        db.save_group_recommendations(group['group_id'], results)
    
    return jsonify({
        'message': 'Weights updated successfully',
        'weighting_mode': weighting_mode,
        'competency_weight': comp_w,
        'interests_weight': int_w
    }), 200

def build_group_json_from_db(group_id: str) -> dict:
    """Build group JSON from database for recommendation generation"""
    group = db.get_group(group_id)
    if not group:
        return None
    
    members_profiles = []
    for member_id in group['members']:
        profile = db.get_profile(member_id)
        if profile:
            user = db.get_user_by_id(member_id)
            members_profiles.append({
                'student_id': member_id,
                'name': user['name'],
                'courses': profile.get('courses', []),
                'interests': profile.get('interests', []),
                'applications': profile.get('applications', []),
                'rdia': profile.get('rdia', '')
            })
    
    if not members_profiles:
        return None
    
    # Get group weights
    weights = db.get_group_weights(group_id)
    
    return {
        'group_id': group_id,
        'weighting_mode': weights.get('weighting_mode', 'balanced'),
        'students': members_profiles
    }

# ==================== DOMAIN DATA ====================

@app.route('/api/domains', methods=['GET'])
def get_domains():
    """Get all available domains for dropdowns"""
    try:
        data_dir = os.path.join(BASE_DIR, 'data')
        
        with open(os.path.join(data_dir, 'Interest_Domains.json'), 'r', encoding='utf-8') as f:
            interests = json.load(f)['DOMAIN_CATEGORIES']
        
        with open(os.path.join(data_dir, 'Application_Domains.json'), 'r', encoding='utf-8') as f:
            applications = json.load(f)
        
        with open(os.path.join(data_dir, 'RDIA.json'), 'r', encoding='utf-8') as f:
            rdia = json.load(f)['RDIA']
        
        with open(os.path.join(data_dir, 'courses.json'), 'r', encoding='utf-8') as f:
            courses_data = json.load(f)
            courses = [{'code': c['course_code'], 'title': c['course_title']} 
                      for c in courses_data['courses']]
        
        return jsonify({
            'interests': interests,
            'applications': applications,
            'rdia': rdia,
            'courses': courses
        }), 200
        
    except Exception as e:
        print(f"Error loading domain data: {e}")
        return jsonify({'error': 'Failed to load domain data'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)