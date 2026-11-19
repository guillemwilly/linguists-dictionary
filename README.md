# The Linguist’s Dictionary

A lightweight, browser-based dictionary for linguists and polyglots working across German, Russian, Mandarin Chinese, French, Catalan, Spanish, Portuguese and English. No account, server or API key required for lookups.

## Features

- English definitions and a target-language definition where available.
- IPA/pinyin plus optional source-linked human recordings with per-file creator, source and license credits.
- Six tested homepage example entries, alongside your existing recent searches.
- Word forms, examples, etymology and links to the full sources.
- User-driven **Contrast mode** for comparing two independently sourced entries.
- Source-evidenced grammar frames and explicit Wiktionary collocations.
- Cross-language translations and shared-history links across the eight supported languages.
- Best-effort language detection, with alternate-language switches for ambiguous words.
- Inflected-form lookup and accent-recovery where the source supports them.
- Optional Anki Desktop integration, related-word notes, and TSV export when direct connection is unavailable.
- Light/dark themes, keyboard search, and browser-local history.

## Run

The official hosted dictionary is free to use. For material you are permitted to run locally under the license below, open `index.html` in a browser, or serve the folder using `python3 -m http.server 8000`. No build step. GitHub Pages serves these same files. These technical instructions do not grant additional reuse or deployment rights.

## Anki

Lookups work without Anki. Click **Save cards** to save notes in this browser. Turn on **Auto-add** to save each lookup and its available partners. Click **Export saved cards** to download a TSV. Import it with HTML enabled; map the nine fields (Word, Language, Meaning, Definition, Pronunciation, Forms, Example, Notes, Source). A matching custom note type is created by direct connection, or you can create one manually. If importing into Basic, map Word to Front and Meaning to Back; other fields require their own fields.

For direct transfer install Anki Desktop and [AnkiConnect](https://ankiweb.net/shared/info/2055492159), restart Anki, and click **Connect Anki**. Approve this website's origin in Anki and any local-network prompt. Keep AnkiConnect on 127.0.0.1; never expose it to the internet or allow every website. HTTPS-to-localhost behavior varies by browser. TSV export is the fallback. Mobile browsers cannot connect to Anki running on another device.

Connected imports create `Dictionary::<Language>` decks and the `The Linguist’s Dictionary` note type (recognition and production cards). Automatic saving is off by default for new visitors. Duplicate checks use word + language. Export preserves the browser queue; clearing browser storage deletes history and queued cards. Nothing syncs across browsers automatically.

## Limitations

This is a community-source reader, not an authoritative linguistic database. Extraction and language guesses can be wrong. A short word can genuinely belong to multiple languages. Accent recovery and lemma matching are not universal. Target-language definitions and partner notes can be incomplete. Chinese entries may link to traditional source pages, though simplified headwords are used for simplified queries. Subtitle frequency is word-form frequency, not a proficiency level or universal measure of usefulness. Network failure can leave secondary fields empty.

The public app does not use AI at runtime, require an API key, or offer the personal idem chat enrichment used in the original private prototype. Contrast, grammar and cross-language features only reformat explicit source evidence; missing evidence is omitted rather than generated. Human audio is streamed from official Wikimedia URLs only after a linked recording’s creator and individual license are verified. No autoplay or synthesis. Multiple-etymology/stress ambiguities and unsupported Chinese variety associations are omitted rather than guessed. Audio coverage is uneven; missing attribution and request failures are distinguished. Images remain omitted.

## Privacy and sources

Searches go directly from your browser to Wikimedia and Tatoeba; frequency lists are downloaded from GitHub. Those services receive normal request metadata. The app adds no analytics, account system or central history database. GitHub Pages itself is the hosting provider and has its own logging/privacy policies. History, cache and saved cards stay in localStorage on that browser. See [about.html](about.html) for attribution and setup details.

Wiktionary and Wikipedia text remains under the applicable Creative Commons ShareAlike terms. Tatoeba sentence authors, IDs and reported licenses are linked with displayed examples. FrequencyWords/OpenSubtitles data retains its upstream license. This repository's publication does not relicense third-party content. See [SOURCES.md](SOURCES.md).

## License

The hosted dictionary remains free to use. The repository is public for inspection and feedback, but new original contributions owned by William Beckes after commit `94d2a0b9048576f481400990654d97db39838677` are rights-reserved unless separately licensed. See [LICENSE](LICENSE) for the scope and permitted hosted use; public visibility does not make those additions open source.

The code and original interface already released at that baseline and its ancestors remain under [MIT](LICENSE-MIT-LEGACY), including when retained in later versions. Existing MIT permissions are not revoked. Third-party dictionary text, examples, frequency data and recordings keep their own licenses; see [SOURCES.md](SOURCES.md).
