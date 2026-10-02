# { "Seq": [ { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" } ] }
"""TransQuality: translation quality oracle using LLM consensus.

Users submit source text + translation + target language.
Validators judge quality via equivalence principle consensus.
Returns quality score (0-100) + structured feedback.
"""

import json
import re
from dataclasses import dataclass
from typing import List, Optional

from genlayer import *  # noqa: F401 - re-exports gl, allow_storage, DynArray, u256
import genlayer.gl as gl


# ---------- data model ----------
@allow_storage
@dataclass
class TranslationJob:
    id: u256
    source_text: str
    translation: str
    target_lang: str
    submitter: Address
    timestamp: u256
    status: str  # PENDING, JUDGED, PAID
    score: u256
    feedback: str
    judge_reasoning: str


@allow_storage
@dataclass
class QualityResult:
    job_id: u256
    score: u256
    accuracy: u256
    fluency: u256
    terminology: u256
    feedback: str
    reasoning: str


# ---------- constants ----------
PENDING = "PENDING"
JUDGED = "JUDGED"
PAID = "PAID"

MIN_FEE = 10**16  # 0.01 GEN
MAX_SOURCE_LEN = 5000
MAX_TRANSLATION_LEN = 5000
MAX_FEEDBACK_LEN = 500


# ---------- helpers ----------
def _now() -> u256:
    return u256(int(gl.block_timestamp()))


def _validate_inputs(source: str, translation: str, target_lang: str) -> None:
    if not source or not source.strip():
        raise gl.vm.UserError("source text cannot be empty")
    if len(source) > MAX_SOURCE_LEN:
        raise gl.vm.UserError(f"source text too long (max {MAX_SOURCE_LEN} chars)")
    if not translation or not translation.strip():
        raise gl.vm.UserError("translation cannot be empty")
    if len(translation) > MAX_TRANSLATION_LEN:
        raise gl.vm.UserError(f"translation too long (max {MAX_TRANSLATION_LEN} chars)")
    if not target_lang or not target_lang.strip():
        raise gl.vm.UserError("target language cannot be empty")


