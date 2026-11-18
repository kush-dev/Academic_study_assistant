
import asyncio

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine


async def test_database_connection():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            value = result.scalar_one()

            print("DATABASE CONNECTION SUCCESSFUL")
            print(f"Test query result: {value}")

    except SQLAlchemyError as error:
        print("DATABASE CONNECTION FAILED")
        print(f"Error: {error}")

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_database_connection())
