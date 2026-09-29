from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

from pipeline import run_pipeline, embed_query


app = FastAPI(
    title="Izzima AI API",
    version="1.0.0",
)


class QueryRequest(BaseModel):
    query: str


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty image file",
            )

        result = run_pipeline(image_bytes)

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@app.post("/embed-query")
def create_query_embedding(request: QueryRequest):
    try:
        embedding = embed_query(
            request.query
        )

        return {
            "query": request.query,
            "embedding": embedding,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )