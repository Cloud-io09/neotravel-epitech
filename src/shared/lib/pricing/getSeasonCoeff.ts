export function getSeasonCoeff(date: string) {
 const month = new Date(date).getMonth() + 1;
 if ([11, 1, 2, 8].includes(month)) return -0.07;
 if ([12, 10, 9].includes(month)) return 0;
 if ([3, 4, 7].includes(month)) return 0.1;
 if ([5, 6].includes(month)) return 0.15;
 return 0;
}
