from flask import Flask, render_template, jsonify, request, url_for, g, send_from_directory
from datetime import datetime
import pymysql
import os
from werkzeug.utils import secure_filename
import uuid
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
    db_url = os.environ.get('MYSQL_URL')
    print(os.environ)
    
    if db_url and db_url.startswith('mysql://'):
        from urllib.parse import urlparse
        url = urlparse(db_url)
        conn = pymysql.connect(
            host=url.hostname,
            user=url.username,
            password=url.password,
            database=url.path.lstrip('/'),
            port=url.port or 3306,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    else:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='user',
            password='123',
            database='sss',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    return conn

def init_db():
    with get_db().cursor() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS socks (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                color VARCHAR(10) NOT NULL,
                color_hex VARCHAR(7) NOT NULL,
                style VARCHAR(12) NOT NULL,
                pattern TEXT NOT NULL,
                material TEXT NOT NULL,
                size TEXT NOT NULL,
                brand TEXT NOT NULL,
                photo_filename TEXT,
                clean BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_washed TIMESTAMP,
                wear_count INTEGER DEFAULT 0
            )
        ''')

        db.execute('''
            CREATE TABLE IF NOT EXISTS wash_history (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                sock_id INTEGER NOT NULL,
                wash_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sock_id) REFERENCES socks (id)
            )
        ''')

@app.before_request
def before_request():
    init_db()

@app.teardown_appcontext
def close_db(error):
    if hasattr(g, 'db'):
        g.db.close()

@app.route('/')
def index():
    with get_db().cursor() as db:
        db.execute('''
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(clean), 0) as clean,
                COUNT(*) - COALESCE(SUM(clean), 0) as dirty,
                AVG(wear_count) as avg_wear_count
            FROM socks
        ''')
        stats = db.fetchone()
    
    current_time = datetime.now().strftime('%d.%m.%Y %H:%M')
    
    return render_template('index.html',
                         stats=dict(stats),
                         current_time=current_time)

@app.route('/api/load', methods=['GET'])
def load_socks():
    query = '%' + request.args['query'].lower() + '%'
    offset = int(request.args['offset'])
    limit = int(request.args['limit'])
    
    priority = request.args['priority']
    order = {
        'clean': 'clean DESC',
        'dirty': 'clean ASC',
        'frequent': 'wear_count DESC'
    }[priority]

    with get_db().cursor() as db:
        db.execute(f'''
            SELECT * FROM socks
            WHERE LOWER(color) LIKE %s OR LOWER(style) LIKE %s OR LOWER(brand) LIKE %s OR %s LIKE ''
            ORDER BY {order}, created_at DESC
            LIMIT %s OFFSET %s
        ''', (query, query, query, query, limit, offset))
        socks = db.fetchall()
    
    socks_list = []
    for sock in socks:
        sock_dict = dict(sock)

        sock_dict['created_at'] = str(sock_dict['created_at'])
        sock_dict['created_at_formatted'] = datetime.strptime(
            str(sock_dict['created_at']), '%Y-%m-%d %H:%M:%S'
        ).strftime('%d.%m.%Y')
        
        sock_dict['last_washed'] = str(sock_dict['last_washed'])
        sock_dict['last_washed_formatted'] = datetime.strptime(
            str(sock_dict['last_washed']), '%Y-%m-%d %H:%M:%S'
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
    color_name = request.form.get('color')
    color_hex = request.form.get('color_hex')
    style = request.form.get('style')
    pattern = request.form.get('pattern')
    material = request.form.get('material')
    size = request.form.get('size')
    brand = request.form.get('brand')
    
    photo_filename = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            photo_filename = unique_filename
    
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    with get_db().cursor() as db:
        db.execute('''
            INSERT INTO socks (color, color_hex, style, pattern, material, 
                            size, brand, photo_filename, clean, created_at, 
                            last_washed, wear_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s, 0)
        ''', (color_name, color_hex, style, pattern, material, 
            size, brand, photo_filename, current_time, current_time))
    
    return jsonify({
        'success': True,
        'message': 'Носок успешно добавлен!'
    })
    

@app.route('/add', methods=['GET'])
def add_sock_page():
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
    with get_db().cursor() as db:
        db.execute('SELECT clean, wear_count FROM socks WHERE id = %s', (sock_id,))
        sock = db.fetchone()
    
    if not sock:
        return jsonify({'success': False, 'message': 'Носок не найден'}), 404
    
    new_clean_status = not sock['clean']
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    with get_db().cursor() as db:
        if new_clean_status:
            db.execute('''
                UPDATE socks 
                SET clean = 1, last_washed = %s, wear_count = wear_count + 1 
                WHERE id = %s
            ''', (current_time, sock_id))
            
            db.execute('INSERT INTO wash_history (sock_id) VALUES (%s)', (sock_id,))
        else:
            db.execute('UPDATE socks SET clean = 0 WHERE id = %s', (sock_id,))
    
    return jsonify({
        'success': True, 
        'new_status': 'clean' if new_clean_status else 'dirty'
    })

@app.route('/delete_sock/<string:sock_id>', methods=['DELETE'])
def delete_sock(sock_id):
    with get_db().cursor() as db:
        db.execute('SELECT photo_filename FROM socks WHERE id = %s', (sock_id,))
        sock = db.fetchone()
    
    if sock and sock['photo_filename']:
        photo_path = os.path.join(app.config['UPLOAD_FOLDER'], sock['photo_filename'])
        if os.path.exists(photo_path):
            os.remove(photo_path)
    
    with get_db().cursor() as db:
        db.execute('DELETE FROM socks WHERE id = %s', (sock_id,))
        db.execute('DELETE FROM wash_history WHERE sock_id = %s', (sock_id,))
    
    return jsonify({
        'success': True,
        'message': 'Носок успешно удален'
    })

@app.route('/api/stats')
def get_stats():
    with get_db().cursor() as db:
        db.execute('''
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(clean), 0) as clean,
                COUNT(*) - COALESCE(SUM(clean), 0) as dirty,
                COUNT(DISTINCT color) as colors_count,
                COUNT(DISTINCT style) as styles_count,
                SUM(wear_count) as total_wears,
                AVG(wear_count) as avg_wear_count
            FROM socks
        ''')
        stats = db.fetchone()
        
        db.execute('''
            SELECT color, color_hex, COUNT(*) as count,
                COALESCE(SUM(clean), 0) as clean_count
            FROM socks
            GROUP BY color, color_hex
            ORDER BY count DESC
        ''')
        color_stats = db.fetchall()
        
        db.execute('''
            SELECT style, COUNT(*) as count
            FROM socks
            GROUP BY style
            ORDER BY count DESC
        ''')
        style_stats = db.fetchall()
    
    return jsonify({
        'success': True,
        'stats': dict(stats),
        'color_stats': [dict(row) for row in color_stats],
        'style_stats': [dict(row) for row in style_stats]
    })

@app.route('/api/wash_history/<string:sock_id>')
def get_wash_history(sock_id):
    with get_db().cursor() as db:
        db.execute('''
            SELECT wash_date 
            FROM wash_history 
            WHERE sock_id = %s 
            ORDER BY wash_date DESC
        ''', (sock_id,))
        history = db.fetchall()
    
    return jsonify({
        'success': True,
        'history': [dict(row) for row in history]
    })

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename.split('.js')[0] + '.js')

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(host='0.0.0.0', debug=True)