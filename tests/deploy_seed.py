"""Deploy TransQuality on StudioNet and seed a board."""

import json
import time
import urllib.request
from gltest import get_accounts, get_contract_factory
from gltest.assertions import tx_execution_succeeded

GEN = 10**18
FEE = GEN // 100
COOLDOWN = 60
COOLDOWN_WAIT = COOLDOWN + 8

VISUAL_URL = "https://example.com/"
VISUAL_CLAIM = "The page shows the heading 'Example Domain'."
VISUAL_PURPOSE = "Demonstrating a visual attestation on a page that renders the same for everyone."

TEXT_CLAIM = "The page contains the marker string"
MARKER = "TRANSQUALITY-SEED-MARKER"

def _retry(fn, tries=4, pause=8, what="call"):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:
            last = e
            print(f"  [retry] {what} attempt {i + 1} failed: {str(e)[:140]}")
            time.sleep(pause)
    raise last

def _new_webhook_url() -> str:
    req = urllib.request.Request(
        "https://webhook.site/token",
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    token = json.loads(urllib.request.urlopen(req, timeout=30).read())["uuid"]
    return f"https://webhook.site/{token}"

def _write_page(url: str, body: str) -> None:
    token = url.rsplit("/", 1)[1]
    req = urllib.request.Request(
        f"https://webhook.site/token/{token}",
        data=json.dumps({"default_content": body, "status": 200}).encode(),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    urllib.request.urlopen(req, timeout=30)
    served = urllib.request.urlopen(url, timeout=30).read().decode()
    assert body in served, "the endpoint did not take the content"

def _page_with_marker(text: str) -> str:
    return (
        "DELIVERY PAGE - TransQuality seed\n\n"
        f"{text}\n\n"
        "This page exists so a validator can render it and read one exact string.\n"
        f"The string under judgement is written here as: {MARKER}\n"
    )

def _page_without_marker() -> str:
    return (
        "DELIVERY PAGE - TransQuality seed\n\n"
        "The content that carries the marker has been removed from this page.\n"
        "Nothing here matches the string the claim asks about any more.\n"
    )

class Board:
    def __init__(self, contract, buyer, seller, third):
        self.c = contract
        self.buyer = buyer
        self.seller = seller
        self.third = third

    def submit(self, source, translation, lang, purpose, who=None):
        who = who or self.buyer
        receipt = _retry(
            lambda: self.c.connect(who)
            .submit_translation(args=[source, translation, lang])
            .transact(value=FEE, wait_interval=10000, wait_retries=20),
            what=f"submit {source[:40]}",
        )
        assert tx_execution_succeeded(receipt)
        return int(self.c.get_stats(args=[]).call()["total_jobs"]) - 1

    def judge(self, aid, who=None):
        who = who or self.seller
        receipt = _retry(
            lambda: self.c.connect(who).judge_job(args=[aid]).transact(wait_interval=12000, wait_retries=40),
            what=f"judge {aid}",
        )
        assert tx_execution_succeeded(receipt)
        return self.c.get_job(args=[aid]).call()

    def claim(self, aid, who=None):
        who = who or self.buyer
        receipt = _retry(
            lambda: self.c.connect(who).claim_reward(args=[aid]).transact(wait_interval=10000, wait_retries=20),
            what=f"claim {aid}",
        )
        assert tx_execution_succeeded(receipt)

def test_seed():
    accounts = get_accounts()
    buyer, seller, third = accounts[0], accounts[1], accounts[2]

    c = get_contract_factory("TransQuality").deploy(account=buyer)
    print(f"\nTransQuality deployed at {c.address}")
    board = Board(c, buyer, seller, third)

    # Submit some translations
    print("\n--- Submitting translations ---")
    id1 = board.submit(
        "The quick brown fox jumps over the lazy dog",
        "El zorro marrón rápido salta sobre el perro perezoso",
        "Spanish",
        "General translation test",
    )
    print(f"Job {id1} submitted")

    id2 = board.submit(
        "Good morning, how are you?",
        "Bonjour, comment allez-vous?",
        "French",
        "Greeting translation",
    )
    print(f"Job {id2} submitted")

    id3 = board.submit(
        "The system is down for maintenance.",
        "システムがメンテナンスのためダウンしています。",
        "Japanese",
        "Technical message",
    )
    print(f"Job {id3} submitted")

    # Wait for judgments
    print("\n--- Waiting for judgments ---")
    for aid in [id1, id2, id3]:
        print(f"Waiting for judgment on job {aid}...")
        # In direct mode, judgment happens synchronously
        job = c.get_job(args=[aid]).call()
        print(f"  Job {aid}: status={job['status']}, score={job['score']}")

    # Claim rewards
    print("\n--- Claiming rewards ---")
    for aid in [id1, id2, id3]:
        board.claim(aid)
        job = c.get_job(args=[aid]).call()
        print(f"  Job {aid}: status={job['status']}")

    # Stats
    s = c.get_stats(args=[]).call()
    print(f"\nFINAL stats: {s}")

    print(f"\nTRANSQUALITY_ADDRESS={c.address}")
    print("SEED DONE")

if __name__ == "__main__":
    test_seed()