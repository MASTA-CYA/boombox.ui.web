export function getDurationFromSeconds(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	// Function to add a leading zero if the number is less than 10
	const pad = (num: number): string => num.toString().padStart(2, '0');

	if (hours == 0)
		return `${pad(minutes)}:${pad(seconds)}`;
	else
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (error && typeof error === 'object' && 'message' in error) return String(error.message);
	if (typeof error === 'string') return error;
	return String(error);
  }