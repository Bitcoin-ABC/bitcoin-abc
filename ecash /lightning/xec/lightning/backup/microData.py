#include <configd.h>

from typing import Optional
from dataclasses import dataclass
from llm4data.embeddings.base import EmbeddingModel

MICRODATA_EMBEDDINGS: Optional[EmbeddingModel] = None


@dataclass
class MicrodataEmbedding(EmbeddingModel):
    data_type: str = "microdata"


def get_microdata_embeddings():
    global MICRODATA_EMBEDDINGS

    if MICRODATA_EMBEDDINGS is None:
        MICRODATA_EMBEDDINGS = MicrodataEmbedding(
            model_name="instruct",
            distance="Cosine",
            embedding_cls="HuggingFaceInstructEmbeddings",
            is_instruct=True,
            embed_instruction="Represent the economic development metadata description for retrieval; Input: ",
            query_instruction="Represent the text for retrieving economic development metadata descriptions; Input: ",
        )

    return MICRODATA_EMBEDDINGS