# ---------- contract ----------
class TransQuality(gl.Contract):
    def __init__(self):
        self.jobs: DynArray[TranslationJob] = DynArray()
        self.next_id: u256 = u256(0)
        self.total_jobs: u256 = u256(0)
        self.total_paid: u256 = u256(0)

    # ---------- writes ----------
    @gl.public.write
    def submit_translation(
        self,
        source_text: str,
        translation: str,
        target_lang: str,
    ) -> u256:
        """Submit a translation for quality assessment. Returns job ID."""
        _validate_inputs(source_text, translation, target_lang)

        # Fee paid by submitter
        if gl.message.value < MIN_FEE:
            raise gl.vm.UserError(f"minimum fee is {MIN_FEE} wei (0.01 GEN)")

        job_id = self.next_id
        self.next_id += 1

        job = TranslationJob(
            id=job_id,
            source_text=source_text.strip(),
            translation=translation.strip(),
            target_lang=target_lang.strip(),
            submitter=gl.message.sender_address,
            timestamp=_now(),
            status=PENDING,
            score=u256(0),
            feedback="",
            judge_reasoning="",
        )
        self.jobs.append(job)
        self.total_jobs += 1

        # Trigger async judgment
        self._judge_job(job_id)

        return job_id

    def _judge_job(self, job_id: u256) -> None:
        """Async judgment via LLM consensus."""
        job = self.jobs[job_id]

        def _build_prompt() -> str:
            prompt = (
                "You are a professional translation quality assessor. "
                "Evaluate the translation quality on three dimensions:\n"
                "1. ACCURACY (0-100): Does the translation convey the same meaning?\n"
                "2. FLUENCY (0-100): Is the translation natural and grammatically correct in the target language?\n"
                "3. TERMINOLOGY (0-100): Are domain-specific terms translated correctly?\n\n"
                "Output ONLY a JSON object with fields:\n"
                "  score (0-100 int): overall weighted score\n"
                "  accuracy (0-100 int)\n"
                "  fluency (0-100 int)\n"
                "  terminology (0-100 int)\n"
                "  feedback (string): specific issues and suggestions, max 500 chars\n"
                "  reasoning (string): brief justification, max 300 chars\n\n"
                f"Source text ({job.target_lang}):\n{job.source_text}\n\n"
                f"Translation:\n{job.translation}\n\n"
                f"Target language: {job.target_lang}"
            )
            return prompt

        principle = (
            "Two assessments are equivalent if they give similar scores "
            "(±10 points on each dimension and overall) and identify similar issues. "
            "Minor wording differences in feedback are acceptable."
        )

        raw = gl.eq_principle.prompt_comparative(self._build_judge_prompt, principle)

        try:
            result = json.loads(str(raw))
            if not isinstance(result, dict):
                self._mark_failed(job_id, "invalid judgment format")
                return

            score = u256(max(0, min(100, int(result.get("score", 0)))))
            accuracy = u256(max(0, min(100, int(result.get("accuracy", 0)))))
            fluency = u256(max(0, min(100, int(result.get("fluency", 0)))))
            terminology = u256(max(0, min(100, int(result.get("terminology", 0)))))
            feedback = str(result.get("feedback", ""))[:MAX_FEEDBACK_LEN]
            reasoning = str(result.get("reasoning", ""))[:300]

            job.score = score
            job.feedback = feedback
            job.judge_reasoning = reasoning
            job.status = JUDGED

            # Store detailed result
            QualityResult(
                job_id=job.id,
                score=score,
                accuracy=accuracy,
                fluency=fluency,
                terminology=terminology,
                feedback=feedback,
                reasoning=reasoning,
            ).emit()

        except Exception:
            self._mark_failed(job_id, "judgment parsing failed")

    def _build_judge_prompt(self) -> str:
        """Leader function for equivalence principle."""
        job = self.jobs[self._current_job_id]
        prompt = (
            "You are a professional translation quality assessor. "
            "Evaluate the translation quality on three dimensions:\n"
            "1. ACCURACY (0-100): Does the translation convey the same meaning?\n"
            "2. FLUENCY (0-100): Is the translation natural and grammatically correct in the target language?\n"
            "3. TERMINOLOGY (0-100): Are domain-specific terms translated correctly?\n\n"
            "Output ONLY a JSON object with fields:\n"
            "  score (0-100 int): overall weighted score\n"
            "  accuracy (0-100 int)\n"
            "  fluency (0-100 int)\n"
            "  terminology (0-100 int)\n"
            "  feedback (string): specific issues and suggestions, max 500 chars\n"
            "  reasoning (string): brief justification, max 300 chars\n\n"
            f"Source text ({job.target_lang}):\n{job.source_text}\n\n"
            f"Translation:\n{job.translation}\n\n"
            f"Target language: {job.target_lang}"
        )
        return prompt

    def _mark_failed(self, job_id: u256, reason: str) -> None:
        job = self.jobs[job_id]
        job.status = JUDGED
        job.score = u256(0)
        job.feedback = f"Judgment failed: {reason}"
        job.judge_reasoning = "Consensus failed"

    # ---------- payment ----------
    @gl.public.write
    def claim_reward(self, job_id: u256) -> None:
        """Submitter claims the quality assessment is done."""
        job = self.jobs[job_id]
        if job.submitter != gl.message.sender_address:
            raise gl.vm.UserError("only submitter can claim")
        if job.status != JUDGED:
            raise gl.vm.UserError("job not yet judged")
        if job.status == PAID:
            raise gl.vm.UserError("already paid")

        # Pay the assessor reward (in a real system, this would go to validators)
        # For now, just mark as paid
        job.status = PAID
        self.total_paid += 1

        Paid(job_id, job.score).emit()

    # ---------- views ----------
    @gl.public.view
    def get_job(self, job_id: u256) -> Optional[dict]:
        if job_id >= len(self.jobs):
            return None
        job = self.jobs[job_id]
        return {
            "id": int(job.id),
            "source_text": job.source_text,
            "translation": job.translation,
            "target_lang": job.target_lang,
            "submitter": job.submitter,
            "timestamp": int(job.timestamp),
            "status": job.status,
            "score": int(job.score),
            "feedback": job.feedback,
            "reasoning": job.judge_reasoning,
        }

    @gl.public.view
    def list_jobs(self, limit: u256 = 10, offset: u256 = 0) -> List[dict]:
        start = int(offset)
        end = min(start + int(limit), len(self.jobs))
        return [self.get_job(u256(i)) for i in range(start, end)]

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_jobs": int(self.total_jobs),
            "total_paid": int(self.total_paid),
            "pending": int(self.total_jobs - self.total_paid),
        }


# ---------- events ----------
class QualityResult(gl.Event):
    job_id: u256
    score: u256
    accuracy: u256
    fluency: u256
    terminology: u256
    feedback: str
    reasoning: str


class Paid(gl.Event):
    job_id: u256
    score: u256