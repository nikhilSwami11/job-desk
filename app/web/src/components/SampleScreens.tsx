/** Mail, Tasks and Reels are designed but not connected yet. Everything here is clearly synthetic. */
const SampleStrip = () => <p className="sample">Sample screen. Not connected yet.</p>;

export function MailView({ onNotYet }: { onNotYet: () => void }) {
  return (
    <div className="in">
      <SampleStrip />
      <h1 className="sec-h">What needs you today</h1>
      <p className="mute">Your inbox, boiled down to what needs an answer. These messages are made up.</p>
      <div>
        <div className="msg"><b>Sample Recruiter, Example Corp</b>&quot;Can we do a 20 minute call this week?&quot;<p className="why2 mute">Needs a reply by Friday. A recruiter is waiting.</p></div>
        <div className="msg"><b>Sample University Office, Example State</b>&quot;Confirm your enrollment details&quot;<p className="why2 mute">A form with a deadline on Monday.</p></div>
        <div className="msg"><b>Sample Careers Bot, Sample Systems</b>&quot;Thanks for applying&quot;<p className="why2 mute">Nothing to do. Safe to ignore.</p></div>
      </div>
      <div className="actionbar"><button type="button" className="btn go" onClick={onNotYet}>Draft a reply</button><span className="note">Not connected yet.</span></div>
    </div>
  );
}

const Todo = ({ children }: { children: string }) => <label className="todo"><input type="checkbox" /><span>{children}</span></label>;

export function TasksView({ onNotYet }: { onNotYet: () => void }) {
  return (
    <div className="in">
      <SampleStrip />
      <h1 className="sec-h">Tasks</h1>
      <p className="mute">Your to-dos in one list. These are made up, and ticking them works only on this page.</p>
      <h3 className="sec">Today</h3>
      <Todo>Send the Example Corp call times</Todo>
      <Todo>Read the sample job description twice</Todo>
      <h3 className="sec">Later</h3>
      <Todo>Update the project list</Todo>
      <Todo>Ask a friend to review the cover letter</Todo>
      <div className="actionbar"><button type="button" className="btn go" onClick={onNotYet}>Add a task</button><span className="note">Not connected yet.</span></div>
    </div>
  );
}

export function ReelsView({ onNotYet }: { onNotYet: () => void }) {
  return (
    <div className="in">
      <SampleStrip />
      <h1 className="sec-h">Reels to plans</h1>
      <p className="mute">Share a reel link and its caption, and get a step-by-step plan to build it.</p>
      <div className="stack">
        <label className="vh" htmlFor="reelLink">Reel link</label><input className="field" id="reelLink" placeholder="Reel link" />
        <label className="vh" htmlFor="reelCap">Caption or transcript</label><textarea className="field" id="reelCap" placeholder="Paste the caption or what was said" />
      </div>
      <h3 className="sec">Sample plan</h3>
      <p className="mute">This is made up, to show the shape of a plan.</p>
      <ol className="steps">
        <li>Say in one sentence what the reel shows (a rate limiter for an API).</li>
        <li>List what you need (a small server and a counter store).</li>
        <li>Build the smallest version that works.</li>
        <li>Test it with ten quick requests.</li>
        <li>Decide what to add next.</li>
      </ol>
      <div className="actionbar"><button type="button" className="btn go" onClick={onNotYet}>Make a plan</button><span className="note">Not connected yet.</span></div>
    </div>
  );
}
