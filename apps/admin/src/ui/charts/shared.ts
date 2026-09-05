/** 'YYYY-MM-DD' -> 'M/D' */
export const monthDay = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
};
