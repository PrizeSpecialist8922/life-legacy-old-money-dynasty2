/** Honors label at graduation based on cumulative GPA. */
export function honorsLabel(gpa: number): string {
  if (gpa >= 3.9) return "Summa Cum Laude";
  if (gpa >= 3.75) return "Magna Cum Laude";
  if (gpa >= 3.5) return "Cum Laude";
  return "";
}
