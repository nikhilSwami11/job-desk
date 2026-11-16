import { Fragment } from "react";

/** Renders **bold** and "## heading" lines from the model's review note. Built from React nodes, so it can never inject HTML. */
export function Markdownish({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const heading = /^#+\s*(.*)$/.exec(line);
        const parts = (heading ? heading[1] : line).split(/(\*\*[^*]+\*\*)/);
        return (
          <Fragment key={i}>
            {i > 0 && "\n"}
            {heading ? <b>{heading[1]}</b> : parts.map((p, k) => (/^\*\*[^*]+\*\*$/.test(p) ? <b key={k}>{p.slice(2, -2)}</b> : p))}
          </Fragment>
        );
      })}
    </>
  );
}
