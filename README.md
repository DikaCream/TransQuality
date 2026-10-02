# TransQuality - Translation Quality Oracle on GenLayer

A decentralized translation quality assessment dApp built on GenLayer. Users submit translations for quality assessment by LLM consensus validators.

## Features

- **Translation Quality Assessment**: Submit source text + translation + target language
- **LLM Consensus Judging**: Validators judge accuracy, fluency, and terminology via equivalence principle
- **Quality Scores**: Overall score (0-100) + breakdown by accuracy, fluency, terminology
- **Structured Feedback**: Detailed feedback and reasoning from validators
- **On-chain Results**: All assessments stored immutably on GenLayer

## Contract

File: `contracts/trans_quality.py`

### Write Methods
| Method | Purpose |
|--------|---------|
| `submit_translation(source, translation, target_lang)` | Submit translation for quality check (fee: 0.01 GEN) |
| `claim_reward(job_id)` | Claim reward after judgment |

### View Methods
| Method | Purpose |
|--------|---------|
| `get_job(job_id)` | Full job details |
| `list_jobs(limit, offset)` | Paginated job list |
| `get_stats()` | Contract statistics |

### Events
- `QualityResult`: Emitted when judgment completes
- `Paid`: Emitted when reward is claimed

## Frontend

Stack: React 18 + TypeScript + Vite + viem + genlayer-js + react-router-dom

Pages:
- `/` — Board: list jobs, stats, submit new
- `/submit` — Submit translation for quality check
- `/job/:id` — Full job details with score, feedback, reasoning

## Setup

### Contract (requires gltest)
```bash
# Install gltest
pip install gltest

# Configure StudioNet keys in gltest.config.yaml
# Add .env with STUDIONET_RPC_URL

# Run direct tests
pytest tests/direct/test_trans_quality.py -v

# Deploy to StudioNet
gltest --network studionet tests/deploy_seed.py -v -s
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Development server
npm run build    # Production build
```

## Deploy to Vercel
1. Connect repo to Vercel
2. Set `VITE_CONTRACT_ADDRESS` environment variable
3. Deploy

## Architecture

```
User submits translation + fee
    ↓
Contract stores job (PENDING)
    ↓
Async judgment via gl.eq_principle.prompt_comparative
    ↓
Validators judge: accuracy, fluency, terminology
    ↓
Consensus reached → score + feedback stored
    ↓
Job status → JUDGED
    ↓
Submitter calls claim_reward → PAID
```

## Testing

```bash
# Contract tests
pytest tests/direct/test_trans_quality.py -v

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend build
cd frontend && npm run build
```

## License

MIT