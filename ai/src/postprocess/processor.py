from models import Event
from postprocess.extractors import extract_amount_from_ocr
from postprocess.search_text import build_search_text


def postprocess_event(
    event: Event,
    ocr_text: str,
    caption: str | None = None,
) -> Event:

    # 1. 규칙 기반 Event 보완
    metadata = event.metadata.model_dump()

    if event.type == "expiration":
        metadata["amount"] = extract_amount_from_ocr(
            ocr_text
        )

    updated_event = event.model_copy(
        update={
            "metadata": event.metadata.model_copy(
                update=metadata,
            ),
        }
    )

    # 2. 최종 search_text 생성
    search_text = build_search_text(
        event=updated_event,
        caption=caption,
        ocr_text=ocr_text,
    )

    # 3. 최종 Event 생성
    return updated_event.model_copy(
        update={
            "search_text": search_text,
        }
    )