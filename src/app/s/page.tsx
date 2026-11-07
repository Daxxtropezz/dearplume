import type { Metadata } from "next";
import SharedMessageView from "../components/SharedMessageView";
export const metadata: Metadata = { title: "A little note for you ♡ | Dearplume", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function SharedNote() { return <SharedMessageView/>; }
