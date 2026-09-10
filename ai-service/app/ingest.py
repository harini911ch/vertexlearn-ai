import psycopg2
import requests


OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBEDDING_MODEL = "mxbai-embed-large"

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "vertexlearn",
    "password": "vertexlearn_dev",
    "dbname": "vertexlearn",
}


COURSE_ID = "783a94a8-c8de-4509-be90-109a84552ea0"
LECTURE_ID = "5c61bb40-4276-47dd-8432-c23c33140092"


def create_chunks(text: str, chunk_size: int = 300):
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end

    return chunks


def get_embedding(text: str):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": EMBEDDING_MODEL,
            "prompt": text,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()
    embedding = data["embedding"]

    if len(embedding) != 1024:
        raise ValueError(
            f"Expected 1024 dimensions, got {len(embedding)}"
        )

    return embedding


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT transcript
        FROM lectures
        WHERE id = %s
        """,
        (LECTURE_ID,),
    )

    row = cursor.fetchone()

    if not row or not row[0]:
        raise ValueError("Lecture transcript not found")

    transcript = row[0]

    chunks = create_chunks(transcript)

    print(f"Transcript length: {len(transcript)}")
    print(f"Chunks created: {len(chunks)}")

    for index, chunk in enumerate(chunks):
        print(f"Embedding chunk {index + 1}/{len(chunks)}...")

        embedding = get_embedding(chunk)

        cursor.execute(
            """
            INSERT INTO document_chunks (
                course_id,
                lecture_id,
                chunk_text,
                embedding
            )
            VALUES (%s, %s, %s, %s::vector)
            ON CONFLICT (course_id, lecture_id, chunk_text)
            DO NOTHING
            """,
            (
                COURSE_ID,
                LECTURE_ID,
                chunk,
                str(embedding),
            ),
        )

    conn.commit()

    cursor.close()
    conn.close()

    print("Ingestion completed successfully.")


if __name__ == "__main__":
    main()