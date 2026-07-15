export function parseDateString(raw: any): string | null {
    if (!raw) return null;

    const num = Number(raw);
    if (!isNaN(num) && num > 10000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + num * 86400000);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }

    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) {
        return direct.toISOString();
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = raw.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts;
        const attempt1 = new Date(
            `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`,
        );
        if (!isNaN(attempt1.getTime())) {
            return attempt1.toISOString();
        }
        const attempt2 = new Date(
            `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`,
        );
        if (!isNaN(attempt2.getTime())) {
            return attempt2.toISOString();
        }
    }

    return null;
};