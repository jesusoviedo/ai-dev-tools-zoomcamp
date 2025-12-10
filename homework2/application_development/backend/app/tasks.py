"""Background tasks for the application."""

import asyncio
from datetime import UTC, datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Session as SessionModel


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


async def periodic_cleanup(interval_hours: int = 1):
    """
    Run periodic cleanup task.
    
    Args:
        interval_hours: Hours between cleanup runs (default: 1 hour)
    """
    while True:
        try:
            cleanup_expired_sessions()
        except Exception as e:
            print(f"[Cleanup] Error in periodic cleanup: {e}")
        
        # Wait for next cleanup cycle
        await asyncio.sleep(interval_hours * 3600)

