#include <configd.h>

"""Base classes for embedding models."""
from typing import Union, Optional
from langchain import embeddings as langchain_embeddings
from pydantic.main import ModelMetaclass
from qdrant_client.http import models
from pydantic.main import ModelMetaclass
from dataclasses import dataclass, asdict


# Make the model atomically available
LOADED_MODELS: dict = {}


@dataclass
class BaseEmbeddingModel:
    model_size = {
        "instruct": 768,
        "all-MiniLM-L6-v2": 384,
        "multi-qa-mpnet-base-dot-v1": 768,
    }
    model_name: str
    distance: Union[str, models.Distance]
    embedding_cls: str
    is_instruct: bool
    data_type: str

    collection_name: Optional[str] = None
    size: Optional[int] = None
    max_tokens: Optional[int] = None

    kwargs: Optional[dict] = None
    embed_instruction: Optional[str] = None
    query_instruction: Optional[str] = None

    embeddings: Optional[ModelMetaclass] = None

    @property
    def model_id(self):
        return f"{self.data_type}_{self.model_name}_{self.collection_name}_{self.distance}_{self.size}_{self.max_tokens}_{self.is_instruct}"

    def dict(self):
        return asdict(self)


@dataclass
class EmbeddingModel(BaseEmbeddingModel):
    def __post_init__(self):
        self._common_init()
        self._instruct_init()
        self._hf_init()

        self._create_embeddings()

    def _common_init(self):
        if self.kwargs is None:
            self.kwargs = {}

        if isinstance(self.distance, str):
            self.distance = models.Distance(self.distance)

        if self.size is None:
            if self.model_name not in self.model_size:
                raise ValueError(
                    f"Model size for `{self.model_name}` is not defined. Please add it to the `model_size` dictionary."
                )

            self.size = self.model_size[self.model_name]

        if self.collection_name is None:
            self.collection_name = f"{self.data_type}_{self.model_name}"

    def _instruct_init(self):
        assert isinstance(self.kwargs, dict)

        if self.embedding_cls == "HuggingFaceInstructEmbeddings":
            if not (self.embed_instruction and self.query_instruction):
                raise ValueError(
                    "`embed_instruction` and `query_instruction` must be set if `is_instruct` is True."
                )
            self.kwargs = {
                **self.kwargs,
                "embed_instruction": self.embed_instruction,
                "query_instruction": self.query_instruction,
            }

    def _hf_init(self):
        assert isinstance(self.kwargs, dict)

        if self.embedding_cls == "HuggingFaceEmbeddings":
            self.kwargs = {
                **self.kwargs,
                "model_name": self.model_name,
            }

    def _create_embeddings(self):
        if not isinstance(self.kwargs, dict):
            raise ValueError("`config.kwargs` must be a dict")

        self.embeddings = getattr(langchain_embeddings, self.embedding_cls)(
            **self.kwargs
        )

        if self.max_tokens is None and self.embeddings:
            self.max_tokens = self.embeddings.client.max_seq_length

from abc import ABC, abstractmethod

from datetime import datetime
from typing import Any, Optional
from langchain.prompts.prompt import PromptTemplate
from llm4data.prompts.utils import get_prompt_manager


class DatedPrompt(PromptTemplate, ABC):
    task_label = "DatedPrompt"
    prompt_type = "zeros"
    template = "Current date: {now}\n\n"

    def format(self, **kwargs: Any) -> str:
        if "now" not in kwargs:
            kwargs["now"] = datetime.now().date()

            if "{now}" not in self.template:
                self.template = "Current date: {now}\n\n" + self.template

        return super().format(**kwargs)

    def send_prompt(
        self,
        prompt: str,
        api_kwargs: Optional[dict] = None,
        send_prompt_kwargs: Optional[dict] = None,
        **kwargs: Any
    ):
        prompt_manager = get_prompt_manager(
            self.task_label,
            type=self.prompt_type,
        )

        if send_prompt_kwargs is None:
            # Default to returning data
            send_prompt_kwargs = dict(
                return_data=True,
            )

        return prompt_manager.send_prompt(
            user_content=prompt,
            user_template=self.format(**kwargs),
            api_kwargs=api_kwargs,
            **send_prompt_kwargs,
        )

    @abstractmethod
    def parse_response(self, response: dict, **kwargs: Any) -> Any:
        pass


class APIPrompt(DatedPrompt):
    task_label = "APIPrompt"
    prompt_type = "zeros"
    template = "Current date: {now}\n\n"

    @abstractmethod
    def parse_response(
        self, response: dict, **kwargs: Any
    ) -> Any:
        pass

    @abstractmethod
    def send_prompt_get_sample(self, prompt: str, n_samples: int = 10, **kwargs: Any) -> dict:
        pass

return true
