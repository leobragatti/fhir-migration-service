from datetime import datetime, timezone

from pydantic import BaseModel, field_validator

# ========== Patient ==========


class HumanName(BaseModel):
    use: str | None = None
    family: str | None = None
    given: list[str] | None = []
    text: str | None = None

    @field_validator("given", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if isinstance(v, str):
            return [v]
        return v or []


class Identifier(BaseModel):
    use: str | None = None
    system: str | None = None
    value: str | None = None


class ContactPoint(BaseModel):
    system: str | None = None
    value: str | None = None
    use: str | None = None


class Address(BaseModel):
    use: str | None = None
    line: list[str] | None = []
    city: str | None = None
    state: str | None = None


class PatientResource(BaseModel):
    """FHIR Patient R4 resource with transformation method."""

    resourceType: str = "Patient"
    id: str | None = None
    identifier: list[Identifier] | None = []
    name: list[HumanName] | None = []
    telecom: list[ContactPoint] | None = []
    gender: str | None = None
    birthDate: str | None = None
    address: list[Address] | None = []

    @field_validator("identifier", "name", "telecom", "address", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, dict):
            return [v]
        return v

    def to_internal(self) -> dict:
        """Transform to internal database model format."""
        # Extract primary name
        primary_name = ""
        if self.name:
            primary = self.name[0]
            primary_name = primary.text or ""
            if not primary_name and primary.family:
                primary_name = primary.family

        # Extract identifiers (top 5)
        identifiers = []
        for ident in (self.identifier or [])[:5]:
            if ident.value:
                identifiers.append(ident.value)

        return {
            "id": self.id or "",
            "name": primary_name,
            "birth_date": self.birthDate,
            "gender": self.gender or "unknown",
            "identifier": ", ".join(identifiers),
            "telecom_count": len(self.telecom or []),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_display_name(self) -> str:
        """Helper to get a readable patient name."""
        if self.name and self.name[0].text:
            return self.name[0].text
        if self.name and self.name[0].family:
            return self.name[0].family
        return "Unknown"

    def get_primary_identifier(self) -> str | None:
        """Get the first identifier value."""
        if self.identifier and self.identifier[0].value:
            return self.identifier[0].value
        return None


# ========== Coding & CodeableConcept ==========


class Coding(BaseModel):
    system: str | None = None
    version: str | None = None
    code: str | None = None
    display: str | None = None


class CodeableConcept(BaseModel):
    coding: list[Coding] | None = []
    text: str | None = None

    @field_validator("coding", mode="before")
    @classmethod
    def ensure_coding_list(cls, v):
        if v is None:
            return []
        if isinstance(v, dict):
            return [v]
        return v


class ObservationReference(BaseModel):
    reference: str | None = None
    type: str | None = None
    display: str | None = None


class ValueQuantity(BaseModel):
    value: float | None = None
    comparator: str | None = None
    unit: str | None = None
    code: str | None = None


# ========== Observation ==========


class ObservationResource(BaseModel):
    """FHIR Observation R4 resource with transformation method."""

    resourceType: str = "Observation"
    id: str | None = None
    status: str | None = None
    category: list[CodeableConcept] | None = []
    code: CodeableConcept | None = None
    subject: ObservationReference | None = None
    effectiveDateTime: str | None = None
    valueQuantity: ValueQuantity | None = None
    valueString: str | None = None
    valueCodeableConcept: CodeableConcept | None = None
    valueInteger: int | None = None
    valueBoolean: bool | None = None

    @field_validator("category", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        if isinstance(v, dict):
            return [v]
        return v

    def to_internal(self, patient_id: str) -> dict:
        """Transform to internal database model format."""
        # Extract code and display
        code_str = ""
        display = ""

        if self.code:
            if self.code.text:
                display = self.code.text
            if self.code.coding:
                coding = self.code.coding[0]
                code_str = coding.code or ""
                display = coding.display or display

        # Extract value from multiple possible fields
        value_text = ""
        if self.valueQuantity:
            val = self.valueQuantity
            value_text = (
                f"{val.value} {val.unit}".strip() if val.unit else str(val.value)
            )
        elif self.valueString:
            value_text = self.valueString
        elif self.valueCodeableConcept:
            value_text = self.valueCodeableConcept.text or ""
        elif self.valueInteger is not None:
            value_text = str(self.valueInteger)
        elif self.valueBoolean is not None:
            value_text = str(self.valueBoolean).lower()

        # Extract patient ID from subject reference if not provided
        actual_patient_id = patient_id
        if self.subject and not actual_patient_id:
            ref = self.subject.reference or ""
            if ref.startswith("Patient/"):
                actual_patient_id = ref.replace("Patient/", "")

        return {
            "id": self.id or "",
            "patient_id": actual_patient_id,
            "code": code_str,
            "display": display,
            "value_text": value_text[:200] if value_text else "",
            "effective_datetime": self.effectiveDateTime,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def get_code_display(self) -> str:
        """Get the display name for this observation code."""
        if self.code and self.code.coding:
            return self.code.coding[0].display or self.code.text or "Unknown"
        if self.code and self.code.text:
            return self.code.text
        return "Unknown"

    def get_value_as_string(self) -> str:
        """Get observation value as a formatted string."""
        if self.valueQuantity:
            val = self.valueQuantity
            if val.unit:
                return f"{val.value} {val.unit}"
            return str(val.value)
        if self.valueString:
            return self.valueString
        if self.valueInteger is not None:
            return str(self.valueInteger)
        if self.valueBoolean is not None:
            return "Yes" if self.valueBoolean else "No"
        return ""


# ========== Bundle ==========


class EntryComponent(BaseModel):
    resource: dict | None = None
    fullUrl: str | None = None
    search: dict | None = None
    response: dict | None = None


class Bundle(BaseModel):
    resourceType: str = "Bundle"
    id: str | None = None
    type: str = "searchset"
    total: int | None = None
    entry: list[EntryComponent] | None = []
    link: list[dict] | None = []

    @field_validator("entry", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        return v

    def get_patient_resources(self) -> list[PatientResource]:
        """Extract all Patient resources from bundle."""
        patients = []
        for entry in self.entry or []:
            if entry.resource:
                try:
                    patient = PatientResource(**entry.resource)
                    patients.append(patient)
                except Exception as e:
                    print(f"Parse error: {e}")
        return patients

    def get_observation_resources(self) -> list[ObservationResource]:
        """Extract all Observation resources from bundle."""
        observations = []
        for entry in self.entry or []:
            if entry.resource:
                try:
                    obs = ObservationResource(**entry.resource)
                    observations.append(obs)
                except Exception as e:
                    print(f"Parse error: {e}")
        return observations
