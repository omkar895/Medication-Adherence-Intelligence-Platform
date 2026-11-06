import uvicorn

if __name__ == "__main__":
    print("Starting Medication Adherence Intelligence Platform (MAIP)...")
    print("API Documentation: http://localhost:8000/docs")
    print("Web Application:   http://localhost:8000/ (Use 'localhost' for Firebase Auth)")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

