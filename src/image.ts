import fs from "node:fs";

import { CURRENT_CHUNK, CURRENT_CHUNK_NUMBER, web3Storage } from "@/constants";
import { Data } from "@/types";
import axios from "axios";
import { File } from "web3.storage";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export const uploadImages = async () => {
  const data: Data = JSON.parse(
    fs.readFileSync(CURRENT_CHUNK, {
      encoding: "utf-8",
    })
  );

  try {
    await Promise.all(
      data.map(async (record) => {
        const index = data.indexOf(record);
        if (record.image_uri.length > 3 && record.metadata_uri.length > 3) {
          console.log(`>> image & metadata already uploaded - ${record.name}`);
          return;
        }
        console.log(`>> uploading image for ${record.name}`);

        const imageBuffer = await fs.promises.readFile(
          `images/${CURRENT_CHUNK_NUMBER}/${index + 1}.png`
        );
        const imageFile = new File([imageBuffer], "poap.png", {
          type: "image/png",
        });

        let imageCID = "";

        if (record.image_uri.length > 3) {
          imageCID = record.image_uri.split("://")[1].split(".")[0];
          console.log(`>> image was already uploaded - ${record.name}`);
        } else {
          imageCID = await web3Storage.put([imageFile]);
          console.log(`>> uploaded the image on ipfs - ${record.name}`);
        }

        data[index].image_uri = `https://${imageCID}.ipfs.w3s.link/poap.png`;

        await fs.promises.writeFile(
          CURRENT_CHUNK,
          JSON.stringify(data, null, 2)
        );

        const metadata = {
          name: "Nas Summit Dubai",
          symbol: "NAS",
          description: "Nas Daily x Dubai",
          image: `https://${imageCID}.ipfs.w3s.link/poap.png`,
          properties: {
            files: [
              {
                uri: `https://${imageCID}.ipfs.w3s.link/poap.png`,
                type: "image/png",
              },
            ],
            category: null,
          },
        };

        const metadataFile = new File(
          [JSON.stringify(metadata)],
          "metadata.json",
          {
            type: "application/json",
          }
        );
        console.log(`>> uploaded the metadata on ipfs - ${record.name}`);
        const metadataCID = await web3Storage.put([metadataFile]);

        data[
          index
        ].metadata_uri = `https://${metadataCID}.ipfs.w3s.link/metadata.json`;

        console.log(`>> updated the metadata uri - ${record.name}`);

        await fs.promises.writeFile(
          CURRENT_CHUNK,
          JSON.stringify(data, null, 2)
        );

        console.log(`>> updated the metadata uri in the file - ${record.name}`);

        await sleep(200);
      })
    );
  } catch (err) {
    console.log(err);
  }
};

const clearFields = async () => {
  const data: Data = JSON.parse(
    fs.readFileSync(CURRENT_CHUNK, {
      encoding: "utf-8",
    })
  );

  try {
    await Promise.all(
      data.map(async (record) => {
        const index = data.indexOf(record);
        if (
          record.image_uri.length > 3 &&
          record.image_uri.split("://")[1].split(".")[0] === "poap"
        ) {
          console.log(`>> clearing image for ${record.name}`);
          data[index].image_uri = " ";
          data[index].metadata_uri = " ";

          await fs.promises.writeFile(
            CURRENT_CHUNK,
            JSON.stringify(data, null, 2)
          );

          console.log(`>> cleared image for ${record.name}`);
        }
      })
    );
  } catch (err) {
    console.log(err);
  }
};

// clearFields();
uploadImages();
// generateImages();
