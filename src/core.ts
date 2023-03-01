import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TipLink } from "@tiplink/api";
import { File } from "web3.storage";
import axios from "axios";
import fs from "node:fs";

import {
  web3Storage,
  metaplex,
  payer,
  CURRENT_CHUNK,
  connection,
} from "./constants";
import { Data, Record } from "./types";

const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const processRecord = async (record: Record) => {
  try {
    const name = record["Full Name"];
    console.log(`>> started processing - ${name}`);

    const response = await axios.get(
      `http://localhost:3000/api/image?name=${name}`,
      {
        responseType: "arraybuffer",
      }
    );
    const imageBuffer = (await response.data) as Buffer;
    console.log(`>> fetched the image buffer - ${name} `);

    if (imageBuffer.length === 0) {
      fs.writeFileSync(
        "logs.log",
        `\nrecieved empty image buffer - ${name}\n`,
        "utf-8"
      );
    }
    const imageFile = new File([imageBuffer], "poap.png", {
      type: "image/png",
    });
    console.log(`>> uploaded the image on ipfs - ${name}`);
    const imageCID = await web3Storage.put([imageFile]);

    const metadata = {
      name: "Nas Summit Jakarta",
      symbol: "NAS",
      description: "Nas Daily x Jakarta",
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

    const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", {
      type: "application/json",
    });
    console.log(`>> uploaded the metadata on ipfs - ${name}`);
    const metadataCID = await web3Storage.put([metadataFile]);

    const tiplink = await TipLink.create();
    sleep(300);
    const nft = await metaplex.nfts().create(
      {
        uri: `https://${metadataCID}.ipfs.w3s.link/metadata.json`,
        name: "Nas Summit Jakarta",
        symbol: "NAS",
        sellerFeeBasisPoints: 0,
        tokenOwner: tiplink.keypair.publicKey,
      },
      {
        commitment: "finalized",
      }
    );
    console.log(`>> nft minted - ${name}`);

    const transaction = new Transaction();
    const solTransferInstruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: tiplink.keypair.publicKey,
      lamports: 0.0062 * LAMPORTS_PER_SOL,
    });
    transaction.add(solTransferInstruction);
    sleep(300);
    const solTransferSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer]
    );

    const data: Data = JSON.parse(fs.readFileSync(CURRENT_CHUNK, "utf-8"));

    for (let i = 0; i < data.length; i++) {
      if (data[i]["Full Name"] === name) {
        data[i]["TipLink"] = tiplink.url.href;
        break;
      }
    }

    fs.writeFileSync(CURRENT_CHUNK, JSON.stringify(data, null, 2), "utf-8");

    console.log(`>> updated data - ${name}`);

    console.log("===========================");
    console.log("name:", name);
    console.log("nft mint signature:", nft.response.signature);
    console.log("sol transfer signature:", solTransferSignature);
    console.log("buffer", imageBuffer);
    console.log("image cid:", imageCID);
    console.log("metadata cid:", metadataCID);
    console.log("token address:", nft.mintAddress.toString());
    console.log("tiplink public key:", tiplink.keypair.publicKey.toString());
    console.log("tiplink url:", tiplink.url.href);
    console.log("===========================");
  } catch (err) {
    console.log(`>> an error occured\n${err}`);
  }
};
