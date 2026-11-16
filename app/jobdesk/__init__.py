"""Job Desk: a local pipeline that turns a job description into a fit check, a tailored resume and a cover letter.

Layers (each depends only on the ones above it in this list):
  config      paths and settings
  store       job state on disk
  knowledge   reads the user's facts (bank, rules, voice, skill text)
  prompts     pure functions that build prompts from facts
  llm         the only module that talks to the Claude CLI
  checks      pure validation and scoring helpers
  tracker     the tracker.csv file
  artifacts   renders resume and letter files (HTML, Word, PDF)
  pipeline    orchestrates gate and generate
  api         HTTP routing, auth and static files
"""
