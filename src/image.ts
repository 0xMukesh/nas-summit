import fs from "node:fs";

import { CURRENT_CHUNK, CURRENT_CHUNK_NUMBER } from "@/constants";
import { Data } from "@/types";
import axios from "axios";

export const generateImages = async () => {
  const data: Data = JSON.parse(
    fs.readFileSync(CURRENT_CHUNK, {
      encoding: "utf-8",
    })
  );

  try {
    await Promise.all(
      data.map(async (record) => {
        const index = data.indexOf(record);
        console.log(`>> generating image for ${record.name}`);
        const response = await axios.get(
          `http://localhost:3000/api/image?name=${record.name}`,
          {
            responseType: "stream",
          }
        );
        await fs.promises.writeFile(
          `images/${CURRENT_CHUNK_NUMBER}/${index + 1}.png`,
          response.data
        );
      })
    );
  } catch (err) {
    console.log(err);
  }
};

generateImages();
