import fs from "node:fs";
import "dotenv/config";

import { processRecord } from "./core";
import { CURRENT_CHUNK } from "./constants";
import { Data } from "./types";

const main = async () => {
  const data: Data = JSON.parse(
    fs.readFileSync(CURRENT_CHUNK, {
      encoding: "utf-8",
    })
  );

  try {
    await Promise.all(data.map(processRecord));
  } catch (err) {
    console.log(err);
  }
};

console.log(">> starting the script...");
main();
