import logging
import time
from collections.abc import Generator
from http import HTTPStatus
from typing import Any

import httpx
from data.schemas import (
    Bundle,
    ObservationResource,
    PatientResource,
)

logger = logging.getLogger(__name__)


class FHIRClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.timeout = 30.0

    def search(
        self, resource_type: str, params: dict[str, Any] | None = None
    ) -> Bundle:
        """Search FHIR resources with error handling and retry"""
        url = f"{self.base_url}/{resource_type}"
        headers = {"Accept": "application/fhir+json"}

        with httpx.Client(timeout=self.timeout) as client:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = client.get(url, headers=headers, params=params)
                    response.raise_for_status()
                    return Bundle(**response.json())
                except httpx.HTTPStatusError as e:
                    if (
                        e.response.status_code == HTTPStatus.TOO_MANY_REQUESTS
                    ):  # Rate limited
                        wait_time = (2**attempt) * 2  # Exponential backoff
                        logger.warning(f"Rate limited, waiting {wait_time}s")
                        time.sleep(wait_time)
                    else:
                        raise
            raise Exception(f"Failed after {max_retries} retries")

    def stream_patients(
        self, batch_size: int = 100, offset: int = 0
    ) -> Generator[PatientResource, None]:
        """Stream patients with pagination to avoid memory issues"""
        params = {"_count": batch_size, "_offset": offset}
        bundle = self.search("Patient", params)

        yield from bundle.get_patient_resources()

    def get_observations(self, patient_id: str) -> list[ObservationResource]:
        """Fetch all Observations for a patient."""
        bundle = self.search(
            "Observation", {"subject": f"Patient/{patient_id}", "_count": 500}
        )
        return bundle.get_observation_resources()
