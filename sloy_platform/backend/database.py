import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'config', '.env'))

# Define base directory (sloy_platform)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Default to sqlite:///./database/sloy.db if not specified
default_db_url = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'sloy.db')}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)

# Create database directory if it doesn't exist
if SQLALCHEMY_DATABASE_URL.startswith('sqlite:///'):
    db_file_path = SQLALCHEMY_DATABASE_URL.replace('sqlite:///', '')
    db_dir = os.path.dirname(db_file_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
