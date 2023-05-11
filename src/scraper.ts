import Airtable from "airtable";
import fs from "node:fs";
import pWaitFor from "p-wait-for";
import "dotenv/config";

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_APP_ID!);

const people = airtable("Data").select({
  view: "Grid view",
});

const data: Array<Object> = [];

const scraper = async () => {
  people.all(async (_err, records) => {
    for (const record of records!) {
      data.push({
        name: record.get("Name") as string,
        email: record.get("Email") as string,
        tiplink: record.get("Tiplink") ? record.get("Tiplink") : " ",
        is_done: false,
      });
    }
  });

  await pWaitFor(() => data.length === 826);

  fs.writeFileSync("data.json", JSON.stringify(data), "utf-8");
};

const splitToChunks = (
  array: Array<{
    name: string;
    email: string;
    tiplink: string;
  }>,
  parts: number
) => {
  let result = [];
  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
};

const split = async () => {
  const data: Array<{
    name: string;
    email: string;
    tiplink: string;
  }> = JSON.parse(fs.readFileSync("data.json", "utf-8"));
  const chunks = splitToChunks([...data], 20);
  chunks.map((chunk, index) => {
    fs.writeFileSync(
      `data/${index + 1}.json`,
      JSON.stringify(chunk, null, 2),
      "utf-8"
    );
  });
};

split();
