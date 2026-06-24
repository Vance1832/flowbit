import logging

from celery import shared_task

from .services import verify_audit_chain

logger = logging.getLogger("flowbit.audit")


@shared_task(name="audit.verify_chain")
def verify_audit_chain_task() -> dict:
    """Periodically verify the audit hash chain; log (and so alert) on tampering."""
    result = verify_audit_chain()
    if not result["ok"]:
        logger.error(
            "Audit chain integrity check FAILED: %s entr(ies) tampered (ids=%s).",
            len(result["broken_ids"]),
            result["broken_ids"],
        )
    return result
