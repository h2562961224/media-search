export function getRandomElements<T>(arr: T[], count: number): T[] {
  if(count > arr.length) {
    count = arr.length;
  }
  const shuffled = arr.slice(); // 创建数组的副本
  let n = arr.length;
  let min = n - count;
  let temp: T;
  let index: number;

  while (n-- > min) {
      index = Math.floor((n + 1) * Math.random());
      temp = shuffled[index];
      shuffled[index] = shuffled[n];
      shuffled[n] = temp;
  }

  return shuffled.slice(min);
}