from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    first_name: str
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    avatar: Optional[str] = None
    status: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PostBase(BaseModel):
    content_text: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None

class PostCreate(PostBase):
    pass

class CommentBase(BaseModel):
    content_text: str

class CommentCreate(CommentBase):
    pass

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: Optional[str] = None
    city: Optional[str] = None
    birth_date: Optional[str] = None

class FriendRequest(BaseModel):
    friend_id: int

class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    friend: User

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    content_text: str
    recipient_id: int

class MessageCreate(MessageBase):
    pass

class Message(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content_text: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True

class Dialog(BaseModel):
    user: User
    last_message: Message
    unread_count: int

class Comment(CommentBase):
    post_id: int
    created_at: datetime
    author: User

    class Config:
        from_attributes = True

class Post(PostBase):
    id: int
    user_id: int
    created_at: datetime
    likes_count: int
    comments_count: int
    shares_count: int
    views_count: int
    author: User
    comments: List[Comment] = []

    class Config:
        from_attributes = True
