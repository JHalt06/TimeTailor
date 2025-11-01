from db.db_utils import *

# def rebuildTables():
#     exec_sql_file('db/tables.sql')
#     #add drops to the tables.sql file
    
def get_all_parts(part_type):
    valid_tables = ["movements","cases","dials","straps","hands","crowns"]
    if part_type not in valid_tables:
        raise ValueError(f"Invalid part type: {part_type}")
    
    sql = f"SELECT * FROM {part_type};"
    return exec_get_all(sql)

def get_parts_by_id(part_type, part_id):
    sql = f"SELECT * FROM {part_type} WHERE ID = %s;"
    return exec_get_one(sql, (part_id,))

def get_parts_by_model(part_type, part_model):
    sql = f"SELECT * FROM {part_type} WHERE model = %s;"
    return exec_get_one(sql, (part_model,))

def get_parts_by_brand(part_type, part_brand):
    sql = f"SELECT * FROM {part_type} WHERE brand = %s;"
    return exec_get_one(sql, (part_brand,))

def create_part(part_type): #Dynamically insert a new watch part

    sql = f"INSERT INTO {part_type} VALUES (%s)"


#----------------------------USER management----------------------------------------------
def create_user(google_id, email, display_name, avatar_url = None, bio = None):
    sql = """INSERT INTO users(google_id, email, display_name, avatar_url, bio)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING ID;
    """
    return exec_get_one(sql, (google_id, email, display_name, avatar_url, bio))

def get_user_by_email(user_email):
    sql = f"SELECT * FROM users WHERE users.email = %s"
    return exec_get_one(sql, (user_email,))

def get_user_by_display_name(user_display_name):
    sql = f"SELECT * FROM users WHERE users.display_name = %s"
    return exec_get_one(sql, (user_display_name,))

#-------------------------------Build management----------------------------------------

def create_build(user_id, movement_id, case_id, dial_id, strap_id, hand_id, crown_id, published = False):
    sql_total_price = """
        SELECT COALESCE(SUM(price), 0) FROM (
            SELECT price FROM movements WHERE ID = %s
            UNION ALL
            SELECT price FROM cases WHERE ID = %s
            UNION ALL
            SELECT price FROM dials WHERE ID = %s
            UNION ALL
            SELECT price FROM straps WHERE ID = %s
            UNION ALL
            SELECT price FROM hands WHERE ID = %s
            UNION ALL
            SELECT price FROM crowns WHERE ID = %s
        ) AS total;
    """
    total_price = exec_get_one(sql_total_price, (movement_id, case_id, dial_id, strap_id, hand_id, crown_id))[0]

    #After the calculated total price is found:
    sql_insert = """INSERT INTO builds (user_id, movements_id, cases_id, dials_id, straps_id, hands_id, crowns_id, total_price, published)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING ID;"""
    args = (user_id, movement_id, case_id, dial_id, strap_id, hand_id, crown_id, total_price, published)
    return exec_get_one(sql_insert, args)

def get_all_builds():
    sql = """"
    SELECT b.*, u.display_name, u.email
    FROM builds b
    LEFT JOIN users u ON b.user_id = u.ID;"""
    return exec_get_all(sql)

def get_user_builds(user_id): # Retrieve all builds for a specific user
    sql = """
    SELECT b.*,
        m.model AS movement_model,
        c.model AS case_model,
        d.model AS dial_model,
        s.model AS strap_model,
        h.model AS hand_model,
        cr.model AS crown_model
    FROM builds b 
        LEFT JOIN movements m ON b.movements_id = m.ID
        LEFT JOIN cases c ON b.cases_id = c.ID
        LEFT JOIN dials d ON b.dials_id = d.ID
        LEFT JOIN straps s ON b.straps_id = s.ID
        LEFT JOIN hands h ON b.hands_id = h.ID
        LEFT JOIN crowns cr ON b.crowns_id = cr.ID
    WHERE b.user_id = %s;
    """
    return exec_get_all(sql, (user_id,))

def update_build(build_, **updates):
    if not updates:
        return {"updated": False}
    



def delete_build(build_id):
    sql = """DELETE FROM builds WHERE ID = %s"""
    exec_commit(sql, (build_id,))
    return {"deleted" : True}

def publish_builds(build_id, published = True): #Modify or set a build's published status
    sql = "UPDATE builds SET published = %s WHERE ID = %s;"
    exec_commit(sql, (published, build_id))
    return {"updated": True, "published" : published}

def calculate_total_price(build_id): #Recalculate total price for a build.
    sql = """
        SELECT COALESCE(SUM(price), 0)
        FROM (
            SELECT price FROM movements WHERE ID IN (SELECT movements_id FROM builds WHERE ID = %s)
            UNION ALL
            SELECT price FROM cases WHERE ID IN (SELECT cases_id FROM builds WHERE ID = %s)
            UNION ALL
            SELECT price FROM dials WHERE ID IN (SELECT dials_id FROM builds WHERE ID = %s)
            UNION ALL
            SELECT price FROM straps WHERE ID IN (SELECT straps_id FROM builds WHERE ID = %s)
            UNION ALL
            SELECT price FROM hands WHERE ID IN (SELECT hands_id FROM builds WHERE ID = %s)
            UNION ALL
            SELECT price FROM crowns WHERE ID IN (SELECT crowns_id FROM builds WHERE ID = %s)
        ) AS total;
    """ #learned how to use UNION ALL!
    result = exec_get_one(sql, (build_id,) * 6)
    return result[0] if result else 0
    