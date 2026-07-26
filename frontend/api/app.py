from fastapi import FastAPI, HTTPException
import time

app = FastAPI(title="Simulated Web API", description="A mock backend service demonstrating various endpoints.")

@app.get("/health")
def read_root():
    """
    Health check endpoint. Should always return 200 OK if the service is running.
    """
    return {"status": "ok", "service": "running"}

@app.get("/users/{user_id}")
def get_user(user_id: int):
    """
    Retrieves details for a specific user ID. Simulates fetching from a database.
    Returns 404 if the user is not found.
    """
    # Simulate database lookup latency
    time.sleep(0.05)

    mock_users = {
        1: {"id": 1, "username": "alice", "email": "alice@example.com"},
        2: {"id": 2, "username": "bob", "email": "bob@example.com"}
    }

    if user_id not in mock_users:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    return {"user": mock_users[user_id], "message": f"Details for user {user_id}"}

@app.post("/data/process")
def process_data(payload: dict):
    """
    Processes a complex data payload (e.g., an order or transaction).
    Simulates business logic and resource utilization.
    Requires 'item' and 'quantity' fields in the body.
    """
    if "item" not in payload or "quantity" not in payload:
        raise HTTPException(status_code=400, detail="Payload must include 'item' and 'quantity'.")

    try:
        # Simulate complex processing
        total_cost = float(payload.get("price", 1)) * int(payload["quantity"])
        return {
            "message": "Data processed successfully.",
            "processed_data": {
                "item": payload["item"],
                "quantity": int(payload["quantity"]),
                "total_cost": f"${total_cost:,.2f}"
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Item quantity and price must be valid numbers.")

# Note for execution: This file is designed to be run using `uvicorn app:app --reload`
# The type hints and structure are FastAPI best practices.