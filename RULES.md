# Resume tailoring rules

The bank (`bank.yaml`) is the only source of facts. A tailored resume is built from it, never from memory.

## Client confidentiality (SNS Systems)
- Never name an SNS client, or the tools or data systems that would identify one. Write "a client".
- Anything under `sns_confidential` in the bank is described generically or left off.
- Unshipped proposals are never described as built.

## Hard rules
1. **No invention.** No new skills, employers, numbers, titles or dates. If the job wants something not in the bank, say so; do not add it.
2. **Tech stays with its entry.** A bullet may only name technology listed in that entry's `tech`. Flutter work never picks up backend claims, and backend work never picks up Flutter. Skills-only items (see `open_questions`) are not attached to any bullet.
3. **Numbers are copied exactly** from `metric`/`text`. No rounding up, no "approximately".
4. **Select and order, don't rewrite.** Tailoring chooses which entries and bullets to include and their order, based on the job's focus (domains). Default is to use the original `text`.
5. **Light rewording only when needed**, to emphasize a true detail or fit one line. Keep Nikhil's sentence shape: plain, specific, outcome-first ("..., so users get X"). No buzzword stacking, no "spearheaded", "leveraged", "orchestrated".
6. **One page.** If it overflows, drop the lowest-relevance bullet, not the metrics.

## Voice: a person explaining it simply
The role is now as much directing AI tools as typing code, so bullets should read like Nikhil explaining his work to a smart colleague.
- **Plain words.** Say what it does, who it helped, and the result. If a 12-year-old couldn't follow the first half, simplify it.
- **One idea per bullet, one or two short sentences.** Outcome first or right after the action.
- **Say how it was directed only where true.** Use "directed Claude Code agents to..." only for the entries that actually used it (SNS Systems, Affinity). Never add AI-tool wording to older jobs.
- **Name the tool once, where it matters.** Not a list of every library in each bullet.
- **No filler verbs:** spearheaded, leveraged, orchestrated, utilized, robust, seamless, cutting-edge.
- **Numbers stay, and they stay exact.**
- Humans can disagree with a rewrite. Every reworded bullet shows its original beside it in the change log.

## AI roles: lead with LLM work
For any AI / LLM / agent role, put `llm` entries first: SNS Systems (LLM dashboard, Claude Code agents), Text2SQL, Affinity (multi-agent workflow), Price is Right, then forecasting and data.
Put the in-demand terms in Skills and bullets ONLY where they are true for Nikhil. MCP, tool use, agents and RAG are listed only if the bank backs them (RAG: Text2SQL, price agent; agents: Claude Code workflows, LangGraph). MCP is NOT in the bank yet, so it is not claimed until Nikhil says where he used it.

## Matching by domain
- Mobile job: lead with `mobile`, `realtime` (Fraazo, Zadinga Flutter), then backend support.
- Backend job: lead with `backend`, `infra`, `payments` (Go/Redis service, RBAC, .NET backend, Noon).
- AI/ML job: lead with `llm`, `ml` (SNS forecasting and dashboard, Text2SQL, Affinity).
- Data job: lead with `data` (forecasting, taxi pipeline, search indexing).

## Output of every tailoring run
1. The resume text.
2. **Change log:** entries chosen and dropped, any bullet reworded (before → after).
3. **Gaps:** things the job asks for that the bank doesn't support.
4. **Questions** for Nikhil if a claim needs confirming.

Nikhil approves before anything is final. Corrections go into `bank.yaml` so they don't repeat.

## Adding a project
Nikhil describes it in his own words. It becomes a new entry with `tech` limited to what he states, domains, metrics only if given, and a review pass before it is used.
