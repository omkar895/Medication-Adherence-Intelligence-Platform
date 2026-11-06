import uvicorn

if __name__ == "__main__":
    print("Starting Medication Adherence Intelligence Platform (MAIP)...")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("Web Application:   http://127.0.0.1:8000/")
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
