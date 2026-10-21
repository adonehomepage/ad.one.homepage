/** Excel formula injection 완화 + CSV 이스케이프 */
export function csvCell(value: string) {
  let cell = value;
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[",\n]/.test(cell)) return `"${cell.replaceAll('"', '""')}"`;
  return cell;
}
