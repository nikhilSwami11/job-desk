"""Orchestrates the two phases of a job: gate (fit check) and generate (resume + letter).
Depends on small interfaces (store, llm.complete, builder, knowledge), so tests can swap in fakes."""
import threading

from . import checks, prompts
from .llm import extract_json


class Pipeline:
    def __init__(self, store, llm, builder, knowledge, config):
        self.store, self.llm, self.builder, self.knowledge, self.cfg = store, llm, builder, knowledge, config
        self.lock = threading.Lock()  # one model run at a time

    # ---- public ----
    def start(self, jid, phase):
        threading.Thread(target=self.run, args=(jid, phase), daemon=True).start()

    def run(self, jid, phase):
        st = self.store.load(jid)
        jd = self.store.jd_text(jid)
        cost = [0.0, 0]
        try:
            with self.lock:
                st.update(status="gating" if phase == "gate" else "generating", updated=self.store.clock(), error=None)
                self.store.save(st)
                (self._gate if phase == "gate" else self._generate)(st, jd, cost)
        except Exception as e:  # noqa: any failure becomes a visible error on the job
            st["status"], st["error"] = "error", str(e)[:600]
        st["cost"] = round(st.get("cost", 0) + cost[0], 3)
        st["tokens"] = st.get("tokens", 0) + cost[1]
        st["updated"] = self.store.clock()
        self.store.save(st)

    # ---- phases ----
    def _call(self, prompt, system, model, timeout, cost):
        r = self.llm.complete(prompt, system, model, timeout)
        cost[0] += r.cost
        cost[1] += r.tokens
        return r.text

    def _gate(self, st, jd, cost):
        hit = checks.prefilter(jd)
        if hit:
            st["gate"] = checks.blocker_gate(hit, st.get("company_hint"), st.get("role_hint"))
        else:
            text = self._call(prompts.gate_prompt(self.knowledge.facts(), jd, st.get("company_hint"), st.get("role_hint")),
                              prompts.GATE_SYSTEM, self.cfg.gate_model, 300, cost)
            st["gate"] = extract_json(text)
        g = st["gate"]
        st["company"] = g.get("company") or st.get("company_hint") or "Unknown"
        st["role"] = g.get("role") or st.get("role_hint") or "Unknown"
        st["status"] = "gated"

    def _generate(self, st, jd, cost):
        facts = self.knowledge.facts()
        reply = extract_json(self._call(prompts.gen_prompt(facts, jd, st), prompts.GEN_SYSTEM, self.cfg.gen_model, 600, cost))
        if not isinstance(reply.get("sections"), list) or not reply.get("cover_letter") or not reply.get("subtitle"):
            raise ValueError("model reply was missing sections, subtitle or cover_letter")
        res = self.builder.build(st, reply, facts.bank)
        if res["pages"] > 1:                      # free fix first: print slightly smaller
            pages, zoom = self.builder.fit_by_zoom(res["folder"])
            if pages == 1:
                res["pages"] = 1
                res["review"] = res["review"].replace("**WARNING: resume is %d pages, target is 1.**\n\n" % 2, "") \
                    + f"\n\n_Fit to one page by printing at {int(zoom * 100)}% scale._"
        if res["pages"] != 1:                     # then one trim pass by the model
            text = self._call(prompts.trim_prompt(res["pages"], reply), prompts.TRIM_SYSTEM, self.cfg.gen_model, 300, cost)
            r2 = extract_json(text)
            if isinstance(r2.get("sections"), list):
                for k in ("cover_letter", "subtitle", "score", "jd_keywords"):
                    r2.setdefault(k, reply.get(k))
                res = self.builder.build(st, r2, facts.bank)
        st["result"], st["status"] = res, "done"
