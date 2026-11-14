from fastapi import FastAPI

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "hello"}
