from flask import Flask, render_template, jsonify, request, redirect, url_for, g, send_from_directory
from datetime import datetime
import sqlite3
import os
from werkzeug.utils import secure_filename
import uuid
import subprocess
import json

app = Flask(__name__)
app.config['DATABASE'] = 'socks.db'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 1 << 24
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'webp'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db

def init_db():
    db = get_db()
    
    db.execute('''
        CREATE TABLE IF NOT EXISTS socks (
            id TEXT PRIMARY KEY,
            color TEXT NOT NULL,
            color_hex TEXT NOT NULL,
            style TEXT NOT NULL,
            pattern TEXT,
            material TEXT,
            size TEXT,
            brand TEXT,
            photo_filename TEXT,
            clean BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_washed TIMESTAMP,
            wear_count INTEGER DEFAULT 0
        )
    ''')
    
    db.execute('''
        CREATE TABLE IF NOT EXISTS wash_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sock_id TEXT NOT NULL,
            wash_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sock_id) REFERENCES socks (id)
        )
    ''')
    
    db.execute('CREATE INDEX IF NOT EXISTS idx_socks_clean ON socks(clean)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_socks_color ON socks(color)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_socks_style ON socks(style)')
    
    db.commit()

@app.before_request
def before_request():
    init_db()

@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()

@app.route('/')
def index():
    db = get_db()
    
    socks = db.execute('''
        SELECT * FROM socks 
        ORDER BY clean DESC
    ''').fetchall()
    
    socks_list = []
    for sock in socks:
        sock_dict = dict(sock)
        if sock_dict['created_at']:
            sock_dict['created_at_formatted'] = datetime.strptime(
                sock_dict['created_at'], '%Y-%m-%d %H:%M:%S'
            ).strftime('%d.%m.%Y')
        if sock_dict['last_washed']:
            sock_dict['last_washed_formatted'] = datetime.strptime(
                sock_dict['last_washed'], '%Y-%m-%d %H:%M:%S'
            ).strftime('%d.%m.%Y')
        
        if sock_dict['photo_filename']:
            sock_dict['photo_url'] = url_for('static', filename=f'uploads/{sock_dict["photo_filename"]}')
        else:
            sock_dict['photo_url'] = None
        
        sock_dict['data'] = json.dumps(sock_dict)
        socks_list.append(sock_dict)
    
    stats = db.execute('''
        SELECT 
            COUNT(*) as total,
            COALESCE(SUM(clean), 0) as clean,
            COUNT(*) - COALESCE(SUM(clean), 0) as dirty,
            AVG(wear_count) as avg_wear_count
        FROM socks
    ''').fetchone()
    
    current_time = datetime.now().strftime('%d.%m.%Y %H:%M')
    
    return render_template('index.html',
                         stats=dict(stats),
                         current_time=current_time)

@app.route('/api/load', methods=['GET'])
def load_socks():
    query = '%' + request.args['query'] + '%'
    offset = int(request.args['offset'])
    limit = int(request.args['limit'])
    
    priority = request.args['priority']
    order = {
        'clean': 'clean DESC',
        'dirty': 'clean ASC',
        'frequent': 'wear_count DESC'
    }[priority]
    print(query)

    db = get_db()
    socks = db.execute(f'''
        SELECT * FROM socks
        WHERE color LIKE ? OR style LIKE ? OR brand LIKE ? OR ? == "%%"
        ORDER BY {order}, created_at DESC
        LIMIT ? OFFSET ?
    ''', (query, query, query, query, limit, offset)).fetchall()
    
    socks_list = []
    for sock in socks:
        sock_dict = dict(sock)
        if sock_dict['created_at']:
            sock_dict['created_at_formatted'] = datetime.strptime(
                sock_dict['created_at'], '%Y-%m-%d %H:%M:%S'
            ).strftime('%d.%m.%Y')
        if sock_dict['last_washed']:
            sock_dict['last_washed_formatted'] = datetime.strptime(
                sock_dict['last_washed'], '%Y-%m-%d %H:%M:%S'
            ).strftime('%d.%m.%Y')
        
        if sock_dict['photo_filename']:
            sock_dict['photo_url'] = url_for('static', filename=f'uploads/{sock_dict["photo_filename"]}')
        else:
            sock_dict['photo_url'] = None
        
        sock_dict['data'] = json.dumps(sock_dict)
        socks_list.append(sock_dict)
    
    return jsonify(socks_list)


@app.route('/add', methods=['POST'])
def add_sock():
    try:
        color_name = request.form.get('color')
        color_hex = request.form.get('color_hex')
        style = request.form.get('style')
        pattern = request.form.get('pattern')
        material = request.form.get('material')
        size = request.form.get('size')
        brand = request.form.get('brand')
        notes = request.form.get('notes')
        
        photo_filename = None
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                photo_filename = unique_filename
        
        sock_id = str(uuid.uuid4())
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        db = get_db()
        db.execute('''
            INSERT INTO socks (id, color, color_hex, style, pattern, material, 
                              size, brand, photo_filename, clean, created_at, 
                              last_washed, wear_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
        ''', (sock_id, color_name, color_hex, style, pattern, material, 
              size, brand, photo_filename, current_time, current_time))
        db.commit()
        
        # Возвращаем успех
        return jsonify({
            'success': True,
            'message': 'Носок успешно добавлен!',
            'sock_id': sock_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Ошибка при добавлении: {str(e)}'
        }), 400

