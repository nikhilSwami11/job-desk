# Job Desk

Local app: paste a job description, get a visa and fit check, then a tailored one-page resume and a cover letter.
Runs only on your Mac at http://127.0.0.1:8787. It never sends or submits anything.

## Run
    python3 -I ~/Desktop/ideas/resume-bank/app/server.py      # then open http://127.0.0.1:8787
    ~/Desktop/ideas/resume-bank/app/run_tests.sh               # all tests (Python + JavaScript)

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
      api.py               HTTP routes, token auth, static files, security headers
    static/              frontend (no libraries, no build step)
      index.html           structure
      app.css              look
      logic.js             pure rules: what is next, scores, routing
      views.js             pure HTML builders (everything is escaped)
      api.js               the only code that talks to the server
      app.js               controller: state, events, polling
    tests/               65 Python + 42 JavaScript tests
    jobs/ token.txt usage.log confidential.txt   data, secret, token log, names never to show
