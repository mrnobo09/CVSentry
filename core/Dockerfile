# Python Version
FROM python:3.13.7

# Set the working directory
WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOME=/tmp
ENV INSIGHTFACE_HOME=/tmp/insightface
ENV MPLCONFIGDIR=/tmp/matplotlib

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . . 

# Expose Django port
EXPOSE 8000

# Command to run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]    