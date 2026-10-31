import { redirect } from "next/navigation";

// Everything now lives on the front page.
export default function ClosingQuestions() {
  redirect("/#closing");
}
