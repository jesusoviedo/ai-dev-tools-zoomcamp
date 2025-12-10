"""Background tasks for the application."""

import asyncio
from datetime import UTC, datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Session as SessionModel
from app.websocket import active_connections, room_last_activity


def cleanup_expired_sessions():
    """
    Clean up expired sessions from the database.
    
    This function should be called periodically (e.g., every hour)
    to remove expired sessions from the database.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(UTC)
        expired_count = db.query(SessionModel).filter(
            SessionModel.expires_at < now
        ).delete()
        db.commit()
        print(f"[Cleanup] Removed {expired_count} expired session(s)")
        return expired_count
    except Exception as e:
        db.rollback()
        print(f"[Cleanup] Error cleaning up expired sessions: {e}")
        raise
    finally:
        db.close()


def cleanup_inactive_rooms():
    """
    Clean up rooms that have been inactive for more than 5 minutes.
    
    This function removes sessions from the database if their room has no active
    WebSocket connections and has been inactive for more than 5 minutes.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(UTC)
        inactive_threshold = now - timedelta(minutes=5)
        
        # Find rooms that are empty and inactive
        inactive_room_ids = []
        for room_id, last_activity in list(room_last_activity.items()):
            # Check if room has no active connections
            if room_id not in active_connections or not active_connections[room_id]:
                # Check if room has been inactive for more than 5 minutes
                if last_activity < inactive_threshold:
                    inactive_room_ids.append(room_id)
        
        # Delete sessions for inactive rooms
        deleted_count = 0
        for room_id in inactive_room_ids:
            # Extract session_id from room_id (format: room-{session_id})
            if room_id.startswith('room-'):
                session_id = room_id.replace('room-', '')
                session = db.query(SessionModel).filter(
                    SessionModel.session_id == session_id
                ).first()
                if session:
                    db.delete(session)
                    deleted_count += 1
            
            # Clean up room tracking
            if room_id in room_last_activity:
                del room_last_activity[room_id]
        
        db.commit()
        if deleted_count > 0:
            print(f"[Cleanup] Removed {deleted_count} inactive room(s) (no users for 5+ minutes)")
        return deleted_count
    except Exception as e:
        db.rollback()
        print(f"[Cleanup] Error cleaning up inactive rooms: {e}")
        raise
    finally:
        db.close()


async def periodic_cleanup(interval_hours: int = 1):
    """
    Run periodic cleanup tasks.
    
    Args:
        interval_hours: Hours between cleanup runs (default: 1 hour)
    """
    while True:
        try:
            # Clean up expired sessions
            cleanup_expired_sessions()
            # Clean up inactive rooms (runs every cycle, but only deletes if inactive for 5+ minutes)
            cleanup_inactive_rooms()
        except Exception as e:
            print(f"[Cleanup] Error in periodic cleanup: {e}")
        
        # Wait for next cleanup cycle
        await asyncio.sleep(interval_hours * 3600)

