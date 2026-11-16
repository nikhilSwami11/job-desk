# Job Desk

Local app: paste a job description, get a visa and fit check, then a tailored one-page resume and a cover letter.
Runs only on your Mac at http://127.0.0.1:8787. It never sends or submits anything.

## Run
    cd ~/Desktop/ideas/resume-bank/app/web && npm install && npm run build    # once, and after frontend changes
    python3 -I ~/Desktop/ideas/resume-bank/app/server.py                       # then open http://127.0.0.1:8787
    ~/Desktop/ideas/resume-bank/app/run_tests.sh                                # Python tests, type-check, React tests
    cd app/web && npm run dev                                                   # live-reloading frontend on :5173 (talks to the server on :8787)

## Layout (each file has one job)
    server.py            entry point: wires the layers together
    jobdesk/             backend (Python, standard library only)
      config.py            paths and settings
      store.py             job state on disk (jobs/<id>/state.json)
      knowledge.py         reads your facts: bank.yaml, RULES.md, voice, skill text
      prompts.py           pure functions that build the prompts
      llm.py               the only place that calls the Claude CLI
      checks.py            pure checks: visa pre-filter, invented numbers, keywords, page count
      tracker.py           tracker.csv
      artifacts.py         builds resume.json, Word, PDF, cover letter files
      pipeline.py          runs the two phases: gate, then generate
      api.py               HTTP routes, token auth, serves the built frontend, security headers
    web/                 frontend: React + TypeScript + Vite (builds into web/dist, which the server serves)
      src/types.ts         the shapes of jobs, gates, scores
      src/lib/             logic.ts (pure rules), api.ts (the only network code), storage.ts, constants.ts
      src/hooks/           useJobs (polling + notifications), useRoute, useStored*, useMediaQuery, useToast
      src/components/      small components: Nav, NextStepLine, PasteForm, JobList, JobDetail, Verdict, ResultView, ...
      src/App.tsx          the controller: state and events, no rules
      src/styles.css       the look
    tests/               Python tests (67)
    jobs/ token.txt usage.log confidential.txt   data, secret, token log, names never to show (git-ignored)
