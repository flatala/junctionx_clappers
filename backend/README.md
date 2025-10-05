# Backend - FastAPI Application

Main PERUN backend, with MySQL database and Whisper integration.

## Features

- FastAPI web framework
- MySQL database with SQLAlchemy ORM
- Docker Compose for easy database setup
- Environment-based configuration

## Setup

### Prerequisites

- Python 3.8+
- Docker and Docker Compose (optional, for MySQL container)

### Installation

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### Database Setup

#### Using Docker Compose (Recommended)

Start the MySQL container:
```bash
docker-compose up -d
```

This will create a MySQL database with the following credentials:
- Database: `junctionx_db`
- User: `user`
- Password: `password`
- Port: `3306`


## Running the Application

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### API Endpoints

- `POST /users` - Create a new user
- `GET /users` - Get all users (with pagination)
- `GET /users/{user_id}` - Get a specific user
- `PUT /users/{user_id}` - Update a user
- `DELETE /users/{user_id}` - Delete a user

### Example Usage

Create a user:
```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

Get all users:
```bash
curl -X GET "http://localhost:8000/users"
```

## Development

The application uses:
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **PyMySQL**: Pure Python MySQL driver
- **Uvicorn**: ASGI server implementation

## License

MIT
