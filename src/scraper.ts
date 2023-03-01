import Airtable from "airtable";
import fs from "node:fs";
import pWaitFor from "p-wait-for";
import "dotenv/config";

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_APP_ID!);

const people = airtable("People").select({
  view: "Grid view",
});

const data: Array<Object> = [];

const scraper = async () => {
  people.all(async (_err, records) => {
    for (const record of records!) {
      data.push({
        "Full Name": record.get("Full Name") as string,
        Email: record.get("Email") as string,
        TipLink: record.get("TipLink") ? record.get("TipLink") : " ",
      });
    }
  });

  await pWaitFor(() => data.length === 617);

  fs.writeFileSync("data.json", JSON.stringify(data), "utf-8");
};

const splitToChunks = (
  array: Array<{
    "Full Name": string;
    Email: string;
    TipLink: string;
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
    "Full Name": string;
    Email: string;
    TipLink: string;
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
