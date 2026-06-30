export function formatDate(date: string | Date) {
 return new Intl.DateTimeFormat("fr-FR").format(new Date(date));
}
