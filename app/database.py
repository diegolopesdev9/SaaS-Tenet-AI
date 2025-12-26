
"""Database connection and health check utilities."""
from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    
    Returns:
        Configured Supabase client
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def health_check() -> bool:
    """
    Check database connection health.
    
    Returns:
        True if database is accessible, False otherwise
    """
    try:
        client = get_supabase_client()
        # Simple query to test connection
        result = client.table('tenets').select('id').limit(1).execute()
        return True
    except Exception as e:
        print(f"Database health check failed: {e}")
        return False
