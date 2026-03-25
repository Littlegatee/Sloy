from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import timedelta
from typing import List, Dict
import models, schemas, auth
from database import engine, get_db
import os
import hashlib
import hmac
import urllib.parse
import shutil
import uuid
import json

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="SLOY API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except auth.JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) | (models.User.email == form_data.username)
    ).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        or_(models.User.username == user.username, models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/users/me/", response_model=schemas.User)
def update_user(user_update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/users/me/avatar", response_model=schemas.User)
def upload_avatar(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    file_ext = file.filename.split(".")[-1]
    file_name = f"avatar_{current_user.id}_{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.avatar = f"/uploads/{file_name}"
    db.commit()
    db.refresh(current_user)
    return current_user

# --- Friends Endpoints ---

@app.get("/friends/", response_model=List[schemas.FriendshipResponse])
def get_friends(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns accepted friends and pending requests sent TO the current user
    friendships = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.id, models.Friendship.status == "accepted"),
            models.Friendship.friend_id == current_user.id
        )
    ).all()
    
    # We need to swap user/friend in response if the current_user is the friend_id
    response_list = []
    for f in friendships:
        if f.friend_id == current_user.id:
            # Request was sent TO current_user
            response_list.append({
                "id": f.id,
                "user_id": current_user.id,
                "friend_id": f.user_id,
                "status": "pending_received" if f.status == "pending" else f.status,
                "friend": f.user
            })
        else:
            # Request was sent BY current_user
            response_list.append({
                "id": f.id,
                "user_id": f.user_id,
                "friend_id": f.friend_id,
                "status": f.status,
                "friend": f.friend
            })
            
    return response_list

@app.post("/friends/request", response_model=schemas.FriendshipResponse)
def send_friend_request(req: schemas.FriendRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
        
    target_user = db.query(models.User).filter(models.User.id == req.friend_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.id, models.Friendship.friend_id == req.friend_id),
            and_(models.Friendship.user_id == req.friend_id, models.Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Friendship already exists with status: {existing.status}")
        
    new_request = models.Friendship(user_id=current_user.id, friend_id=req.friend_id, status="pending")
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@app.post("/friends/{friendship_id}/accept")
def accept_friend_request(friendship_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(models.Friendship).filter(models.Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship request not found")
        
    if friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
        
    friendship.status = "accepted"
    db.commit()
    return {"status": "accepted"}

@app.delete("/friends/{friendship_id}")
def remove_friend(friendship_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(models.Friendship).filter(models.Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
        
    if friendship.user_id != current_user.id and friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this friendship")
        
    db.delete(friendship)
    db.commit()
    return {"status": "deleted"}

@app.get("/users/search", response_model=List[schemas.User])
def search_users(q: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(models.User).filter(
        models.User.id != current_user.id,
        or_(
            models.User.username.ilike(f"%{q}%"),
            models.User.first_name.ilike(f"%{q}%"),
            models.User.last_name.ilike(f"%{q}%")
        )
    ).limit(20).all()
    return users

# Post Endpoints
@app.get("/posts/", response_model=List[schemas.Post])
def read_posts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@app.post("/posts/", response_model=schemas.Post)
def create_post(
    content_text: str = Form(...),
    file: UploadFile = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media_url = None
    media_type = None
    
    if file:
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        media_url = f"/uploads/{file_name}"
        media_type = "image" if file.content_type.startswith("image/") else "video" if file.content_type.startswith("video/") else "file"

    db_post = models.Post(
        content_text=content_text,
        media_url=media_url,
        media_type=media_type,
        user_id=current_user.id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@app.post("/posts/{post_id}/like")
def toggle_like(post_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    like = db.query(models.Like).filter(
        models.Like.post_id == post_id, 
        models.Like.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        post.likes_count -= 1
        db.commit()
        return {"status": "unliked", "likes_count": post.likes_count}
    else:
        new_like = models.Like(post_id=post_id, user_id=current_user.id)
        db.add(new_like)
        post.likes_count += 1
        db.commit()
        return {"status": "liked", "likes_count": post.likes_count}

@app.post("/posts/{post_id}/comments", response_model=schemas.Comment)
def create_comment(post_id: int, comment: schemas.CommentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    db_comment = models.Comment(
        content_text=comment.content_text,
        post_id=post_id,
        user_id=current_user.id
    )
    db.add(db_comment)
    post.comments_count += 1
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.get("/posts/{post_id}/comments", response_model=List[schemas.Comment])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.post_id == post_id).order_by(models.Comment.created_at.desc()).all()
    return comments

# --- WebSockets for Messaging ---
class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(json.dumps(message))

manager = ConnectionManager()

async def get_user_from_token(token: str, db: Session):
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(models.User).filter(models.User.username == username).first()
        return user
    except auth.JWTError:
        return None

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await manager.connect(websocket, user.id)
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Save message to DB
            recipient_id = message_data.get("recipient_id")
            content_text = message_data.get("content_text")
            
            if recipient_id and content_text:
                new_message = models.Message(
                    sender_id=user.id,
                    recipient_id=recipient_id,
                    content_text=content_text
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                msg_payload = {
                    "type": "new_message",
                    "id": new_message.id,
                    "sender_id": user.id,
                    "recipient_id": recipient_id,
                    "content_text": content_text,
                    "created_at": new_message.created_at.isoformat(),
                    "is_read": False
                }
                
                # Send back to sender (for confirmation)
                await manager.send_personal_message(msg_payload, user.id)
                # Send to recipient if online
                await manager.send_personal_message(msg_payload, recipient_id)
                
    except WebSocketDisconnect:
        manager.disconnect(user.id)
        
# --- Messaging Endpoints ---
from sqlalchemy import or_, and_, func

@app.get("/messages/dialogs", response_model=List[schemas.Dialog])
def get_dialogs(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get all messages involving current user
    messages = db.query(models.Message).filter(
        or_(models.Message.sender_id == current_user.id, models.Message.recipient_id == current_user.id)
    ).order_by(models.Message.created_at.desc()).all()
    
    dialogs = {}
    for msg in messages:
        # Determine the other user
        other_user_id = msg.recipient_id if msg.sender_id == current_user.id else msg.sender_id
        
        if other_user_id not in dialogs:
            other_user = db.query(models.User).filter(models.User.id == other_user_id).first()
            unread_count = db.query(models.Message).filter(
                and_(models.Message.sender_id == other_user_id, 
                     models.Message.recipient_id == current_user.id,
                     models.Message.is_read == False)
            ).count()
            
            dialogs[other_user_id] = {
                "user": other_user,
                "last_message": msg,
                "unread_count": unread_count
            }
            
    return list(dialogs.values())

@app.get("/messages/{user_id}", response_model=List[schemas.Message])
def get_messages(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Mark messages as read
    db.query(models.Message).filter(
        models.Message.sender_id == user_id,
        models.Message.recipient_id == current_user.id,
        models.Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id, models.Message.recipient_id == user_id),
            and_(models.Message.sender_id == user_id, models.Message.recipient_id == current_user.id)
        )
    ).order_by(models.Message.created_at.asc()).all()
    
    return messages