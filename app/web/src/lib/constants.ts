import type { Mode } from "../types";

export const MODES: Record<Mode, [label: string, description: string]> = {
  truthful: ["Truthful", "Your own bank text, word for word. It only picks and orders."],
  normal: ["Normal", "Light rewording to fit the job. Recommended."],
  aggressive: ["Aggressive", "Rewrites to mirror the job's wording. Every stretch is flagged."],
};

export const FILES: Record<string, string> = {
  "Nikhil_Swami_Resume.pdf": "Download resume (PDF)",
  "Nikhil_Swami_Cover_Letter.pdf": "Cover letter (PDF)",
  "Nikhil_Swami_Resume.docx": "Resume (Word)",
  "cover_letter.txt": "Cover letter (text)",
};
export const PRIMARY_FILE = "Nikhil_Swami_Resume.pdf";
