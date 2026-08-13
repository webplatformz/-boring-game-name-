const baseUrl = "https://ws-old.parlament.ch/";
const requestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15",
  },
};

const councillors: unknown[] = await fetch(
  baseUrl + "councillors/basicdetails?lang=de&format=json",
  requestInit,
).then((res) => res.json());

console.log(councillors[0]);
