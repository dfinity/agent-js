/**
 * Parse the expiry from the message
 * @param message an error message
 * @returns diff in milliseconds
 */
export const calculateReplicaTime = (message: string): Date => {
  const [min, max] = message.split('UTC');

  const minsplit = min.trim().split(' ').reverse();

  const minDateString = `${minsplit[1]} ${minsplit[0]} UTC`;

  const maxsplit = max.trim().split(' ').reverse();

  const maxDateString = `${maxsplit[1]} ${maxsplit[0]} UTC`;

  return new Date(minDateString);
};

function midwayBetweenDates(date1: Date, date2: Date) {
  return new Date((date1.getTime() + date2.getTime()) / 2);
}