@app.route('/add', methods=['GET'])
def add_sock_page():
    db = get_db()
    
    color_options = [
        {'name': 'Черные', 'hex': '#2c3e50'},
        {'name': 'Белые', 'hex': '#ecf0f1'},
        {'name': 'Серые', 'hex': '#7f8c8d'},
        {'name': 'Синие', 'hex': '#3498db'},
        {'name': 'Зеленые', 'hex': '#27ae60'},
        {'name': 'Красные', 'hex': '#e74c3c'},
        {'name': 'Желтые', 'hex': '#f1c40f'},
        {'name': 'Фиолетовые', 'hex': '#9b59b6'},
        {'name': 'Розовые', 'hex': '#e84393'},
        {'name': 'Оранжевые', 'hex': '#e67e22'},
        {'name': 'Голубые', 'hex': '#00cec9'},
        {'name': 'Коричневые', 'hex': '#a1887f'},
        {'name': 'Бежевые', 'hex': '#f5deb3'},
        {'name': 'Бирюзовые', 'hex': '#1abc9c'},
        {'name': 'Мятные', 'hex': '#98ff98'},
    ]
    
    style_options = [
        'Спортивные', 'Повседневные', 'Домашние', 
        'Бизнес', 'Короткие', 'Термо', 'Вязаные',
        'Смешные', 'Праздничные'
    ]
    
    pattern_options = [
        'Однотонные', 'Полоска', 'Горошек', 'Клетка',
        'Геометрия', 'Принт', 'Логотип'
    ]
    
    material_options = [
        'Хлопок', 'Шерсть', 'Синтетика', 'Шелк', 'Бамбук', 'Лен',
    ]
    
    size_options = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    
    brand_options = [
        'Nike', 'Puma', 'Reebok', 'Uniqlo', 'H&M', 'Wilson', 'Funny Socks', 'Unknown'
    ]
    
    return render_template('add_sock.html',
                         color_options=color_options,
                         style_options=style_options,
                         pattern_options=pattern_options,
                         material_options=material_options,
                         size_options=size_options,
                         brand_options=brand_options)

@app.route('/toggle_clean/<string:sock_id>', methods=['POST'])
def toggle_clean(sock_id):
    try:
        db = get_db()
        
        sock = db.execute('SELECT clean, wear_count FROM socks WHERE id = ?', (sock_id,)).fetchone()
        
        if not sock:
            return jsonify({'success': False, 'message': 'Носок не найден'}), 404
        
        new_clean_status = not sock['clean']
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if new_clean_status:
            db.execute('''
                UPDATE socks 
                SET clean = 1, last_washed = ?, wear_count = wear_count + 1 
                WHERE id = ?
            ''', (current_time, sock_id))
            
            db.execute('INSERT INTO wash_history (sock_id) VALUES (?)', (sock_id,))
        else:
            db.execute('UPDATE socks SET clean = 0 WHERE id = ?', (sock_id,))
        
        db.commit()
        
        return jsonify({
            'success': True, 
            'sock_id': sock_id,
            'new_status': 'clean' if new_clean_status else 'dirty'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/delete_sock/<string:sock_id>', methods=['DELETE'])
def delete_sock(sock_id):
    try:
        db = get_db()
        
        sock = db.execute('SELECT photo_filename FROM socks WHERE id = ?', (sock_id,)).fetchone()
        
        if sock and sock['photo_filename']:
            photo_path = os.path.join(app.config['UPLOAD_FOLDER'], sock['photo_filename'])
            if os.path.exists(photo_path):
                os.remove(photo_path)
        
        db.execute('DELETE FROM socks WHERE id = ?', (sock_id,))
        db.execute('DELETE FROM wash_history WHERE sock_id = ?', (sock_id,))
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Носок успешно удален'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/stats')
def get_stats():
    db = get_db()
    
    stats = db.execute('''
        SELECT 
            COUNT(*) as total,
            COALESCE(SUM(clean), 0) as clean,
            COUNT(*) - COALESCE(SUM(clean), 0) as dirty,
            COUNT(DISTINCT color) as colors_count,
            COUNT(DISTINCT style) as styles_count,
            SUM(wear_count) as total_wears,
            AVG(wear_count) as avg_wear_count
        FROM socks
    ''').fetchone()
    
    color_stats = db.execute('''
        SELECT color, color_hex, COUNT(*) as count,
               COALESCE(SUM(clean), 0) as clean_count
        FROM socks
        GROUP BY color, color_hex
        ORDER BY count DESC
    ''').fetchall()
    
    style_stats = db.execute('''
        SELECT style, COUNT(*) as count
        FROM socks
        GROUP BY style
        ORDER BY count DESC
    ''').fetchall()
    
    return jsonify({
        'success': True,
        'stats': dict(stats),
        'color_stats': [dict(row) for row in color_stats],
        'style_stats': [dict(row) for row in style_stats]
    })

@app.route('/api/wash_history/<string:sock_id>')
def get_wash_history(sock_id):
    db = get_db()
    
    history = db.execute('''
        SELECT wash_date 
        FROM wash_history 
        WHERE sock_id = ? 
        ORDER BY wash_date DESC
    ''', (sock_id,)).fetchall()
    
    return jsonify({
        'success': True,
        'history': [dict(row) for row in history]
    })

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename.split('.js')[0] + '.js')

if __name__ == '__main__':
    subprocess.run(["npm", "run", "build"])
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', debug=True)