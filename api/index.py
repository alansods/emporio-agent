"""FastAPI app served as a Vercel Python Function. Routes keep the /api prefix."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI(title="Empório da Música support agent", docs_url=None, redoc_url=None)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
