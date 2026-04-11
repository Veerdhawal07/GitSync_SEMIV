from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.connection import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    github_username = Column(String, index=True)
    github_token = Column(String, nullable=True)
    llm_request_count = Column(Integer, default=0)

    repositories = relationship("Repository", back_populates="owner")
    collaborations = relationship("Collaborator", back_populates="user")

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    repo_name = Column(String, index=True)
    github_repo_id = Column(String, unique=True)
    clone_url = Column(String)
    webhook_status = Column(Boolean, default=False)
    auto_merge_enabled = Column(Boolean, default=True)

    owner = relationship("User", back_populates="repositories")
    collaborators = relationship("Collaborator", back_populates="repository")
    conflicts = relationship("Conflict", back_populates="repository")
    commits = relationship("Commit", back_populates="repository")

class Collaborator(Base):
    __tablename__ = "collaborators"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    repository_id = Column(Integer, ForeignKey("repositories.id"))

    user = relationship("User", back_populates="collaborations")
    repository = relationship("Repository", back_populates="collaborators")

class Commit(Base):
    __tablename__ = "commits"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    hash = Column(String, index=True)
    message = Column(Text)
    author = Column(String)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    
    repository = relationship("Repository", back_populates="commits")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=True)
    payload = Column(Text)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())

class MergeOperation(Base):
    __tablename__ = "merge_operations"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    source_branch = Column(String)
    target_branch = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())   


class Conflict(Base):
    __tablename__ = "conflicts"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    file_path = Column(String)
    conflict_diff = Column(Text)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    repository = relationship("Repository", back_populates="conflicts")
