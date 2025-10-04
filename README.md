# junctionx_clappers

A full-stack application with FastAPI backend and React frontend.

## Project Structure

```
junctionx_clappers/
├── backend/               # FastAPI backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py       # FastAPI application and endpoints
│   │   ├── database.py   # Database configuration
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   └── test_user.py  # User endpoints
│   ├── .env.example      # Example environment variables
│   ├── docker-compose.yml # Docker Compose configuration
│   └── requirements.txt  # Python dependencies
├── frontend/             # React + Vite frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/          # Utility functions
│   │   ├── App.tsx       # Main App component
│   │   └── main.tsx      # Entry point
│   ├── package.json      # Node.js dependencies
│   └── vite.config.ts    # Vite configuration
└── README.md
```

## Features

### Backend
- FastAPI web framework
- MySQL database with SQLAlchemy ORM
- CRUD operations for User model
- Docker Compose for easy database setup
- Environment-based configuration

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui component library
- Modern, responsive UI

## Prerequisites

- Python 3.8+
- Node.js 18+
- Docker and Docker Compose (optional, for MySQL container)

## Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Start the MySQL container:
```bash
docker-compose up -d
```

6. Run the backend server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Documentation

Once the backend server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check

### Users
- `POST /users` - Create a new user
- `GET /users` - Get all users (with pagination)
- `GET /users/{user_id}` - Get a specific user
- `PUT /users/{user_id}` - Update a user
- `DELETE /users/{user_id}` - Delete a user

## Development

### Backend Stack
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **PyMySQL**: Pure Python MySQL driver
- **Uvicorn**: ASGI server implementation

### Frontend Stack
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component library

## License

MIT
