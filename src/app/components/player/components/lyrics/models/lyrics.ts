// Mirrors the backend's MusicPlayer.LyricsManagement.Models.LyricsSource enum - Newtonsoft serializes it as
// its numeric value (see JsonSerializationHelper.NamingSerializerSettings, same convention as AudioOutput/
// PlaybackMode), so the values here have to stay in the same order as the C# enum.
export enum LyricsSource {
	Embedded,
	Lrclib,
	Sidecar,
	Manual,
	NotFound
}

export interface ILyricsLine {
	// Null = unsynced/plain lyrics - this line has no per-line timing. A Lyrics document is treated as fully
	// unsynced (static display, no highlighting/auto-scroll) when every line has a null timestampMs.
	timestampMs: number | null;
	text: string;
}

export interface ILyrics {
	trackPath: string;
	lines: ILyricsLine[];
	source: LyricsSource;
	fetchedAtUtc: string;
}
