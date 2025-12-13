import { Metadata } from "next";
import AudioLibrary from "./AudioLibrary";

export const metadata: Metadata = {
  title: "Audio Library | Al-Manhaj Radio",
  description: "Listen to Islamic lectures, Quran recitations, and educational content from Al-Manhaj Radio.",
  keywords: "Islamic audio, Quran recitation, Islamic lectures, Hadith, Tafsir, Islamic education",
};

export default function AudioLibraryPage() {
  return <AudioLibrary />;
}