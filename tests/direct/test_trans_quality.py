"""Direct tests for TransQuality contract."""

import pytest
from tests.direct.conftest import set_time, iso

BASE = 1790000000

def _reset():
    import genlayer.gl.genvm_contracts as gvc
    gvc.__known_contract__ = None

@pytest.fixture()
def contract(direct_vm, direct_deploy):
    c = direct_deploy("contracts/trans_quality.py")
    yield c
    _reset()

def call(vm, fn, sender, value=0, at=None):
    vm.sender = sender
    vm.value = value
    if at is not None:
        set_time(iso(at))
    out = fn()
    vm.value = 0
    return out

class TestTransQuality:
    def test_submit_translation_basic(self, contract, direct_vm, direct_alice):
        job_id = call(direct_vm, lambda: contract.submit_translation("Hello world", "Hola mundo", "Spanish"), direct_alice, value=10**16)
        job = contract.get_job(job_id)
        assert job is not None
        assert job["source_text"] == "Hello world"
        assert job["translation"] == "Hola mundo"
        assert job["target_lang"] == "Spanish"
        assert job["status"] == "PENDING"

    def test_submit_empty_source_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_translation("", "Hola", "Spanish"), direct_alice, value=10**16)

    def test_submit_empty_translation_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_translation("Hello", "", "Spanish"), direct_alice, value=10**16)

    def test_submit_insufficient_fee_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_translation("Hello", "Hola", "Spanish"), direct_alice, value=10**15)

    def test_submit_long_source_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_translation("x" * 5001, "Hola", "Spanish"), direct_alice, value=10**16)

    def test_submit_long_translation_fails(self, contract, direct_vm, direct_alice):
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.submit_translation("Hello", "x" * 5001, "Spanish"), direct_alice, value=10**16)

    def test_list_jobs(self, contract, direct_vm, direct_alice):
        call(direct_vm, lambda: contract.submit_translation("Hello", "Hola", "Spanish"), direct_alice, value=10**16)
        call(direct_vm, lambda: contract.submit_translation("Goodbye", "Adiós", "Spanish"), direct_alice, value=10**16)
        jobs = contract.list_jobs(10, 0)
        assert len(jobs) == 2

    def test_get_stats(self, contract, direct_vm, direct_alice):
        stats = contract.get_stats()
        assert stats["total_jobs"] == 0
        call(direct_vm, lambda: contract.submit_translation("Hello", "Hola", "Spanish"), direct_alice, value=10**16)
        stats = contract.get_stats()
        assert stats["total_jobs"] == 1
        assert stats["pending"] == 1

    def test_claim_reward_not_judged_fails(self, contract, direct_vm, direct_alice):
        job_id = call(direct_vm, lambda: contract.submit_translation("Hello", "Hola", "Spanish"), direct_alice, value=10**16)
        with pytest.raises(Exception):
            call(direct_vm, lambda: contract.claim_reward(job_id), direct_alice)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])