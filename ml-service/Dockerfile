FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

# Copy application code
COPY . /app

# Set working directory
WORKDIR /app
# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# No additional Python dependencies required – the base image includes FastAPI, Uvicorn, and Pydantic.
# If you need extra packages, you can add them via pip install here.

# Expose the service port (default 8000 in the base image; we will run on 8001 via env var)
ENV MODULE_NAME=app.main
ENV APP_MODULE=app.main:app
ENV PORT=8001

# Start the server explicitly to avoid MODULE_NAME confusion
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
# No CMD needed – the default command will start uvicorn with app:app.
