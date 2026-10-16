import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "orb.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Agents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        domain TEXT NOT NULL,
        status TEXT NOT NULL,
        tag_text TEXT NOT NULL,
        tag_color TEXT NOT NULL,
        description_icon TEXT NOT NULL,
        description_text TEXT NOT NULL,
        avatar_image TEXT NOT NULL,
        personality TEXT NOT NULL,
        color_theme TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
    )
    """)
    
    # Goals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        milestone TEXT NOT NULL,
        progress_pct INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        assigned_agent_id TEXT,
        category TEXT NOT NULL,
        target_value TEXT,
        current_value TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    # Memories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT,
        memory_type TEXT NOT NULL, -- 'per_agent' or 'shared'
        category TEXT NOT NULL,    -- 'preference', 'history', 'goal', 'note'
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # Chat messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        sender TEXT NOT NULL, -- 'user', 'agent', 'system'
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)
    
    # Wallet table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet (
        id INTEGER PRIMARY KEY,
        balance REAL NOT NULL,
        currency TEXT NOT NULL,
        last_transaction TEXT
    )
    """)
    
    # Talents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS talents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        level INTEGER NOT NULL,
        score INTEGER NOT NULL,
        badge_name TEXT
    )
    """)
    
    # Collections / Badges table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        badge_type TEXT NOT NULL,
        unlocked INTEGER NOT NULL DEFAULT 1
    )
    """)

    # Ensure is_active column on agents table exists
    cursor.execute("PRAGMA table_info(agents)")
    agent_cols = [col[1] for col in cursor.fetchall()]
    if "is_active" not in agent_cols:
        cursor.execute("ALTER TABLE agents ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")

    # Fin Personal Finance Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL DEFAULT 'cash',
        balance INTEGER NOT NULL DEFAULT 0,
        initial_balance INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'IDR',
        icon TEXT DEFAULT '👛',
        color TEXT DEFAULT '#10B981',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'expense' or 'income'
        icon TEXT DEFAULT '🏷️',
        color TEXT DEFAULT '#3B82F6',
        sort_order INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'expense', 'income', 'transfer'
        account_id INTEGER NOT NULL,
        destination_account_id INTEGER,
        category_id INTEGER,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        time TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        is_cleared INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES fin_accounts(id),
        FOREIGN KEY (destination_account_id) REFERENCES fin_accounts(id),
        FOREIGN KEY (category_id) REFERENCES fin_categories(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        period TEXT NOT NULL, -- YYYY-MM
        limit_amount INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(category_id, period),
        FOREIGN KEY (category_id) REFERENCES fin_categories(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_date TEXT NOT NULL, -- YYYY-MM-DD
        frequency TEXT DEFAULT 'monthly',
        is_paid INTEGER DEFAULT 0,
        category_id INTEGER,
        account_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES fin_categories(id),
        FOREIGN KEY (account_id) REFERENCES fin_accounts(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fin_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        current_amount INTEGER NOT NULL DEFAULT 0,
        target_date TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        icon TEXT DEFAULT '🎯',
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    seed_data(conn)
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM agents")
    if cursor.fetchone()[0] == 0:
        # Pre-seed 10 plush avatars
        agents = [
            (
                "muse",
                "Muse",
                "Routing & Logistics",
                "travel",
                "routing",
                "routing",
                "#374151",  # Dark pill
                "✈️",
                "Checking routes",
                "/assets/avatar_muse.png",
                "Thoughtful, analytical navigator. Optimizes transit, schedules, and flight itineraries.",
                "#F3E8D6",
                1
            ),
            (
                "fin",
                "Fin",
                "Finance & Budgeting",
                "finance",
                "active",
                "active",
                "#10B981",  # Green pill
                "👍",
                "Logging expenses",
                "/assets/avatar_fin.png",
                "Energetic, cheerful accountant plush. Tracks savings, receipts, cash flow, and goals.",
                "#E8F5E9",
                2
            ),
            (
                "chat",
                "Chat",
                "Customer & Team Comms",
                "communication",
                "listening",
                "listening",
                "#4F46E5",  # Blue/purple pill
                "💬",
                "Monitoring chats",
                "/assets/avatar_chat.png",
                "Fluffy empathetic listener. Synthesizes messages, drafts responses, handles team inquiries.",
                "#EEF2FF",
                3
            ),
            (
                "nova",
                "Nova",
                "Metrics & Analytics",
                "analytics",
                "active",
                "active",
                "#8B5CF6",
                "📊",
                "Crunching metrics",
                "/assets/avatar_nova.png",
                "Cozy intellectual wearing retro glasses. Loves graphs, conversion rates, and coffee.",
                "#F3E8FF",
                4
            ),
            (
                "blaze",
                "Blaze",
                "Growth & Marketing",
                "marketing",
                "active",
                "active",
                "#F97316",
                "🚀",
                "Drafting campaigns",
                "/assets/avatar_blaze.png",
                "High-octane fox wearing cyber visor. Drives social outreach, viral campaigns, and funnels.",
                "#FFEDD5",
                5
            ),
            (
                "sage",
                "Sage",
                "Strategy & Sprint Planning",
                "strategy",
                "idle",
                "idle",
                "#6B7280",
                "🌱",
                "Planning sprint",
                "/assets/avatar_sage.png",
                "Wise mint sprout with journal. Balances priorities, roadmap deadlines, and team energy.",
                "#E6FFFA",
                6
            ),
            (
                "spark",
                "Spark",
                "UI & Experience Design",
                "design",
                "listening",
                "listening",
                "#F59E0B",
                "✨",
                "Designing wireframes",
                "/assets/avatar_spark.png",
                "Playful chick with digital antenna stylus. Crafts bento layouts, micro-animations, design tokens.",
                "#FEF3C7",
                7
            ),
            (
                "echo",
                "Echo",
                "Audio & Podcasting",
                "media",
                "routing",
                "routing",
                "#0EA5E9",
                "🎙️",
                "Syncing team audio",
                "/assets/avatar_echo.png",
                "Sky-blue sound bubble. Transcribes audio, records meeting recaps, broadcasts updates.",
                "#E0F2FE",
                8
            ),
            (
                "pixel",
                "Pixel",
                "3D & Visual Assets",
                "creative",
                "active",
                "active",
                "#EC4899",
                "🎨",
                "Rendering 3D bento",
                "/assets/avatar_pixel.png",
                "Pink VR bunny. Renders plush textures, generates icons, builds visual interfaces.",
                "#FCE7F3",
                9
            ),
            (
                "atlas",
                "Atlas",
                "Global Compliance & Ops",
                "operations",
                "idle",
                "idle",
                "#64748B",
                "🌐",
                "Global sync standby",
                "/assets/avatar_atlas.png",
                "Scholarly owl with monocle. Monitors international regulations, timezones, enterprise logistics.",
                "#F1F5F9",
                10
            )
        ]
        
        cursor.executemany("""
        INSERT INTO agents (id, name, role, domain, status, tag_text, tag_color, description_icon, description_text, avatar_image, personality, color_theme, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, agents)

    # Seed Goals matching reference image & example ("Save Rp 1 juta this month", "Turn one outside sale...")
    cursor.execute("SELECT COUNT(*) FROM goals")
    if cursor.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        goals = [
            (
                "Turn one outside sale...",
                "Turn a read reply into a real ask",
                65,
                0,
                "fin",
                "Sales & Revenue",
                "1 Outside Sale",
                "0.65 Progress",
                now
            ),
            (
                "Save Rp 1 juta this month",
                "Automate weekly transfer of Rp 250k into reserve vault",
                75,
                0,
                "fin",
                "Personal Savings",
                "Rp 1.000.000",
                "Rp 750.000",
                now
            ),
            (
                "Ship Orb Handheld Dashboard v1.0",
                "Finalize plush avatars and dynamic lighting shaders",
                90,
                0,
                "spark",
                "Product Engineering",
                "Version 1.0",
                "Release Candidate",
                now
            )
        ]
        cursor.executemany("""
        INSERT INTO goals (title, milestone, progress_pct, completed, assigned_agent_id, category, target_value, current_value, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, goals)

    # Seed Memories (Per-Agent and Shared Crew Memory)
    cursor.execute("SELECT COUNT(*) FROM memories")
    if cursor.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        memories = [
            # Shared memory
            (
                None,
                "shared",
                "goal",
                "Global Crew Goal: Keep monthly operational burn under Rp 10M while expanding user base.",
                now
            ),
            (
                None,
                "shared",
                "preference",
                "Design Language: Soft edges, pastel tones, playful but professional plush aesthetics.",
                now
            ),
            # Fin memories
            (
                "fin",
                "per_agent",
                "goal",
                "Active Goal: Track 'Save Rp 1 juta this month' and alert user when expense exceeds Rp 50k.",
                now
            ),
            (
                "fin",
                "per_agent",
                "history",
                "Logged recent coffee receipt: Rp 35.000 at Bean Hub. Categorized under Refreshments.",
                now
            ),
            # Muse memories
            (
                "muse",
                "per_agent",
                "preference",
                "Prefers morning flights departing after 8:30 AM with window seating.",
                now
            ),
            # Chat memories
            (
                "chat",
                "per_agent",
                "preference",
                "Keep responses polite, cheerful, and under 3 concise sentences with clear action points.",
                now
            )
        ]
        cursor.executemany("""
        INSERT INTO memories (agent_id, memory_type, category, content, created_at)
        VALUES (?, ?, ?, ?, ?)
        """, memories)

    # Seed Wallet
    cursor.execute("SELECT COUNT(*) FROM wallet")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO wallet (id, balance, currency, last_transaction)
        VALUES (1, 1400.0, "USD", "Received dividend +$120.00")
        """)

    # Seed Talents (Social, Collab, Creativity)
    cursor.execute("SELECT COUNT(*) FROM talents")
    if cursor.fetchone()[0] == 0:
        talents = [
            ("Social", 8, 85, "Community Catalyst"),
            ("Collab", 9, 92, "Synergy Master"),
            ("Creativity", 10, 98, "Orb Visionary")
        ]
        cursor.executemany("""
        INSERT INTO talents (category, level, score, badge_name)
        VALUES (?, ?, ?, ?)
        """, talents)

    # Seed Collections / Badges
    cursor.execute("SELECT COUNT(*) FROM collections")
    if cursor.fetchone()[0] == 0:
        badges = [
            ("achiever_star", "Achiever Star", "Awarded for completing 5 daily milestones in sequence", "ribbon_star", 1),
            ("celestial_spark", "Celestial Spark", "Awarded for unlocking shared crew synergy across 3 domains", "medal_spark", 1),
            ("vault_keeper", "Vault Keeper", "Awarded for hitting monthly savings milestone", "vault", 1),
            ("speed_demon", "Speed Demon", "Zero latency response time for routing requests", "speed", 0)
        ]
        cursor.executemany("""
        INSERT INTO collections (badge_id, title, description, badge_type, unlocked)
        VALUES (?, ?, ?, ?, ?)
        """, badges)

    # -------------------------------------------------------------
    # Fin-First: Deactivate legacy agents, keep ONLY Fin active
    # -------------------------------------------------------------
    cursor.execute("UPDATE agents SET is_active = 0 WHERE id != 'fin'")
    cursor.execute("""
    UPDATE agents 
    SET is_active = 1,
        name = 'Fin',
        role = 'Personal Finance Specialist',
        domain = 'finance',
        status = 'active',
        tag_text = 'active',
        tag_color = '#10B981',
        description_icon = '💰',
        description_text = 'Workspace Keuangan Pribadi',
        avatar_image = './assets/avatar_fin.png',
        personality = 'Plush akuntan yang ceria dan teliti. Membantu mencatat transaksi, mengawal budget, dan mengoptimalkan arus kas harian.',
        sort_order = 1
    WHERE id = 'fin'
    """)

    # Seed Default Fin Categories if empty
    cursor.execute("SELECT COUNT(*) FROM fin_categories")
    if cursor.fetchone()[0] == 0:
        default_categories = [
            # Expense
            ("Makanan & Minuman", "expense", "🍔", "#EF4444", 1),
            ("Transportasi", "expense", "🚗", "#F59E0B", 2),
            ("Tagihan & Utilitas", "expense", "⚡", "#8B5CF6", 3),
            ("Belanja Kebutuhan", "expense", "🛒", "#3B82F6", 4),
            ("Hiburan & Santai", "expense", "🎮", "#EC4899", 5),
            ("Kesehatan", "expense", "💊", "#10B981", 6),
            ("Pendidikan & Kerja", "expense", "📚", "#6366F1", 7),
            ("Lain-lain", "expense", "📦", "#6B7280", 8),
            # Income
            ("Gaji Pokok", "income", "💼", "#10B981", 1),
            ("Freelance & Bisnis", "income", "💻", "#06B6D4", 2),
            ("Investasi & Pasif", "income", "📈", "#84CC16", 3),
            ("Hadiah & Bonus", "income", "🎁", "#F59E0B", 4),
        ]
        cursor.executemany("""
        INSERT INTO fin_categories (name, type, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?)
        """, default_categories)

    # Seed Default Primary Accounts if empty
    cursor.execute("SELECT COUNT(*) FROM fin_accounts")
    if cursor.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        default_accounts = [
            ("Dompet Tunai", "cash", 0, 0, "IDR", "👛", "#10B981", 1, now, now),
            ("Rekening Bank Utama", "bank", 0, 0, "IDR", "🏦", "#3B82F6", 1, now, now),
            ("E-Wallet", "ewallet", 0, 0, "IDR", "📱", "#8B5CF6", 1, now, now),
        ]
        cursor.executemany("""
        INSERT INTO fin_accounts (name, account_type, balance, initial_balance, currency, icon, color, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_accounts)
        
    conn.commit()
